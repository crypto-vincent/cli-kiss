import { Operation } from "./Operation";
import { ReaderArgs } from "./Reader";
import { suggestMessagePushInfered } from "./Suggest";
import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleQuote,
  typoStyleUserInput,
  TypoText,
} from "./Typo";
import { UsageCommand } from "./Usage";

/**
 * A CLI command. Created with {@link command}, {@link commandWithSubcommands}, or {@link commandChained}.
 *
 * @typeParam Context - Injected at execution; forwarded to handlers.
 * @typeParam Result - Produced on execution; typically `void`.
 */
export type Command<Context, Result> = {
  /**
   * Returns static metadata.
   */
  getInformation(): CommandInformation;
  /**
   * Registers options/positionals on `readerArgs`; returns a {@link CommandDecoder}.
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
   * Returns {@link UsageCommand} for the current command path.
   */
  generateUsage(): UsageCommand;
  /**
   * Creates a ready-to-execute {@link CommandInterpreter}.
   *
   * @throws if parsing or decoding failed.
   */
  decodeAndMakeInterpreter(): CommandInterpreter<Context, Result>;
};

/**
 * A fully parsed, decoded and ready-to-execute command.
 *
 * @typeParam Context - Context passed to the handler.
 * @typeParam Result - Value produced on success.
 */
export type CommandInterpreter<Context, Result> = {
  /**
   * Executes with the provided context.
   */
  executeWithContext(context: Context): Promise<Result>;
};

/**
 * Command metadata shown in `--help` output.
 */
export type CommandInformation = {
  /**
   * Shown in the usage header.
   */
  description: string;
  /**
   * Shown in parentheses, e.g. `"deprecated"`, `"experimental"`.
   */
  hint?: string;
  /**
   * Extra lines printed below the description.
   */
  details?: Array<string>;
  /**
   * Shown in the `Examples:` section.
   */
  examples?: Array<{
    // TODO - a nicer example system, maybe with --help=example support
    /**
     * Explanation shown above the example.
     */
    explanation: string;
    /**
     * Example command args.
     */
    commandArgs: Array<
      | string
      | { positional: string }
      | { subcommand: string }
      | {
          option:
            | { long: string; inlined?: string; separated?: Array<string> }
            | { short: string; inlined?: string; separated?: Array<string> };
        }
    >;
  }>;
};

/**
 * Creates a leaf command that directly executes an {@link Operation}.
 *
 * @typeParam Context - Context forwarded to the handler.
 * @typeParam Result - Value returned by the handler.
 *
 * @param information - Command metadata.
 * @param operation - Options, positionals, and handler.
 * @returns A {@link Command}.
 *
 * @example
 * ```ts
 * const greet = command(
 *   { description: "Greet a user" },
 *   operation(
 *     { options: {}, positionals: [positionalRequired({ type: type("name") })] },
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
          generateUsage: () => generateUsageLeaf(information, operation),
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
          generateUsage: () => generateUsageLeaf(information, operation),
          decodeAndMakeInterpreter() {
            throw error;
          },
        };
      }
    },
  };
}

/**
 * Creates a command that runs `operation` first, then dispatches to a named subcommand.
 *
 * @typeParam Context - Context accepted by `operation`.
 * @typeParam Payload - Output of `operation`; becomes the subcommand's context.
 * @typeParam Result - Value produced by the selected subcommand.
 *
 * @param information - Command metadata.
 * @param operation - Runs first; output becomes the subcommand's context.
 * @param subcommands - Map of subcommand names to their {@link Command}s.
 * @returns A dispatching {@link Command}.
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
  subcommands: { [subcommand: string]: Command<Payload, Result> },
): Command<Context, Result> {
  const subcommandNames = Object.keys(subcommands);
  if (subcommandNames.length === 0) {
    throw new Error("At least one subcommand is required");
  }
  return {
    getInformation() {
      return information;
    },
    consumeAndMakeDecoder(readerArgs: ReaderArgs) {
      try {
        const operationDecoder = operation.consumeAndMakeDecoder(readerArgs);
        const subcommandName = readerArgs.consumePositional();
        if (subcommandName === undefined) {
          const errorText = new TypoText();
          errorText.push(new TypoString(`<subcommand>`, typoStyleUserInput));
          errorText.push(new TypoString(`: Missing argument.`));
          suggestSubcommandNames(errorText, "", subcommandNames);
          throw new TypoError(errorText);
        }
        const subcommandInput = subcommands[subcommandName];
        if (subcommandInput === undefined) {
          const errorText = new TypoText();
          errorText.push(new TypoString(`<subcommand>`, typoStyleUserInput));
          errorText.push(new TypoString(`: Unknown name: `));
          errorText.push(new TypoString(`"${subcommandName}"`, typoStyleQuote));
          errorText.push(new TypoString(`.`));
          suggestSubcommandNames(errorText, subcommandName, subcommandNames);
          throw new TypoError(errorText);
        }
        const subcommandDecoder =
          subcommandInput.consumeAndMakeDecoder(readerArgs);
        return {
          generateUsage() {
            const subcommandUsage = subcommandDecoder.generateUsage();
            const currentUsage = generateUsageLeaf(information, operation);
            currentUsage.segments.push({ subcommand: subcommandName });
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
            const currentUsage = generateUsageLeaf(information, operation);
            currentUsage.segments.push({ positional: "<subcommand>" });
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
 * @param information - Command metadata.
 * @param operation - Runs first; output becomes `subcommand`'s context.
 * @param subcommand - Runs after `operation`.
 * @returns A {@link Command} composing both stages.
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
            const currentUsage = generateUsageLeaf(information, operation);
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
            const currentUsage = generateUsageLeaf(information, operation);
            currentUsage.segments.push({ positional: "[REST]..." });
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

function generateUsageLeaf(
  information: CommandInformation,
  operation: Operation<any, any>,
): UsageCommand {
  const { positionals, options } = operation.generateUsage();
  return {
    segments: positionals.map((positional) => ({
      positional: positional.label,
    })),
    information,
    positionals,
    subcommands: [],
    options,
  };
}

function suggestSubcommandNames(
  errorText: TypoText,
  input: string,
  subcommandNames: Array<string> = [],
) {
  suggestMessagePushInfered(
    errorText,
    input,
    subcommandNames.map((subcommandName) => ({
      expected: subcommandName,
      hint: new TypoString(subcommandName, typoStyleConstants),
    })),
  );
}
