import { CommandOption } from "./Command";
import { Reader } from "./Reader";

/**
 * Creates a {@link CommandOption} that collects every occurrence of the option
 * into an array.
 *
 * @remarks
 * Use this when the same option flag may legitimately appear multiple times on
 * the command line (e.g. `-I path/a -I path/b`). Each supplied value is
 * decoded independently and appended to the result array.
 *
 * If the option is not provided at all, the handler receives an empty array.
 *
 * @typeParam Value - The decoded type of each individual option value.
 *
 * @param definition - Descriptor for the option.
 * @param definition.long - Primary long name (e.g. `"include"` → `--include`)
 *   and internal key.
 * @param definition.short - Optional single-character short name
 *   (e.g. `"I"` → `-I`).
 * @param definition.aliases - Optional additional long and/or short name
 *   aliases.
 * @param definition.decoder - Function that converts a raw string value to
 *   `Value`.
 *
 * @returns A {@link CommandOption} producing `Array<Value>`.
 *
 * @example
 * ```ts
 * const cmd = commandWithFixedArgs({
 *   flags: {},
 *   options: {
 *     includes: optionMultipleValues({ long: "include", short: "I", decoder: String }),
 *   },
 *   args: [],
 *   handler: async (ctx, { options }) => {
 *     console.log(options.includes); // string[]
 *   },
 * });
 * ```
 */
export function optionMultipleValues<Value>(definition: {
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  decoder: (value: string) => Value;
}): CommandOption<Array<Value>> {
  return {
    prepare: (reader: Reader) => {
      const key = definition.long;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      reader.registerOption({ key, longs, shorts });
      return () => {
        return reader.consumeOption(key).map(definition.decoder);
      };
    },
  };
}

/**
 * Creates a {@link CommandOption} that expects the option to appear exactly
 * once and returns a single decoded value.
 *
 * @remarks
 * If the option is provided more than once, or is missing entirely, the
 * handler throws at runtime. Use {@link optionMultipleValues} when zero or
 * multiple occurrences are acceptable.
 *
 * @typeParam Value - The decoded type of the option value.
 *
 * @param definition - Descriptor for the option.
 * @param definition.long - Primary long name (e.g. `"output"` → `--output`)
 *   and internal key.
 * @param definition.short - Optional single-character short name
 *   (e.g. `"o"` → `-o`).
 * @param definition.aliases - Optional additional long and/or short name
 *   aliases.
 * @param definition.decoder - Function that converts the raw string value to
 *   `Value`.
 *
 * @returns A {@link CommandOption} producing a single `Value`.
 *
 * @throws {Error} If the option is supplied more than once.
 * @throws {Error} If the option is not supplied at all.
 *
 * @example
 * ```ts
 * const cmd = commandWithFixedArgs({
 *   flags: {},
 *   options: {
 *     output: optionSingleValue({ long: "output", short: "o", decoder: String }),
 *   },
 *   args: [],
 *   handler: async (ctx, { options }) => {
 *     console.log(options.output); // string
 *   },
 * });
 * ```
 */
export function optionSingleValue<Value>(definition: {
  long: string;
  short?: string;
  aliases?: {
    longs?: Array<string>;
    shorts?: Array<string>;
  };
  decoder: (value: string) => Value;
}): CommandOption<Value> {
  return {
    prepare: (reader: Reader) => {
      const key = definition.long;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      reader.registerOption({ key, longs, shorts });
      return () => {
        // TODO - error handling
        const values = reader.consumeOption(definition.long);
        if (values.length > 1) {
          throw new Error("???");
        }
        if (values.length < 1) {
          throw new Error("???");
        }
        return definition.decoder(values[0]!);
      };
    },
  };
}
