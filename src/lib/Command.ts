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

/**
 * Describes a CLI command: how to parse its arguments from raw CLI input and how to
 * execute it within a given context.
 *
 * A `CommandDescriptor` is the central building block of a `cli-kiss` CLI. You create
 * one with {@link command}, {@link commandWithSubcommands}, or {@link commandChained},
 * and pass it to {@link runAndExit} to run your CLI.
 *
 * @typeParam Context - The value passed into the command when it is executed. It flows
 *   from {@link runAndExit}'s `context` argument down through the command chain.
 * @typeParam Result - The value produced by executing the command. For root commands
 *   passed to {@link runAndExit} this is always `void`.
 */
export type CommandDescriptor<Context, Result> = {
  /** Returns the static metadata (description, hint, details) for this command. */
  getInformation(): CommandInformation;
  /**
   * Parses `readerArgs` and returns a {@link CommandFactory} that can generate usage
   * information or create a ready-to-run {@link CommandInstance}.
   *
   * Parsing errors are captured and deferred: `createFactory` never throws; instead
   * the error surfaces when {@link CommandFactory.createInstance} is called on the
   * returned factory.
   */
  createFactory(readerArgs: ReaderArgs): CommandFactory<Context, Result>;
};

/**
 * Produced by {@link CommandDescriptor.createFactory} after the raw CLI arguments have
 * been parsed. Provides two capabilities:
 *
 * 1. **Usage generation** — always available, even when parsing failed.
 * 2. **Instance creation** — throws a {@link TypoError} if parsing failed.
 *
 * @typeParam Context - Forwarded from the parent {@link CommandDescriptor}.
 * @typeParam Result - Forwarded from the parent {@link CommandDescriptor}.
 */
export type CommandFactory<Context, Result> = {
  /**
   * Builds the complete {@link CommandUsage} for the currently parsed command path.
   * This is called to render the `--help` output and on error when `usageOnError`
   * is enabled.
   */
  generateUsage(): CommandUsage;
  /**
   * Creates a {@link CommandInstance} that is ready to execute.
   *
   * @throws {@link TypoError} if the argument parsing that occurred during
   *   {@link CommandDescriptor.createFactory} encountered an error (e.g. unknown
   *   option, missing required positional, invalid type).
   */
  createInstance(): CommandInstance<Context, Result>;
};

/**
 * A fully parsed, ready-to-execute command.
 *
 * @typeParam Context - The value the caller must provide when executing the command.
 * @typeParam Result - The value the command produces on successful execution.
 */
export type CommandInstance<Context, Result> = {
  /**
   * Executes the command with the provided context.
   *
   * @param context - Arbitrary value injected by the caller (see {@link runAndExit}).
   * @returns A promise that resolves to the command's result, or rejects if the
   *   command handler throws.
   */
  executeWithContext(context: Context): Promise<Result>;
};

/**
 * Static, human-readable metadata attached to a command.
 *
 * This information is displayed in the usage/help output produced by {@link usageToStyledLines}.
 */
export type CommandInformation = {
  /** Short description of what the command does. Shown prominently in the usage header. */
  description: string;
  /**
   * Optional supplementary note shown in parentheses next to the description.
   * Suitable for short caveats such as `"deprecated"` or `"experimental"`.
   */
  hint?: string;
  /**
   * Optional list of additional detail lines printed below the description.
   * Useful for multi-line explanations, examples, or caveats that don't fit in
   * a single sentence.
   */
  details?: Array<string>;
  // TODO - printable examples ?
};

/**
 * The full usage/help model for a command as it appears after argument parsing.
 *
 * This is produced by {@link CommandFactory.generateUsage} and consumed by
 * {@link usageToStyledLines} to render the `--help` output.
 */
export type CommandUsage = {
  /**
   * Ordered list of breadcrumb segments that form the command's usage line, e.g.:
   * `Usage: my-cli <POSITIONAL> subcommand <ANOTHER_POSITIONAL>`.
   *
   * Each element is either a positional placeholder or a literal subcommand name.
   */
  breadcrumbs: Array<CommandUsageBreadcrumb>;
  /** The command's static metadata (description, hint, details). */
  information: CommandInformation;
  /**
   * Positional arguments that belong to the current command path,
   * in the order they must appear on the command line.
   */
  positionals: Array<PositionalUsage>;
  /**
   * Subcommands available at the current level of the command hierarchy.
   * Non-empty only when the command is a {@link commandWithSubcommands} and the
   * subcommand selection could not be resolved (i.e. on error or `--help`).
   */
  subcommands: Array<CommandUsageSubcommand>;
  /**
   * Options (flags and valued options) accepted by the current command path,
   * in the order they were registered.
   */
  options: Array<OptionUsage>;
};

