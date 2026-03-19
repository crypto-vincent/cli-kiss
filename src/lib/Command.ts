import { Operation } from "./Operation";
import { OptionUsage } from "./Option";
import { PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";
import { TypoError, TypoString, typoStyleConstants, TypoText } from "./Typo";

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
  positionals: Array<PositionalUsage>;
  subcommands: Array<CommandUsageSubcommand>;
  options: Array<OptionUsage>;
};

export type CommandUsageBreadcrumb =
  | { positional: string }
  | { command: string };

export type CommandUsageSubcommand = {
  name: string;
  description: string | undefined;
};

export function command<Context, Result>(
  metadata: CommandMetadata,
  operation: Operation<Context, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      function generateUsage(): CommandUsage {
        const operationUsage = operation.generateUsage();
        return {
          metadata,
          breadcrumbs: operationUsage.positionals.map((positional) =>
            breadcrumbPositional(positional.label),
          ),
          positionals: operationUsage.positionals,
          subcommands: [],
          options: operationUsage.options,
        };
      }
      try {
        const operationRunner = operation.createRunnerFromArgs(readerArgs);
        const lastPositional = readerArgs.consumePositional();
        if (lastPositional !== undefined) {
          throw Error(`Unexpected positional: "${lastPositional}"`);
        }
        return {
          generateUsage,
          async executeWithContext(context: Context) {
            return operationRunner.executeWithContext(context);
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
  operation: Operation<Context, Payload>,
  subcommands: { [subcommand: Lowercase<string>]: Command<Payload, Result> },
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      try {
        const operationRunner = operation.createRunnerFromArgs(readerArgs);
        const subcommandName = readerArgs.consumePositional();
        if (subcommandName === undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`Missing required argument `),
              new TypoString(`SUBCOMMAND`, typoStyleConstants),
            ),
          );
        }
        const subcommandInput =
          subcommands[subcommandName as Lowercase<string>];
        if (subcommandInput === undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`Invalid value for `),
              new TypoString(`SUBCOMMAND`, typoStyleConstants),
              new TypoString(`: "${subcommandName}"`),
            ),
          );
        }
        const subcommandRunner =
          subcommandInput.createRunnerFromArgs(readerArgs);
        return {
          generateUsage() {
            const operationUsage = operation.generateUsage();
            const subcommandUsage = subcommandRunner.generateUsage();
            return {
              metadata: subcommandUsage.metadata,
              breadcrumbs: operationUsage.positionals
                .map((positional) => breadcrumbPositional(positional.label))
                .concat([breadcrumbCommand(subcommandName)])
                .concat(subcommandUsage.breadcrumbs),
              positionals: operationUsage.positionals.concat(
                subcommandUsage.positionals,
              ),
              subcommands: subcommandUsage.subcommands,
              options: operationUsage.options.concat(subcommandUsage.options),
            };
          },
          async executeWithContext(context: Context) {
            return await subcommandRunner.executeWithContext(
              await operationRunner.executeWithContext(context),
            );
          },
        };
      } catch (error) {
        return {
          generateUsage() {
            const operationUsage = operation.generateUsage();
            return {
              metadata,
              breadcrumbs: operationUsage.positionals
                .map((positional) => breadcrumbPositional(positional.label))
                .concat([breadcrumbCommand("<SUBCOMMAND>")]),
              positionals: operationUsage.positionals,
              subcommands: Object.entries(subcommands).map(
                ([name, subcommand]) => ({
                  name,
                  description: subcommand.getDescription(),
                }),
              ),
              options: operationUsage.options,
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
  operation: Operation<Context, Payload>,
  nextCommand: Command<Payload, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return metadata.description;
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      const operationRunner = operation.createRunnerFromArgs(readerArgs);
      const nextCommandRunner = nextCommand.createRunnerFromArgs(readerArgs);
      return {
        generateUsage() {
          const operationUsage = operation.generateUsage();
          const nextCommandUsage = nextCommandRunner.generateUsage();
          return {
            metadata: nextCommandUsage.metadata,
            breadcrumbs: operationUsage.positionals
              .map((positional) => breadcrumbPositional(positional.label))
              .concat(nextCommandUsage.breadcrumbs),
            positionals: operationUsage.positionals.concat(
              nextCommandUsage.positionals,
            ),
            subcommands: nextCommandUsage.subcommands,
            options: operationUsage.options.concat(nextCommandUsage.options),
          };
        },
        async executeWithContext(context: Context) {
          return await nextCommandRunner.executeWithContext(
            await operationRunner.executeWithContext(context),
          );
        },
      };
    },
  };
}

function breadcrumbPositional(value: string): CommandUsageBreadcrumb {
  return { positional: value };
}

function breadcrumbCommand(value: string): CommandUsageBreadcrumb {
  return { command: value };
}
