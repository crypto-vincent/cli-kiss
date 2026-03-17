import { ArgumentUsage } from "./Argument";
import { OptionUsage } from "./Option";
import { Process } from "./Process";
import { ReaderTokenizer } from "./Reader";

export type Command<Context, Result> = {
  getTitle(): string | undefined;
  prepareRunner(
    readerTokenizer: ReaderTokenizer,
  ): CommandRunner<Context, Result>;
};

export type CommandRunner<Context, Result> = {
  computeUsage(): CommandUsage;
  execute(context: Context): Promise<Result>;
};

export type CommandUsage = {
  breadcrumbs: Array<CommandUsageBreadcrumb>;
  title: string;
  description: Array<string> | undefined;
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
  subcommands: Array<{ name: string; title: string | undefined }>;
};

export type CommandUsageBreadcrumb = {
  kind: "command" | "argument";
  value: string;
};

export function command<Context, Result>(
  metadata: {
    title: string;
    description?: Array<string>;
  },
  process: Process<Context, Result>,
): Command<Context, Result> {
  return {
    getTitle() {
      return metadata.title;
    },
    prepareRunner(readerTokenizer: ReaderTokenizer) {
      function computeUsage(): CommandUsage {
        const processUsage = process.computeUsage();
        return {
          breadcrumbs: processUsage.arguments.map((argument) =>
            breadcrumbArgument(argument.label),
          ),
          title: metadata.title,
          description: metadata.description,
          options: processUsage.options,
          arguments: processUsage.arguments,
          subcommands: [],
        };
      }
      try {
        const processResolver = process.prepareResolver(readerTokenizer);
        const lastPositional = readerTokenizer.consumePositional();
        if (lastPositional !== undefined) {
          throw Error(`Unprocessed positional: ${lastPositional}`);
        }
        const processRunner = processResolver();
        return {
          computeUsage,
          async execute(context: Context) {
            return await processRunner.execute(context);
          },
        };
      } catch (error) {
        return {
          computeUsage,
          async execute(_context: Context) {
            throw error;
          },
        };
      }
    },
  };
}

export function commandWithSubcommands<Context, Payload, Result>(
  metadata: {
    title: string;
    description?: Array<string>;
  },
  process: Process<Context, Payload>,
  subcommands: { [subcommand: Lowercase<string>]: Command<Payload, Result> },
): Command<Context, Result> {
  return {
    getTitle() {
      return metadata.title;
    },
    prepareRunner(readerTokenizer: ReaderTokenizer) {
      try {
        const processResolver = process.prepareResolver(readerTokenizer);
        const subcommandName = readerTokenizer.consumePositional();
        if (subcommandName === undefined) {
          throw new Error("Expected a subcommand");
        }
        const subcommandInput =
          subcommands[subcommandName as Lowercase<string>];
        if (subcommandInput === undefined) {
          throw new Error(`Unknown subcommand: ${subcommandName}`);
        }
        const subcommandRunner = subcommandInput.prepareRunner(readerTokenizer);
        const processRunner = processResolver();
        return {
          computeUsage() {
            const processUsage = process.computeUsage();
            const subcommandUsage = subcommandRunner.computeUsage();
            return {
              breadcrumbs: processUsage.arguments
                .map((argument) => breadcrumbArgument(argument.label))
                .concat([breadcrumbCommand(subcommandName)])
                .concat(subcommandUsage.breadcrumbs),
              title: subcommandUsage.title,
              description: subcommandUsage.description,
              options: processUsage.options.concat(subcommandUsage.options),
              arguments: processUsage.arguments.concat(
                subcommandUsage.arguments,
              ),
              subcommands: subcommandUsage.subcommands,
            };
          },
          async execute(context: Context) {
            const payload = await processRunner.execute(context);
            return await subcommandRunner.execute(payload);
          },
        };
      } catch (error) {
        return {
          computeUsage() {
            const processUsage = process.computeUsage();
            return {
              breadcrumbs: processUsage.arguments
                .map((argument) => breadcrumbArgument(argument.label))
                .concat([breadcrumbCommand("<SUBCOMMAND>")]),
              title: metadata.title,
              description: metadata.description,
              options: processUsage.options,
              arguments: processUsage.arguments,
              subcommands: Object.entries(subcommands).map(
                ([name, subcommand]) => ({
                  name,
                  title: subcommand.getTitle(),
                }),
              ),
            };
          },
          async execute(_context: Context) {
            throw error;
          },
        };
      }
    },
  };
}

function breadcrumbArgument(label: string): CommandUsageBreadcrumb {
  return { kind: "argument", value: label };
}

function breadcrumbCommand(name: string): CommandUsageBreadcrumb {
  return { kind: "command", value: name };
}
