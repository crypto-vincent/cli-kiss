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
 * Created with {@link command}, {@link commandWithSubcommands}, or {@link commandChained}.
 * Usually passed through {@link runAndExit} to run.
 *
 * @typeParam Context - Injected at execution time; forwarded to handlers. Use to inject dependencies.
 * @typeParam Result - Value produced on execution; typically `void` for leaf commands.
 */
export type Command<Context, Result> = {
  /**
   * Returns the command's static metadata.
   */
  getInformation(): CommandInformation;
  /**
   * Consumes args in a `readerArgs` and returns a {@link CommandDecoder}.
   */
  consumeAndMakeDecoder(
    readerArgs: ReaderArgs,
  ): CommandDecoder<Context, Result>;
};

/**
 * Produced by {@link Command.consumeAndMakeDecoder}.
 *
 * @typeParam Context - See {@link Command}.
 * @typeParam Result - See {@link Command}.
 */
export type CommandDecoder<Context, Result> = {
  /**
   * Builds the {@link CommandUsage} for the current command path.
   * Used for `--help` and `usageOnError`.
   */
  generateUsage(): CommandUsage;
  /**
   * Creates a ready-to-execute {@link CommandInterpreter}.
   *
   * @throws {@link TypoError} if parsing or decoding failed.
   */
  decodeAndMakeInterpreter(): CommandInterpreter<Context, Result>;
};

/**
 * A fully parsed, decoded and ready-to-execute command.
 *
 * @typeParam Context - Caller-supplied context.
 * @typeParam Result - Value produced on success.
 */
export type CommandInterpreter<Context, Result> = {
  /**
   * Executes with the provided context.
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
 * Full usage/help model.
 * Produced by {@link CommandDecoder.generateUsage},
 * Consumed by {@link usageToStyledLines}.
 */
export type CommandUsage = {
  /**
   * Segments forming the usage line
   * (e.g. `my-cli <POSITIONAL> subcommand <ANOTHER_POSITIONAL>`).
   */
  segments: Array<CommandUsageSegment>;
  /**
   * Command's static metadata.
   */
  information: CommandInformation;
  /**
   * Positionals in declaration order.
   */
  positionals: Array<PositionalUsage>;
  /**
   * Available subcommands. Non-empty when subcommand was not specified.
   */
  subcommands: Array<CommandUsageSubcommand>;
  /**
   * Options in registration order.
   */
  options: Array<OptionUsage>;
};

/**
 * One element in the usage segment trail.
 */
export type CommandUsageSegment = { positional: string } | { command: string };

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
 *
 * @typeParam Context - Context forwarded to the handler.
 * @typeParam Result - Value returned by the handler.
 *
 * @param information - Command metadata (description, hint, details).
 * @param operation - Defines: options, positionals, and the handler.
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
    consumeAndMakeDecoder(readerArgs: ReaderArgs) {
      try {
        const operationDecoder = operation.consumeAndMakeDecoder(readerArgs);
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
          generateUsage: () => generateUsageShallow(information, operation),
          decodeAndMakeInterpreter() {
            const operationInterpreter =
              operationDecoder.decodeAndMakeInterpreter();
            return {
              async executeWithContext(context: Context) {
                return await operationInterpreter.executeWithContext(context);
              },
            };
          },
        };
      } catch (error) {
        return {
          generateUsage: () => generateUsageShallow(information, operation),
          decodeAndMakeInterpreter() {
            throw error;
          },
        };
      }
    },
  };
}

