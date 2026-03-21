import { Operation } from "./Operation";
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

/**
 * A CLI command — parses arguments and executes within a given context.
 * Created with {@link command}, {@link commandWithSubcommands}, or {@link commandChained};
 * passed to {@link runAndExit} to run.
 *
 * @typeParam Context - Injected at execution time; flows from {@link runAndExit} down the chain.
 * @typeParam Result - Value produced on execution; typically `void` for roots.
 */
export type Command<Context, Result> = {
  /**
   * Returns the command's static metadata.
   */
  getInformation(): CommandInformation;
  /**
   * Parses `readerArgs` and returns a {@link CommandFactory}.
   * Errors are deferred — never thrown here; they surface in {@link CommandFactory.createInstance}.
   */
  createFactory(readerArgs: ReaderArgs): CommandFactory<Context, Result>;
};

/**
 * Produced by {@link Command.createFactory}. Provides usage generation (always safe)
 * and instance creation (throws on parse error).
 *
 * @typeParam Context - See {@link Command}.
 * @typeParam Result - See {@link Command}.
 */
export type CommandFactory<Context, Result> = {
  /**
   * Builds the {@link CommandUsage} for the current command path.
   * Used for `--help` and `usageOnError`.
   */
  generateUsage(): CommandUsage;
  /**
   * Creates a ready-to-execute {@link CommandInstance}.
   *
   * @throws {@link TypoError} if parsing failed during {@link Command.createFactory}.
   */
  createInstance(): CommandInstance<Context, Result>;
};

/**
 * A fully parsed, ready-to-execute command.
 *
 * @typeParam Context - Caller-supplied context.
 * @typeParam Result - Value produced on success.
 */
export type CommandInstance<Context, Result> = {
  /**
   * Executes the command with the provided context.
   *
   * @param context - Caller context (see {@link runAndExit}).
   * @returns Promise resolving to the command's result.
   */
  executeWithContext(context: Context): Promise<Result>;
};

/**
 * Static metadata for a command, shown in `--help` output via {@link usageToStyledLines}.
 */
export type CommandInformation = {
  /**
   * Short description shown in the usage header.
   */
  description: string;
  /**
   * Short note shown in parentheses (e.g. `"deprecated"`, `"experimental"`).
   */
  hint?: string;
  /**
   * Extra lines printed below the description.
   */
  details?: Array<string>;
  // TODO - printable examples ?
};

/**
 * Full usage/help model produced by {@link CommandFactory.generateUsage},
 * consumed by {@link usageToStyledLines}.
 */
export type CommandUsage = {
  /**
   * Breadcrumb segments forming the usage line
   * (e.g. `my-cli <POSITIONAL> subcommand <ANOTHER_POSITIONAL>`).
   */
  breadcrumbs: Array<CommandUsageBreadcrumb>;
  /**
   * Command's static metadata.
   */
  information: CommandInformation;
  /**
   * Positionals in declaration order.
   */
  positionals: Array<PositionalUsage>;
  /**
   * Available subcommands; non-empty when subcommand selection failed or on `--help`.
   */
  subcommands: Array<CommandUsageSubcommand>;
  /**
   * Options in registration order.
   */
  options: Array<OptionUsage>;
};

/**
 * One element in the usage breadcrumb trail.
 * `{ positional }` — placeholder like `<NAME>`; `{ command }` — literal token like `deploy`.
 */
export type CommandUsageBreadcrumb =
  | { positional: string }
  | { command: string };

/**
 * Subcommand entry shown in the `Subcommands:` section of the usage output.
 */
export type CommandUsageSubcommand = {
  /**
   * Literal token the user types (e.g. `"deploy"`).
   */
  name: string;
  /**
   * Short description from the subcommand's {@link CommandInformation}.
   */
  description: string | undefined;
  /**
   * Hint from the subcommand's {@link CommandInformation}.
   */
  hint: string | undefined;
};

/**
 * Creates a leaf command that directly executes an {@link Operation}.
 * Any unexpected trailing positional causes a {@link TypoError} (deferred to {@link CommandFactory.createInstance}).
 *
 * @typeParam Context - Context forwarded to the handler.
 * @typeParam Result - Value returned by the handler.
 *
 * @param information - Command metadata.
 * @param operation - Defines options, positionals, and the handler.
 * @returns A {@link Command}.
 *
 * @example
 * ```ts
 * const greet = command(
 *   { description: "Greet a user" },
 *   operation(
 *     { options: {}, positionals: [positionalRequired({ type: typeString, label: "NAME" })] },
 *     async (_ctx, { positionals: [name] }) => console.log(`Hello, ${name}!`),
 *   ),
 * );
 * ```
 */
export function command<Context, Result>(
  information: CommandInformation,
  operation: Operation<Context, Result>,
): Command<Context, Result> {
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

/**
 * Creates a command that runs an {@link Operation} to produce a `Payload`, then
 * dispatches to a named subcommand based on the next positional token.
 * A missing or unrecognised subcommand defers a {@link TypoError} to {@link CommandFactory.createInstance}.
 *
 * @typeParam Context - Context accepted by `operation`.
 * @typeParam Payload - Output of `operation`; becomes the subcommand's context.
 * @typeParam Result - Value produced by the selected subcommand.
 *
 * @param information - Metadata shown when no valid subcommand was selected.
 * @param operation - Always runs first; its output becomes the subcommand's context.
 * @param subcommands - Map of subcommand names to their {@link Command}s.
 * @returns A {@link Command} that dispatches to one of the provided subcommands.
 *
 * @example
 * ```ts
 * const rootCmd = commandWithSubcommands(
 *   { description: "My CLI" },
 *   operation({ options: {}, positionals: [] }, async (ctx) => ctx),
 *   {
 *     deploy: command({ description: "Deploy" }, deployOperation),
 *     rollback: command({ description: "Rollback" }, rollbackOperation),
 *   },
 * );
 * ```
 */
export function commandWithSubcommands<Context, Payload, Result>(
  information: CommandInformation,
  operation: Operation<Context, Payload>,
  subcommands: { [subcommand: Lowercase<string>]: Command<Payload, Result> },
): Command<Context, Result> {
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

/**
 * Chains an {@link Operation} and a {@link Command}: `operation` runs first, its
 * output becomes `nextCommand`'s context. No token is consumed for routing.
 * Both stages' usage is merged; `nextCommand`'s `information` takes precedence.
 *
 * @typeParam Context - Context accepted by `operation`.
 * @typeParam Payload - Output of `operation`; becomes `nextCommand`'s context.
 * @typeParam Result - Value produced by `nextCommand`.
 *
 * @param information - Fallback metadata used on parse error.
 * @param operation - First stage; its output is passed as `nextCommand`'s context.
 * @param nextCommand - Second stage, executed after `operation`.
 * @returns A {@link Command} transparently composing the two stages.
 *
 * @example
 * ```ts
 * const authenticatedDeploy = commandChained(
 *   { description: "Authenticate then deploy" },
 *   operation(
 *     { options: { token: optionSingleValue({ long: "token", type: typeString, default: () => "" }) }, positionals: [] },
 *     async (_ctx, { options: { token } }) => ({ token }),
 *   ),
 *   command({ description: "Deploy" }, deployOperation),
 * );
 * ```
 */
export function commandChained<Context, Payload, Result>(
  information: CommandInformation,
  operation: Operation<Context, Payload>,
  nextCommand: Command<Payload, Result>,
): Command<Context, Result> {
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
