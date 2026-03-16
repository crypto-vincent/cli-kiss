import { CommandVariadics } from "./Command";
import { ReaderPositional } from "./Reader";

/**
 * Creates a {@link CommandVariadics} that reads zero or more trailing
 * positional arguments, split into a list of optional positions followed by
 * an unlimited rest list.
 *
 * @remarks
 * `optionals` are consumed one-by-one in declaration order; each decoder
 * receives the positional string (or `undefined` if there are no more
 * positionals). `rests` consumes all remaining positionals into an array.
 *
 * This is particularly useful for commands that follow a pattern such as:
 * `cmd <required> [optional1] [optional2] [rest...]`
 *
 * @typeParam Optionals - Const tuple of optional decoder descriptors.
 * @typeParam Rest - The decoded type of each rest argument.
 *
 * @param definition - Descriptor for variadic arguments.
 * @param definition.optionals - Ordered list of optional positional
 *   decoders; each entry has a `decoder` that accepts `string | undefined`.
 * @param definition.rests - Decoder for unlimited trailing positional
 *   arguments.
 *
 * @returns A {@link CommandVariadics} whose value type is
 *   `{ optionals: [...decoded types], rests: Rest[] }`.
 *
 * @example
 * ```ts
 * const cmd = commandWithVariadics({
 *   flags: {},
 *   options: {},
 *   args: [],
 *   variadics: variadics({
 *     optionals: [{ decoder: (v) => v ?? "default" }],
 *     rests: { decoder: String },
 *   }),
 *   handler: async (ctx, { variadics }) => {
 *     console.log(variadics.optionals[0]); // string
 *     console.log(variadics.rests);        // string[]
 *   },
 * });
 * ```
 */
export function variadics<
  const Optionals extends Array<{
    decoder: (value: string | undefined) => any;
  }>,
  Rest,
>(definition: {
  optionals: Optionals;
  rests: { decoder: (value: string) => Rest };
}): CommandVariadics<{
  optionals: { [K in keyof Optionals]: ReturnType<Optionals[K]["decoder"]> };
  rests: Array<Rest>;
}> {
  return {
    read: (readerPositional: ReaderPositional) => {
      const optionalsValues: any = [];
      for (const optional of definition.optionals) {
        optionalsValues.push(
          optional.decoder(readerPositional.consumePositional()),
        );
      }
      const restsValues = new Array<Rest>();
      while (true) {
        const positional = readerPositional.consumePositional();
        if (positional === undefined) {
          break;
        }
        restsValues.push(definition.rests.decoder(positional));
      }
      return { optionals: optionalsValues, rests: restsValues };
    },
  };
}
