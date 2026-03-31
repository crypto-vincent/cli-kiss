import { Option, OptionDecoder, OptionUsage } from "./Option";
import { Positional, PositionalDecoder, PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";

/**
 * Options, positionals, and an async handler that together form the logic of a CLI command.
 *
 * Created with {@link operation} and passed to {@link command},
 * {@link commandWithSubcommands}, or {@link commandChained}.
 *
 * @typeParam Context - Injected at execution time; forwarded to handlers. Use to inject dependencies.
 * @typeParam Result - Value produced on execution; typically `void` for leaf commands.
 */
export type Operation<Context, Result> = {
  /**
   * Returns usage metadata without consuming any arguments.
   */
  generateUsage(): OperationUsage;
  /**
   * Consumes args from `readerArgs` and returns an {@link OperationDecoder}.
   */
  consumeAndMakeDecoder(
    readerArgs: ReaderArgs,
  ): OperationDecoder<Context, Result>;
};

/**
 * Produced by {@link Operation.consumeAndMakeDecoder}.
 *
 * @typeParam Context - See {@link Operation}.
 * @typeParam Result - See {@link Operation}.
 */
export type OperationDecoder<Context, Result> = {
  /**
   * Creates a ready-to-execute {@link OperationInterpreter}.
   *
   * @throws {@link TypoError} if parsing or decoding failed.
   */
  decodeAndMakeInterpreter(): OperationInterpreter<Context, Result>;
};

/**
 * A fully parsed, decoded and ready-to-execute operation.
 *
 * @typeParam Context - Caller-supplied context.
 * @typeParam Result - Value produced on success.
 */
export type OperationInterpreter<Context, Result> = {
  /**
   * Executes with the provided context.
   */
  executeWithContext(context: Context): Promise<Result>;
};

/**
 * Usage metadata produced by {@link Operation.generateUsage}.
 * Consumed when building {@link CommandUsage}.
 */
export type OperationUsage = {
  /**
   * Usage descriptors for all registered options.
   */
  options: Array<OptionUsage>;
  /**
   * Usage descriptors for all declared positionals, in order.
   */
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
 *   async function (_ctx, { options: { loud }, positionals: [name] }) {
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
        optionsUsage.push(optionInput.generateUsage());
      }
      const positionalsUsage = new Array<PositionalUsage>();
      for (const positionalInput of inputs.positionals) {
        positionalsUsage.push(positionalInput.generateUsage());
      }
      return { options: optionsUsage, positionals: positionalsUsage };
    },
    consumeAndMakeDecoder(readerArgs: ReaderArgs) {
      const optionsDecoders: Record<string, OptionDecoder<any>> = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsDecoders[optionKey] =
          optionInput.registerAndMakeDecoder(readerArgs);
      }
      const positionalsDecoders: Array<PositionalDecoder<any>> = [];
      for (const positionalInput of inputs.positionals) {
        positionalsDecoders.push(
          positionalInput.consumeAndMakeDecoder(readerArgs),
        );
      }
      return {
        decodeAndMakeInterpreter() {
          const optionsValues: any = {};
          for (const optionKey in optionsDecoders) {
            optionsValues[optionKey] =
              optionsDecoders[optionKey]!.getAndDecodeValue();
          }
          const positionalsValues: any = [];
          for (const positionalDecoder of positionalsDecoders) {
            positionalsValues.push(positionalDecoder.decodeValue());
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
