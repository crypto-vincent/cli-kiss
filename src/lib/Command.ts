import { Operation } from "./Operation";
import { OptionUsage } from "./Option";
import { PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";
import { TypoError, TypoString, typoStyleConstants, TypoText } from "./Typo";

export type Command<Context, Result> = {
  getMetadata(): CommandMetadata;
  createFactory(readerArgs: ReaderArgs): CommandFactory<Context, Result>;
};

export type CommandFactory<Context, Result> = {
  generateUsage(): CommandUsage;
  createInstance(): CommandInstance<Context, Result>;
};

export type CommandInstance<Context, Result> = {
  executeWithContext(context: Context): Promise<Result>;
};

export type CommandMetadata = {
  description: string;
  hint?: string;
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
  hint: string | undefined;
};

export function command<Context, Result>(
  metadata: CommandMetadata,
  operation: Operation<Context, Result>,
): Command<Context, Result> {
  return {
    getMetadata() {
      return metadata;
    },
    createFactory(readerArgs: ReaderArgs) {
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
        const operationFactory = operation.createFactory(readerArgs);
        const endPositional = readerArgs.consumePositional();
        if (endPositional !== undefined) {
          throw Error(`Unexpected argument: "${endPositional}"`);
        }
        return {
          generateUsage,
          createInstance() {
            const operationInstance = operationFactory.createInstance();
            return {
              async executeWithContext(context: Context) {
                return await operationInstance.executeWithContext(context);
              },
            };
          },
        };
      } catch (error) {
        return {
          generateUsage,
          createInstance() {
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
    getMetadata() {
      return metadata;
    },
    createFactory(readerArgs: ReaderArgs) {
      try {
        const operationFactory = operation.createFactory(readerArgs);
        const subcommandName = readerArgs.consumePositional();
        if (subcommandName === undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`<SUBCOMMAND>`, typoStyleConstants),
              new TypoString(`: Is required, but was not provided`),
            ),
          );
        }
        const subcommandInput =
          subcommands[subcommandName as Lowercase<string>];
        if (subcommandInput === undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`<SUBCOMMAND>`, typoStyleConstants),
              new TypoString(`: Invalid value: "${subcommandName}"`),
            ),
          );
        }
        const subcommandFactory = subcommandInput.createFactory(readerArgs);
        return {
          generateUsage() {
            const operationUsage = operation.generateUsage();
            const subcommandUsage = subcommandFactory.generateUsage();
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
          createInstance() {
            const operationInstance = operationFactory.createInstance();
            const subcommandInstance = subcommandFactory.createInstance();
            return {
              async executeWithContext(context: Context) {
                return await subcommandInstance.executeWithContext(
                  await operationInstance.executeWithContext(context),
                );
              },
            };
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
              subcommands: Object.entries(subcommands).map((subcommand) => {
                const metadata = subcommand[1].getMetadata();
                return {
                  name: subcommand[0],
                  description: metadata.description,
                  hint: metadata.hint,
                };
              }),
              options: operationUsage.options,
            };
          },
          createInstance() {
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
    getMetadata() {
      return metadata;
    },
    createFactory(readerArgs: ReaderArgs) {
      const operationFactory = operation.createFactory(readerArgs);
      const nextCommandFactory = nextCommand.createFactory(readerArgs);
      return {
        generateUsage() {
          const operationUsage = operation.generateUsage();
          const nextCommandUsage = nextCommandFactory.generateUsage();
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
        createInstance() {
          const operationInstance = operationFactory.createInstance();
          const nextCommandInstance = nextCommandFactory.createInstance();
          return {
            async executeWithContext(context: Context) {
              return await nextCommandInstance.executeWithContext(
                await operationInstance.executeWithContext(context),
              );
            },
          };
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
