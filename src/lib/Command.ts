import { Execution } from "./Execution";
import { OptionUsage } from "./Option";
import { ParameterUsage } from "./Parameter";
import { ReaderArgs } from "./Reader";

export type Command<Context, Result> = {
  getDescription(): string | undefined;
  createRunnerFromArgs(readerArgs: ReaderArgs): CommandRunner<Context, Result>;
};

export type CommandRunner<Context, Result> = {
  generateUsage(): CommandUsage;
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
  parameters: Array<ParameterUsage>;
  subcommands: Array<{ name: string; description: string | undefined }>;
};

export type CommandUsageBreadcrumb =
  | { parameter: string }
  | { command: string };

export function command<Context, Result>(
  metadata: CommandMetadata,
  execution: Execution<Context, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      function generateUsage(): CommandUsage {
        const executionUsage = execution.generateUsage();
        return {
          metadata,
          breadcrumbs: executionUsage.parameters.map((parameter) =>
            breadcrumbParameter(parameter.label),
          ),
          options: executionUsage.options,
          parameters: executionUsage.parameters,
          subcommands: [],
        };
      }
      try {
        const executionRunner = execution.createRunnerFromArgs(readerArgs);
        const lastPositional = readerArgs.consumePositional();
        if (lastPositional !== undefined) {
          throw Error(`Unexpected parameter: "${lastPositional}"`);
        }
        return {
          generateUsage,
          async executeWithContext(context: Context) {
            return executionRunner.executeWithContext(context);
          },
        };
      } catch (error) {
        return {
          generateUsage,
          async executeWithContext() {
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
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      try {
        const executionRunner = execution.createRunnerFromArgs(readerArgs);
        const subcommandName = readerArgs.consumePositional();
        if (subcommandName === undefined) {
          throw new Error("Missing required parameter: SUBCOMMAND");
        }
        const subcommandInput =
          subcommands[subcommandName as Lowercase<string>];
        if (subcommandInput === undefined) {
          throw new Error(`Invalid SUBCOMMAND: "${subcommandName}"`);
        }
        const subcommandRunner =
          subcommandInput.createRunnerFromArgs(readerArgs);
        return {
          generateUsage() {
            const executionUsage = execution.generateUsage();
            const subcommandUsage = subcommandRunner.generateUsage();
            return {
              metadata: subcommandUsage.metadata,
              breadcrumbs: executionUsage.parameters
                .map((parameter) => breadcrumbParameter(parameter.label))
                .concat([breadcrumbCommand(subcommandName)])
                .concat(subcommandUsage.breadcrumbs),
              options: executionUsage.options.concat(subcommandUsage.options),
              parameters: executionUsage.parameters.concat(
                subcommandUsage.parameters,
              ),
              subcommands: subcommandUsage.subcommands,
            };
          },
          async executeWithContext(context: Context) {
            return await subcommandRunner.executeWithContext(
              await executionRunner.executeWithContext(context),
            );
          },
        };
      } catch (error) {
        return {
          generateUsage() {
            const executionUsage = execution.generateUsage();
            return {
              metadata,
              breadcrumbs: executionUsage.parameters
                .map((parameter) => breadcrumbParameter(parameter.label))
                .concat([breadcrumbCommand("<SUBCOMMAND>")]),
              options: executionUsage.options,
              parameters: executionUsage.parameters,
              subcommands: Object.entries(subcommands).map(
                ([name, subcommand]) => ({
                  name,
                  description: subcommand.getDescription(),
                }),
              ),
            };
          },
          async executeWithContext() {
            throw error;
          },
        };
      }
    },
  };
}

export function commandChained<Context, Payload, Result>(
  metadata: CommandMetadata,
  execution: Execution<Context, Payload>,
  nextCommand: Command<Payload, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      const executionRunner = execution.createRunnerFromArgs(readerArgs);
      const nextCommandRunner = nextCommand.createRunnerFromArgs(readerArgs);
      return {
        generateUsage() {
          const executionUsage = execution.generateUsage();
          const nextCommandUsage = nextCommandRunner.generateUsage();
          return {
            metadata: nextCommandUsage.metadata,
            breadcrumbs: executionUsage.parameters
              .map((parameter) => breadcrumbParameter(parameter.label))
              .concat(nextCommandUsage.breadcrumbs),
            options: executionUsage.options.concat(nextCommandUsage.options),
            parameters: executionUsage.parameters.concat(
              nextCommandUsage.parameters,
            ),
            subcommands: nextCommandUsage.subcommands,
          };
        },
        async executeWithContext(context: Context) {
          return await nextCommandRunner.executeWithContext(
            await executionRunner.executeWithContext(context),
          );
        },
      };
    },
  };
}

function breadcrumbParameter(value: string): CommandUsageBreadcrumb {
  return { parameter: value };
}

function breadcrumbCommand(value: string): CommandUsageBreadcrumb {
  return { command: value };
}