/**
 * Creates a command that runs an {@link Operation} to produce a `Payload`,
 * then dispatches to a named subcommand based on the next positional token.
 *
 * @typeParam Context - Context accepted by `operation`.
 * @typeParam Payload - Output of `operation`; becomes the subcommand's context.
 * @typeParam Result - Value produced by the selected subcommand.
 *
 * @param information - Command metadata (description, hint, details).
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
    consumeAndMakeDecoder(readerArgs: ReaderArgs) {
      try {
        const operationDecoder = operation.consumeAndMakeDecoder(readerArgs);
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
        const subcommandDecoder =
          subcommandInput.consumeAndMakeDecoder(readerArgs);
        return {
          generateUsage() {
            const subcommandUsage = subcommandDecoder.generateUsage();
            const currentUsage = generateUsageShallow(information, operation);
            currentUsage.segments.push(segmentCommand(subcommandName));
            currentUsage.segments.push(...subcommandUsage.segments);
            currentUsage.information = subcommandUsage.information;
            currentUsage.positionals.push(...subcommandUsage.positionals);
            currentUsage.subcommands = subcommandUsage.subcommands;
            currentUsage.options.push(...subcommandUsage.options);
            return currentUsage;
          },
          decodeAndMakeInterpreter() {
            const operationInterpreter =
              operationDecoder.decodeAndMakeInterpreter();
            const subcommandInterpreter =
              subcommandDecoder.decodeAndMakeInterpreter();
            return {
              async executeWithContext(context: Context) {
                return await subcommandInterpreter.executeWithContext(
                  await operationInterpreter.executeWithContext(context),
                );
              },
            };
          },
        };
      } catch (error) {
        return {
          generateUsage() {
            const currentUsage = generateUsageShallow(information, operation);
            currentUsage.segments.push(segmentPositional("<SUBCOMMAND>"));
            for (const [name, subcommand] of Object.entries(subcommands)) {
              const { description, hint } = subcommand.getInformation();
              currentUsage.subcommands.push({ name, description, hint });
            }
            return currentUsage;
          },
          decodeAndMakeInterpreter() {
            throw error;
          },
        };
      }
    },
  };
}

/**
 * Chains an {@link Operation} and a {@link Command}: `operation` runs first, its
 * output becomes `subcommand`'s context. No token is consumed for routing.
 *
 * @typeParam Context - Context accepted by `operation`.
 * @typeParam Payload - Output of `operation`; becomes `subcommand`'s context.
 * @typeParam Result - Value produced by `subcommand`.
 *
 * @param information - Command metadata (description, hint, details).
 * @param operation - First stage; its output is passed as `subcommand`'s context.
 * @param subcommand - Second stage, executed after `operation`.
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
  subcommand: Command<Payload, Result>,
): Command<Context, Result> {
  return {
    getInformation() {
      return information;
    },
    consumeAndMakeDecoder(readerArgs: ReaderArgs) {
      try {
        const operationDecoder = operation.consumeAndMakeDecoder(readerArgs);
        const subcommandDecoder = subcommand.consumeAndMakeDecoder(readerArgs);
        return {
          generateUsage() {
            const subcommandUsage = subcommandDecoder.generateUsage();
            const currentUsage = generateUsageShallow(information, operation);
            currentUsage.segments.push(...subcommandUsage.segments);
            currentUsage.information = subcommandUsage.information;
            currentUsage.positionals.push(...subcommandUsage.positionals);
            currentUsage.subcommands = subcommandUsage.subcommands;
            currentUsage.options.push(...subcommandUsage.options);
            return currentUsage;
          },
          decodeAndMakeInterpreter() {
            const operationInterpreter =
              operationDecoder.decodeAndMakeInterpreter();
            const subcommandInterpreter =
              subcommandDecoder.decodeAndMakeInterpreter();
            return {
              async executeWithContext(context: Context) {
                return await subcommandInterpreter.executeWithContext(
                  await operationInterpreter.executeWithContext(context),
                );
              },
            };
          },
        };
      } catch (error) {
        return {
          generateUsage() {
            const currentUsage = generateUsageShallow(information, operation);
            currentUsage.segments.push(segmentPositional("[REST]..."));
            return currentUsage;
          },
          decodeAndMakeInterpreter() {
            throw error;
          },
        };
      }
    },
  };
}

function segmentPositional(value: string): CommandUsageSegment {
  return { positional: value };
}

function segmentCommand(value: string): CommandUsageSegment {
  return { command: value };
}

function generateUsageShallow(
  information: CommandInformation,
  operation: Operation<any, any>,
): CommandUsage {
  const { positionals, options } = operation.generateUsage();
  return {
    segments: positionals.map((positional) =>
      segmentPositional(positional.label),
    ),
    information,
    positionals,
    subcommands: [],
    options,
  };
}
