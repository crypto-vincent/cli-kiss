import { Option, OptionParser, OptionUsage } from "./Option";
import { Positional, PositionalParser, PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";

/**
 * Options, positionals, and an async handler that together form the logic of a
 * CLI command.
 *
 * Created with {@link operation} and passed to {@link command},
 * {@link commandWithSubcommands}, or {@link commandChained}.
 *
 * @typeParam Input - Context value the handler receives at execution time.
 * @typeParam Output - Value the handler produces.
 */
export type Operation<Input, Output> = {
  /** Returns usage metadata without consuming any arguments. */
  generateUsage(): OperationUsage;
  /**
   * Parses options and positionals from `readerArgs` and returns an
   * {@link OperationFactory}. Parse errors are deferred to
   * {@link OperationFactory.createInstance}.
   *
   * @param readerArgs - Shared argument reader.
   */
  createFactory(readerArgs: ReaderArgs): OperationFactory<Input, Output>;
};

/**
 * Produced by {@link Operation.createFactory}. Creates a ready-to-execute
 * {@link OperationInstance}.
 *
 * @typeParam Input - Context type. See {@link Operation}.
 * @typeParam Output - Result type. See {@link Operation}.
 */
export type OperationFactory<Input, Output> = {
  /**
   * Extracts parsed values and returns an {@link OperationInstance}.
   *
   * @throws {@link TypoError} if any option or positional validation failed during
   *   {@link Operation.createFactory}.
   */
  createInstance(): OperationInstance<Input, Output>;
};

/**
 * A fully parsed, ready-to-execute operation.
 *
 * @typeParam Input - Context value the caller must supply.
 * @typeParam Output - Value produced on successful execution.
 */
export type OperationInstance<Input, Output> = {
  /**
   * Runs the handler with the given context and all parsed inputs.
   *
   * @param input - Context from the parent command or {@link runAndExit}.
   * @returns Promise resolving to the handler's return value.
   */
  executeWithContext(input: Input): Promise<Output>;
};

/**
 * Usage metadata produced by {@link Operation.generateUsage}.
 * Consumed when building {@link CommandUsage}.
 */
export type OperationUsage = {
  /** Usage descriptors for all registered options. */
  options: Array<OptionUsage>;
  /** Usage descriptors for all declared positionals, in order. */
  positionals: Array<PositionalUsage>;
};

/**
 * Creates an {@link Operation} from options, positionals, and an async handler.
 *
 * The `handler` receives the parent `context` and an `inputs` object with
 * `options` (keyed by the same names declared in `inputs.options`) and
 * `positionals` (a tuple in declaration order).
 *
 * @typeParam Context - Context type accepted by the handler.
 * @typeParam Result - Return type of the handler.
 * @typeParam Options - Map of option keys to parsed value types.
 * @typeParam Positionals - Tuple of parsed positional value types, in order.
 *
 * @param inputs - Options and positionals this operation accepts.
 * @param inputs.options - Map of keys to {@link Option} descriptors.
 * @param inputs.positionals - Ordered array of {@link Positional} descriptors.
 * @param handler - Async function implementing the command logic.
 * @returns An {@link Operation} ready to be composed into a command.
 *
 * @example
 * ```ts
 * const greetOperation = operation(
 *   {
 *     options: {
 *       loud: optionFlag({ long: "loud", description: "Print in uppercase" }),
 *     },
 *     positionals: [
 *       positionalRequired({ type: typeString, label: "NAME", description: "Name to greet" }),
 *     ],
 *   },
 *   async (_ctx, { options: { loud }, positionals: [name] }) => {
 *     const message = `Hello, ${name}!`;
 *     console.log(loud ? message.toUpperCase() : message);
 *   },
 * );
 * ```
 */
export function operation<
  Context,
  Result,
  Options extends { [option: string]: any },
  const Positionals extends Array<any>,
>(
  inputs: {
    options: { [K in keyof Options]: Option<Options[K]> };
    positionals: { [K in keyof Positionals]: Positional<Positionals[K]> };
  },
  handler: (
    context: Context,
    inputs: {
      options: Options;
      positionals: Positionals;
    },
  ) => Promise<Result>,
): Operation<Context, Result> {
  return {
    generateUsage() {
      const optionsUsage = new Array<OptionUsage>();
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        if (optionInput) {
          optionsUsage.push(optionInput.generateUsage());
        }
      }
      const positionalsUsage = new Array<PositionalUsage>();
      for (const positionalInput of inputs.positionals) {
        positionalsUsage.push(positionalInput.generateUsage());
      }
      return { options: optionsUsage, positionals: positionalsUsage };
    },
    createFactory(readerArgs: ReaderArgs) {
      const optionsGetters: Record<string, OptionParser<any>> = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsGetters[optionKey] = optionInput.createParser(readerArgs);
      }
      const positionalsParsers: Array<PositionalParser<any>> = [];
      for (const positionalInput of inputs.positionals) {
        positionalsParsers.push(positionalInput.createParser(readerArgs));
      }
      return {
        createInstance() {
          const optionsValues: any = {};
          for (const optionKey in optionsGetters) {
            optionsValues[optionKey] = optionsGetters[optionKey]!.parseValue();
          }
          const positionalsValues: any = [];
          for (const positionalParser of positionalsParsers) {
            positionalsValues.push(positionalParser.parseValue());
          }
          return {
            executeWithContext(context: Context) {
              return handler(context, {
                options: optionsValues,
                positionals: positionalsValues,
              });
            },
          };
        },
      };
    },
  };
}
