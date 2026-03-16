import { CommandArg } from "./Command";
import { ReaderPositional } from "./Reader";

/**
 * Creates a {@link CommandArg} that reads exactly one required positional
 * argument and decodes it.
 *
 * @remarks
 * Positional arguments are consumed in the order they are declared in the
 * `args` array of a command definition. If no positional argument is available
 * when this arg is read, an error is thrown.
 *
 * @typeParam Value - The decoded type of the argument.
 *
 * @param definition - Descriptor for the positional argument.
 * @param definition.name - Human-readable name used in error messages.
 * @param definition.decoder - Function that converts the raw string value to
 *   `Value`.
 *
 * @returns A {@link CommandArg} that produces a single `Value`.
 *
 * @throws {Error} If the positional argument is missing from the command line.
 *
 * @example
 * ```ts
 * const cmd = commandWithFixedArgs({
 *   flags: {},
 *   options: {},
 *   args: [
 *     argSingle({ name: "source", decoder: String }),
 *     argSingle({ name: "count",  decoder: Number }),
 *   ],
 *   handler: async (ctx, { args }) => {
 *     const [source, count] = args;
 *     console.log(source, count); // string, number
 *   },
 * });
 * ```
 */
export function argSingle<Value>(definition: {
  name: string;
  decoder: (value: string) => Value;
}): CommandArg<Value> {
  return {
    read: (readerPositional: ReaderPositional) => {
      const positional = readerPositional.consumePositional();
      if (positional === undefined) {
        throw new Error(`Missing required arg: ${definition.name}`);
      }
      return definition.decoder(positional);
    },
  };
}
