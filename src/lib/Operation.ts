import { Option, OptionUsage } from "./Option";
import { Positional, PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";

/**
 * Describes an operation — the combination of options, positional arguments, and an
 * async execution handler that together form the core logic of a CLI command.
 *
 * An `OperationDescriptor` is created with {@link operation} and passed to
 * {@link command}, {@link commandWithSubcommands}, or {@link commandChained} to build
 * a full {@link CommandDescriptor}.
 *
 * @typeParam Input - The context value the handler receives at execution time (forwarded
 *   from the parent command's context or from a preceding chained operation).
 * @typeParam Output - The value the handler produces. For leaf operations this is
 *   typically `void`; for intermediate stages it is the payload forwarded to the next
 *   command in a chain.
 */
export type OperationDescriptor<Input, Output> = {
  /**
   * Returns usage metadata (options and positionals) without consuming any arguments.
   * Called by the parent command factory when building the help/usage output.
   */
  generateUsage(): OperationUsage;
  /**
   * Parses options and positionals from `readerArgs` and returns an
   * {@link OperationFactory} that can create a ready-to-execute
   * {@link OperationInstance}.
   *
   * Any parse error (unknown option, type mismatch, etc.) is captured and re-thrown
   * when {@link OperationFactory.createInstance} is called.
   *
   * @param readerArgs - The shared argument reader. Options are registered on it and
   *   positionals are consumed in declaration order.
   */
  createFactory(readerArgs: ReaderArgs): OperationFactory<Input, Output>;
};

/**
 * Produced by {@link OperationDescriptor.createFactory} after argument parsing.
 * Instantiating it finalises value extraction and produces an {@link OperationInstance}.
 *
 * @typeParam Input - Forwarded from the parent {@link OperationDescriptor}.
 * @typeParam Output - Forwarded from the parent {@link OperationDescriptor}.
 */
export type OperationFactory<Input, Output> = {
  /**
   * Extracts the final parsed values for all options and returns an
   * {@link OperationInstance} ready for execution.
   *
   * @throws {@link TypoError} if any option or positional validation failed during
   *   {@link OperationDescriptor.createFactory}.
   */
  createInstance(): OperationInstance<Input, Output>;
};

/**
 * A fully parsed, ready-to-execute operation.
 *
 * @typeParam Input - The value the caller must supply as context.
 * @typeParam Output - The value produced on successful execution.
 */
export type OperationInstance<Input, Output> = {
  /**
   * Runs the operation handler with the provided input context and the parsed
   * option/positional values.
   *
   * @param input - Context from the parent command (or the root context supplied to
   *   {@link runAsCliAndExit}).
   * @returns A promise resolving to the handler's return value.
   */
  executeWithContext(input: Input): Promise<Output>;
};

/**
 * Collected usage metadata produced by {@link OperationDescriptor.generateUsage}.
 * Consumed by the parent command factory when building {@link CommandUsage}.
 */
export type OperationUsage = {
  /** Usage descriptors for all options registered by this operation. */
  options: Array<OptionUsage>;
  /** Usage descriptors for all positionals declared by this operation, in order. */
  positionals: Array<PositionalUsage>;
};

/**
 * Creates an {@link OperationDescriptor} from a set of options, positionals, and an
 * async handler function.
 *
 * The `handler` receives:
 * - `context` — the value passed down from the parent command (or from
 *   {@link runAsCliAndExit}).
 * - `inputs.options` — an object whose keys match those declared in `inputs.options` and whose values are
 *   the parsed option values.
 * - `inputs.positionals` — a tuple whose elements match `inputs.positionals` and whose
 *   values are the parsed positional values, in declaration order.
 *
 * @typeParam Context - The context type accepted by the handler.
 * @typeParam Result - The return type of the handler.
 * @typeParam Options - Object type mapping option keys to their parsed value types.
 * @typeParam Positionals - Tuple type of parsed positional value types, in order.
 *
 * @param inputs - Declares the options and positionals this operation accepts.
 * @param inputs.options - A map from arbitrary keys to {@link Option} descriptors.
 *   The same keys appear in `handler`'s `inputs.options` argument.
 * @param inputs.positionals - An ordered array of {@link Positional} descriptors.
 *   Their parsed values appear in `handler`'s `inputs.positionals` argument, in the
 *   same order.
 * @param handler - The async function that implements the command logic. Receives the
 *   execution context and all parsed inputs.
 * @returns An {@link OperationDescriptor} ready to be composed into a command.
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
    inputs: { options: Options; positionals: Positionals },
  ) => Promise<Result>,
): OperationDescriptor<Context, Result> {
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
      const optionsGetters: any = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsGetters[optionKey] = optionInput.createGetter(readerArgs);
      }
      const positionalsValues: any = [];
      for (const positionalInput of inputs.positionals) {
        positionalsValues.push(positionalInput.consumePositionals(readerArgs));
      }
      return {
        createInstance() {
          const optionsValues: any = {};
          for (const optionKey in optionsGetters) {
            optionsValues[optionKey] = optionsGetters[optionKey]!.getValue();
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
