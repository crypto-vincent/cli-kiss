import { ArgumentUsage } from "./Argument";
import { Execution } from "./Execution";
import { OptionUsage } from "./Option";
import { ReaderArgs } from "./Reader";

export type Command<Context, Result> = {
  getDescription(): string | undefined;
  createInterpreterFactory(
    readerArgs: ReaderArgs,
  ): CommandInterpreterFactory<Context, Result>;
};

export type CommandInterpreterFactory<Context, Result> = {
  generateUsage(): CommandUsage;
  createInterpreterInstance(): CommandInterpreterInstance<Context, Result>;
};

export type CommandInterpreterInstance<Context, Result> = {
  executeWithContext(context: Context): Promise<Result>;
};

export type CommandMetadata = {
  description: string;
  details?: string;
  // TODO - printable examples ?
};

export type CommandUsage = {
  metadata: CommandMetadata;
  breadcrumbs: Array<CommandUsageBreadcrumb>;
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
  subcommands: Array<{ name: string; description: string | undefined }>;
};

export type CommandUsageBreadcrumb = { argument: string } | { command: string };

export function command<Context, Result>(
  metadata: CommandMetadata,
  execution: Execution<Context, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createInterpreterFactory(readerArgs: ReaderArgs) {
      function generateUsage(): CommandUsage {
        const executionUsage = execution.generateUsage();
        return {
          metadata,
          breadcrumbs: executionUsage.arguments.map((argument) =>
            breadcrumbArgument(argument.label),
          ),
          options: executionUsage.options,
          arguments: executionUsage.arguments,
          subcommands: [],
        };
      }
      try {
        const executionInterpreterFactory =
          execution.createInterpreterFactory(readerArgs);
        return {
          generateUsage,
          createInterpreterInstance() {
            const lastPositional = readerArgs.consumePositional();
            if (lastPositional !== undefined) {
              throw Error(`Unexpected argument: "${lastPositional}"`);
            }
            const executionInterpreterInstance =
              executionInterpreterFactory.createInterpreterInstance();
            return {
              async executeWithContext(context: Context) {
                return executionInterpreterInstance.executeWithContext(context);
              },
            };
          },
        };
      } catch (error) {
        return {
          generateUsage,
          createInterpreterInstance() {
            throw error;
          },
        };
      }
    },
  };
}

export function commandWithSubcommands<Context, Payload, Result>(
  metadata: CommandMetadata,
  execution: Execution<Context, Payload>,
  subcommands: { [subcommand: Lowercase<string>]: Command<Payload, Result> },
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createInterpreterFactory(readerArgs: ReaderArgs) {
      try {
        const executionInterpreterFactory =
          execution.createInterpreterFactory(readerArgs);
        const subcommandName = readerArgs.consumePositional();
        if (subcommandName === undefined) {
          throw new Error("Missing required argument: SUBCOMMAND");
        }
        const subcommandInput =
          subcommands[subcommandName as Lowercase<string>];
        if (subcommandInput === undefined) {
          throw new Error(`Invalid SUBCOMMAND: "${subcommandName}"`);
        }
        const subcommandInterpreterFactory =
          subcommandInput.createInterpreterFactory(readerArgs);
        return {
          generateUsage() {
            const executionUsage = execution.generateUsage();
            const subcommandUsage =
              subcommandInterpreterFactory.generateUsage();
            return {
              metadata: subcommandUsage.metadata,
              breadcrumbs: executionUsage.arguments
                .map((argument) => breadcrumbArgument(argument.label))
                .concat([breadcrumbCommand(subcommandName)])
                .concat(subcommandUsage.breadcrumbs),
              options: executionUsage.options.concat(subcommandUsage.options),
              arguments: executionUsage.arguments.concat(
                subcommandUsage.arguments,
              ),
              subcommands: subcommandUsage.subcommands,
            };
          },
          createInterpreterInstance() {
            // TODO - unit tests to enforce ordering here
            const subcommandInterpreterInstance =
              subcommandInterpreterFactory.createInterpreterInstance();
            const executionInterpreterInstance =
              executionInterpreterFactory.createInterpreterInstance();
            return {
              async executeWithContext(context: Context) {
                const payload =
                  await executionInterpreterInstance.executeWithContext(
                    context,
                  );
                return await subcommandInterpreterInstance.executeWithContext(
                  payload,
                );
              },
            };
          },
        };
      } catch (error) {
        return {
          generateUsage() {
            const executionUsage = execution.generateUsage();
            return {
              metadata,
              breadcrumbs: executionUsage.arguments
                .map((argument) => breadcrumbArgument(argument.label))
                .concat([breadcrumbCommand("<SUBCOMMAND>")]),
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
          createInterpreterInstance() {
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