/**
 * A single element in the usage breadcrumb trail shown at the top of the help output.
 *
 * - `{ positional: string }` — A positional placeholder such as `<NAME>` or `[FILE]`.
 * - `{ command: string }` — A literal subcommand token such as `deploy`.
 */
export type CommandUsageBreadcrumb =
  | { positional: string }
  | { command: string };

/**
 * Summary information about a single subcommand shown in the `Subcommands:` section
 * of the usage output.
 */
export type CommandUsageSubcommand = {
  /** The literal token the user types to select this subcommand (e.g. `"deploy"`). */
  name: string;
  /** Short description forwarded from the subcommand's {@link CommandInformation}. */
  description: string | undefined;
  /** Optional hint forwarded from the subcommand's {@link CommandInformation}. */
  hint: string | undefined;
};

/**
 * Creates a leaf command — a command that has no subcommands and directly executes
 * an {@link OperationDescriptor}.
 *
 * During parsing, `command` reads all positionals and options consumed by `operation`,
 * then asserts that no extra positionals remain. Any unexpected trailing positional
 * causes a {@link TypoError} deferred to {@link CommandFactory.createInstance}.
 *
 * @typeParam Context - The context value forwarded to the operation handler at
 *   execution time.
 * @typeParam Result - The value returned by the operation handler.
 *
 * @param information - Static metadata (description, hint, details) for the command.
 * @param operation - The operation that defines options, positionals, and the execution
 *   handler for this command.
 * @returns A {@link CommandDescriptor} suitable for passing to {@link runAndExit}
 *   or composing with {@link commandWithSubcommands} / {@link commandChained}.
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

/**
 * Creates a command that first runs an {@link OperationDescriptor} to produce an
 * intermediate `Payload`, then dispatches execution to one of several named subcommands
 * based on the next positional argument.
 *
 * **Parsing behaviour:**
 * 1. The `operation`'s positionals and options are parsed from `readerArgs`.
 * 2. The next positional token is consumed as the subcommand name.
 *    - If no token is present, a {@link TypoError} is deferred.
 *    - If the token does not match any key in `subcommands`, a {@link TypoError} is
 *      deferred.
 * 3. The matched subcommand's factory is created with the remaining `readerArgs`.
 *
 * **Usage on error / `--help`:** when the subcommand cannot be determined, the usage
 * output lists all available subcommands under a `Subcommands:` section.
 *
 * @typeParam Context - The context value accepted by the root operation handler.
 * @typeParam Payload - The value produced by the root operation and forwarded as the
 *   context to the selected subcommand.
 * @typeParam Result - The value produced by the selected subcommand.
 *
 * @param information - Static metadata shown in the top-level usage when no valid
 *   subcommand has been selected.
 * @param operation - The operation that is always executed first, before the
 *   subcommand. Its output becomes the subcommand's context.
 * @param subcommands - A map of lowercase subcommand names to their
 *   {@link CommandDescriptor}s. The keys are the literal tokens the user types.
 * @returns A {@link CommandDescriptor} that dispatches to one of the provided
 *   subcommands.
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

/**
 * Creates a command that chains two command stages by piping the output of an
 * {@link OperationDescriptor} directly into a {@link CommandDescriptor} as its context.
 *
 * Unlike {@link commandWithSubcommands}, there is no runtime token consumed for routing;
 * the `nextCommand` is always the continuation. This is useful for splitting a complex
 * command into reusable pieces, such as a shared authentication step followed by
 * different sub-actions.
 *
 * **Parsing behaviour:**
 * 1. `operation`'s positionals and options are parsed.
 * 2. `nextCommand`'s factory is immediately created from the same `readerArgs` (the
 *    remaining unparsed tokens).
 * 3. At execution time, `operation` runs first; its result is passed as the context to
 *    `nextCommand`.
 *
 * **Usage:** breadcrumbs, positionals, and options from both stages are merged into a
 * single flat usage description. The `information` of `nextCommand` takes precedence in
 * the generated usage output.
 *
 * @typeParam Context - The context value accepted by `operation`.
 * @typeParam Payload - The value produced by `operation` and used as the context for
 *   `nextCommand`.
 * @typeParam Result - The value produced by `nextCommand`.
 *
 * @param information - Fallback metadata used in the usage output when `nextCommand`'s
 *   factory cannot be created (i.e. on parse error in the next stage).
 * @param operation - The first stage operation. Its output becomes `nextCommand`'s
 *   context.
 * @param nextCommand - The second stage command, executed after `operation` succeeds.
 * @returns A {@link CommandDescriptor} that transparently composes the two stages.
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
