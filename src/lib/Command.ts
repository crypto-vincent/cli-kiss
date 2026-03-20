import { OperationDescriptor } from "./Operation";
import { OptionUsage } from "./Option";
import { PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";
import {
  TypoError,
  TypoString,
  typoStyleQuote,
  typoStyleUserInput,
  TypoText,
} from "./Typo";

export type CommandDescriptor<Context, Result> = {
  getInformation(): CommandInformation;
  createFactory(readerArgs: ReaderArgs): CommandFactory<Context, Result>;
};

export type CommandFactory<Context, Result> = {
  generateUsage(): CommandUsage;
  createInstance(): CommandInstance<Context, Result>;
};

export type CommandInstance<Context, Result> = {
  executeWithContext(context: Context): Promise<Result>;
};

export type CommandInformation = {
  description: string;
  hint?: string;
  details?: Array<string>;
  // TODO - printable examples ?
};

export type CommandUsage = {
  breadcrumbs: Array<CommandUsageBreadcrumb>;
  information: CommandInformation;
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
  information: CommandInformation,
  operation: OperationDescriptor<Context, Result>,
): CommandDescriptor<Context, Result> {
  return {
    getInformation() {
      return information;
    },
    createFactory(readerArgs: ReaderArgs) {
      function generateUsage(): CommandUsage {
        const operationUsage = operation.generateUsage();
        return {
          breadcrumbs: operationUsage.positionals.map((positional) =>
            breadcrumbPositional(positional.label),
          ),
          information: information,
          positionals: operationUsage.positionals,
          subcommands: [],
          options: operationUsage.options,
        };
      }
      try {
        const operationFactory = operation.createFactory(readerArgs);
        const endPositional = readerArgs.consumePositional();
        if (endPositional !== undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`Unexpected argument: `),
              new TypoString(`"${endPositional}"`, typoStyleQuote),
            ),
          );
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
  information: CommandInformation,
  operation: OperationDescriptor<Context, Payload>,
  subcommands: {
    [subcommand: Lowercase<string>]: CommandDescriptor<Payload, Result>;
  },
): CommandDescriptor<Context, Result> {
  return {
    getInformation() {
      return information;
    },
    createFactory(readerArgs: ReaderArgs) {
      try {
        const operationFactory = operation.createFactory(readerArgs);
        const subcommandName = readerArgs.consumePositional();
        if (subcommandName === undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`<SUBCOMMAND>`, typoStyleUserInput),
              new TypoString(`: Is required, but was not provided`),
            ),
          );
        }
        const subcommandInput =
          subcommands[subcommandName as Lowercase<string>];
        if (subcommandInput === undefined) {
          throw new TypoError(
            new TypoText(
              new TypoString(`<SUBCOMMAND>`, typoStyleUserInput),
              new TypoString(`: Invalid value: `),
              new TypoString(`"${subcommandName}"`, typoStyleQuote),
            ),
          );
        }
        const subcommandFactory = subcommandInput.createFactory(readerArgs);
        return {
          generateUsage() {
            const operationUsage = operation.generateUsage();
            const subcommandUsage = subcommandFactory.generateUsage();
            return {
              breadcrumbs: operationUsage.positionals
                .map((positional) => breadcrumbPositional(positional.label))
                .concat([breadcrumbCommand(subcommandName)])
                .concat(subcommandUsage.breadcrumbs),
              information: subcommandUsage.information,
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
              breadcrumbs: operationUsage.positionals
                .map((positional) => breadcrumbPositional(positional.label))
                .concat([breadcrumbPositional("<SUBCOMMAND>")]),
              information: information,
              positionals: operationUsage.positionals,
              subcommands: Object.entries(subcommands).map((subcommand) => {
                const metadata = subcommand[1].getInformation();
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
  information: CommandInformation,
  operation: OperationDescriptor<Context, Payload>,
  nextCommand: CommandDescriptor<Payload, Result>,
): CommandDescriptor<Context, Result> {
  return {
    getInformation() {
      return information;
    },
    createFactory(readerArgs: ReaderArgs) {
      try {
        const operationFactory = operation.createFactory(readerArgs);
        const nextCommandFactory = nextCommand.createFactory(readerArgs);
        return {
          generateUsage() {
            const operationUsage = operation.generateUsage();
            const nextCommandUsage = nextCommandFactory.generateUsage();
            return {
              breadcrumbs: operationUsage.positionals
                .map((positional) => breadcrumbPositional(positional.label))
                .concat(nextCommandUsage.breadcrumbs),
              information: nextCommandUsage.information,
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
      } catch (error) {
        return {
          generateUsage() {
            const operationUsage = operation.generateUsage();
            return {
              breadcrumbs: operationUsage.positionals
                .map((positional) => breadcrumbPositional(positional.label))
                .concat([breadcrumbPositional("[REST]...")]),
              information: information,
              positionals: operationUsage.positionals,
              subcommands: [],
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

function breadcrumbPositional(value: string): CommandUsageBreadcrumb {
  return { positional: value };
}

function breadcrumbCommand(value: string): CommandUsageBreadcrumb {
  return { command: value };
}
