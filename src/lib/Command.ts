import { ArgumentUsage } from "./Argument";
import { Execution } from "./Execution";
import { OptionUsage } from "./Option";
import { ReaderTokenizer } from "./Reader";

export type Command<Context, Result> = {
  getDescription(): string | undefined;
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
  description: string;
  details: Array<string> | undefined;
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
  subcommands: Array<{ name: string; description: string | undefined }>;
};

export type CommandUsageBreadcrumb = { argument: string } | { command: string };

export function command<Context, Result>(
  metadata: {
    description: string;
    details?: Array<string>;
  },
  execution: Execution<Context, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    prepareRunner(readerTokenizer: ReaderTokenizer) {
      function computeUsage(): CommandUsage {
        const executionUsage = execution.computeUsage();
        return {
          breadcrumbs: executionUsage.arguments.map((argument) =>
            breadcrumbArgument(argument.label),
          ),
          description: metadata.description,
          details: metadata.details,
          options: executionUsage.options,
          arguments: executionUsage.arguments,
          subcommands: [],
        };
      }
      try {
        const executionResolver = execution.prepareResolver(readerTokenizer);
        const lastPositional = readerTokenizer.consumePositional();
        if (lastPositional !== undefined) {
          throw Error(`Unprocessed positional: ${lastPositional}`);
        }
        const executionCallback = executionResolver();
        return {
          computeUsage,
          async execute(context: Context) {
            return await executionCallback(context);
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
    description: string;
    details?: Array<string>;
  },
  execution: Execution<Context, Payload>,
  subcommands: { [subcommand: Lowercase<string>]: Command<Payload, Result> },
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    prepareRunner(readerTokenizer: ReaderTokenizer) {
      try {
        const executionResolver = execution.prepareResolver(readerTokenizer);
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
        const executionCallback = executionResolver();
        return {
          computeUsage() {
            const executionUsage = execution.computeUsage();
            const subcommandUsage = subcommandRunner.computeUsage();
            return {
              breadcrumbs: executionUsage.arguments
                .map((argument) => breadcrumbArgument(argument.label))
                .concat([breadcrumbCommand(subcommandName)])
                .concat(subcommandUsage.breadcrumbs),
              description: subcommandUsage.description,
              details: subcommandUsage.details,
              options: executionUsage.options.concat(subcommandUsage.options),
              arguments: executionUsage.arguments.concat(
                subcommandUsage.arguments,
              ),
              subcommands: subcommandUsage.subcommands,
            };
          },
          async execute(context: Context) {
            const payload = await executionCallback(context);
            return await subcommandRunner.execute(payload);
          },
        };
      } catch (error) {
        return {
          computeUsage() {
            const executionUsage = execution.computeUsage();
            return {
              breadcrumbs: executionUsage.arguments
                .map((argument) => breadcrumbArgument(argument.label))
                .concat([breadcrumbCommand("<SUBCOMMAND>")]),
              description: metadata.description,
              details: metadata.details,
              options: executionUsage.options,
              arguments: executionUsage.arguments,
              subcommands: Object.entries(subcommands).map(
                ([name, subcommand]) => ({
                  name,
                  description: subcommand.getDescription(),
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

function breadcrumbArgument(value: string): CommandUsageBreadcrumb {
  return { argument: value };
}

function breadcrumbCommand(value: string): CommandUsageBreadcrumb {
  return { command: value };
}
