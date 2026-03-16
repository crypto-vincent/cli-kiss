import { CommandFlag } from "./Command";
import { Reader } from "./Reader";

/**
 * Creates a {@link CommandFlag} definition for a boolean flag.
 *
 * @remarks
 * A flag is a command-line switch that is either present (`true`) or absent
 * (`false`). It can be provided as `--long`, `-s`, `--long=true`,
 * `--long=false`, or any configured alias.
 *
 * @param definition - Descriptor for the flag.
 * @param definition.long - Primary long name used on the command line
 *   (e.g. `"verbose"` → `--verbose`) and as the internal key.
 * @param definition.short - Optional single-character short name
 *   (e.g. `"v"` → `-v`).
 * @param definition.aliases - Optional additional long and/or short name
 *   aliases that map to the same flag.
 *
 * @returns A {@link CommandFlag} ready to be used in a command definition.
 *
 * @example
 * ```ts
 * const cmd = commandWithFixedArgs({
 *   flags: {
 *     verbose: flag({ long: "verbose", short: "v" }),
 *   },
 *   // ...
 * });
 * ```
 */
export function flag(definition: {
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
}): CommandFlag {
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
      reader.registerFlag({ key, longs, shorts });
      return () => {
        return reader.consumeFlag(key);
      };
    },
  };
}
