import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleQuote,
  TypoText,
} from "./Typo";

/**
 * An opaque key that uniquely identifies a registered CLI option within a
 * {@link ReaderArgs} instance.
 *
 * Keys are returned by {@link ReaderArgs.registerOption} and passed back to
 * {@link ReaderArgs.getOptionValues} to retrieve the parsed values. The internal
 * representation is intentionally opaque — treat it as a handle, not a string.
 */
export type ReaderOptionKey = (string | { __brand: "ReaderOptionKey" }) & {
  __brand: "ReaderOptionKey";
};

/**
 * Interface for registering and querying CLI options during argument parsing.
 *
 * {@link ReaderArgs} implements both `ReaderOptions` and {@link ReaderPositionals}.
 * The two interfaces are exposed separately so that option and positional parsing logic
 * can depend only on the capability they need.
 */
export type ReaderOptions = {
  /**
   * Registers a new option so the parser can recognise it when scanning argument tokens.
   *
   * @param definition.longs - The long-form names (without `--`) for this option.
   * @param definition.shorts - The short-form names (without `-`) for this option.
   * @param definition.valued - When `true`, the option consumes the following token as
   *   its value. When `false`, the option is a boolean flag.
   * @returns An opaque {@link ReaderOptionKey} used to retrieve parsed values later.
   * @throws `Error` if any of the given names has already been registered, or if a
   *   short name overlaps (is a prefix of, or has as a prefix, another registered short).
   */
  registerOption(definition: {
    longs: Array<string>;
    shorts: Array<string>;
    valued: boolean;
  }): ReaderOptionKey;
  /**
   * Returns all values collected for the option identified by `key`.
   *
   * @param key - The key returned by a prior {@link ReaderOptions.registerOption} call.
   * @returns An array of raw string values, one per occurrence of the option on the
   *   command line. Empty if the option was never provided.
   * @throws `Error` if `key` was not previously registered on this instance.
   */
  getOptionValues(key: ReaderOptionKey): Array<string>;
};

/**
 * Interface for consuming positional (non-option) argument tokens during parsing.
 *
 * {@link ReaderArgs} implements both {@link ReaderOptions} and `ReaderPositionals`.
 */
export type ReaderPositionals = {
  /**
   * Consumes and returns the next positional token from the argument list, skipping
   * any option tokens (which are parsed as side-effects).
   *
   * @returns The next positional string value, or `undefined` if no more positionals
   *   are available.
   * @throws {@link TypoError} if an unrecognised option token is encountered while
   *   scanning for the next positional.
   */
  consumePositional(): string | undefined;
};

/**
 * The core argument parser for `cli-kiss`. Parses a flat array of raw CLI tokens into
 * named options and positional values.
 *
 * Options must be registered with {@link ReaderArgs.registerOption} **before**
 * {@link ReaderArgs.consumePositional} is called, because the parser needs to know
 * whether each token is an option name, an option value, or a bare positional.
 *
 * **Supported argument syntax:**
 * - Long options: `--name`, `--name value`, `--name=value`
 * - Short options: `-n`, `-n value`, `-n=value`, `-nvalue`, `-abc` (stacked flags)
 * - End-of-options separator: `--` — all subsequent tokens are treated as positionals.
 *
 * In most cases you do not need to use `ReaderArgs` directly; it is created internally
 * by {@link runAsCliAndExit}. It is exposed for advanced use cases such as building
 * custom runners.
 */
export class ReaderArgs {
  #args: ReadonlyArray<string>;
  #parsedIndex: number;
  #parsedDouble: boolean;
  #keyByLong: Map<string, ReaderOptionKey>;
  #keyByShort: Map<string, ReaderOptionKey>;
  #valuedByKey: Map<ReaderOptionKey, boolean>;
  #resultByKey: Map<ReaderOptionKey, Array<string>>;

  /**
   * @param args - The raw command-line tokens to parse. Typically `process.argv.slice(2)`.
   *   The array is not modified; a read cursor is maintained internally.
   */
  constructor(args: ReadonlyArray<string>) {
    this.#args = args;
    this.#parsedIndex = 0;
    this.#parsedDouble = false;
    this.#keyByLong = new Map();
    this.#keyByShort = new Map();
    this.#valuedByKey = new Map();
    this.#resultByKey = new Map();
  }

  /**
   * Registers a CLI option so the parser can recognise it.
   *
   * All `longs` and `shorts` are associated with the same returned key. Calling
   * `getOptionValues(key)` after parsing will return values collected under any of the
   * registered names.
   *
   * Short names support stacking (e.g. `-abc` is parsed as `-a -b -c`) and inline
   * values (e.g. `-nvalue`). Short names must not be a prefix of, nor have as a prefix,
   * any other registered short name — the parser uses prefix matching to parse stacked
   * shorts, so overlapping prefixes would be ambiguous.
   *
   * @param definition.longs - Long-form names (without `--`).
   * @param definition.shorts - Short-form names (without `-`).
   * @param definition.valued - `true` if the option consumes a value; `false` for flags.
   * @returns An opaque {@link ReaderOptionKey} to pass to {@link ReaderArgs.getOptionValues}.
   * @throws `Error` if any name is already registered or if two short names overlap.
   */
  registerOption(definition: {
    longs: Array<string>;
    shorts: Array<string>;
    valued: boolean;
  }) {
    const key = [
      ...definition.longs.map((long) => `--${long}`),
      ...definition.shorts.map((short) => `-${short}`),
    ].join(", ") as ReaderOptionKey;
    for (const long of definition.longs) {
      if (this.#keyByLong.has(long)) {
        throw new Error(`Option already registered: --${long}`);
      }
      this.#keyByLong.set(long, key);
    }
    for (const short of definition.shorts) {
      if (this.#keyByShort.has(short)) {
        throw new Error(`Option already registered: -${short}`);
      }
      for (let i = 0; i < short.length; i++) {
        const shortSlice = short.slice(0, i);
        if (this.#keyByShort.has(shortSlice)) {
          throw new Error(
            `Option -${short} overlap with shorter option: -${shortSlice}`,
          );
        }
      }
      for (const shortOther of this.#keyByShort.keys()) {
        if (shortOther.startsWith(short)) {
          throw new Error(
            `Option -${short} overlap with longer option: -${shortOther}`,
          );
        }
      }
      this.#keyByShort.set(short, key);
    }
    this.#valuedByKey.set(key, definition.valued);
    this.#resultByKey.set(key, new Array<string>());
    return key;
  }

  /**
   * Returns all raw string values collected for the given option key.
   *
   * @param key - A key previously returned by {@link ReaderArgs.registerOption}.
   * @returns An array of string values, one per occurrence on the command line. For
   *   flags this will be `["true"]` per occurrence; for valued options it will be the
   *   literal value strings.
   * @throws `Error` if `key` was not registered on this instance.
   */
  getOptionValues(key: ReaderOptionKey): Array<string> {
    const optionResult = this.#resultByKey.get(key);
    if (optionResult === undefined) {
      throw new Error(`Unregistered option: ${key}`);
    }
    return optionResult;
  }

  /**
   * Scans forward through the argument list and returns the next bare positional token,
   * consuming and parsing any intervening option tokens as side-effects.
   *
   * Option tokens encountered during the scan are recorded in the internal results map
   * (equivalent to recording their values against their key). Any unrecognised option token
   * causes a {@link TypoError} to be thrown immediately.
   *
   * After `--` is encountered, all remaining tokens are treated as positionals.
   *
   * @returns The next positional string, or `undefined` when the argument list is
   *   exhausted.
   * @throws {@link TypoError} if an unrecognised option (long or short) is encountered.
   */
  consumePositional(): string | undefined {
    while (true) {
      const arg = this.#consumeArg();
      if (arg === null) {
        return undefined;
      }
      if (this.#processedAsPositional(arg)) {
        return arg;
      }
    }
  }

  #consumeArg(): string | null {
    const arg = this.#args[this.#parsedIndex];
    if (arg === undefined) {
      return null;
    }
    this.#parsedIndex++;
    if (!this.#parsedDouble) {
      if (arg === "--") {
        this.#parsedDouble = true;
        return this.#consumeArg();
      }
    }
    return arg;
  }

  #processedAsPositional(arg: string): boolean {
    if (this.#parsedDouble) {
      return true;
    }
    if (arg.startsWith("--")) {
      const valueIndexStart = arg.indexOf("=");
      if (valueIndexStart === -1) {
        this.#consumeOptionLong(arg.slice(2), null);
      } else {
        this.#consumeOptionLong(
          arg.slice(2, valueIndexStart),
          arg.slice(valueIndexStart + 1),
        );
      }
      return false;
    }
    if (arg.startsWith("-")) {
      let shortIndexStart = 1;
      let shortIndexEnd = 2;
      while (shortIndexEnd <= arg.length) {
        const result = this.#tryConsumeOptionShort(
          arg.slice(shortIndexStart, shortIndexEnd),
          arg.slice(shortIndexEnd),
        );
        if (result === true) {
          return false;
        }
        if (result === false) {
          shortIndexStart = shortIndexEnd;
        }
        shortIndexEnd++;
      }
      throw new TypoError(
        new TypoText(
          new TypoString(`-${arg.slice(shortIndexStart)}`, typoStyleConstants),
          new TypoString(`: Unexpected unknown option`),
        ),
      );
    }
    return true;
  }

  #consumeOptionLong(long: string, direct: string | null): void {
    const constant = `--${long}`;
    const key = this.#keyByLong.get(long);
    if (key !== undefined) {
      if (direct !== null) {
        return this.#acknowledgeOption(key, direct);
      }
      const valued = this.#valuedByKey.get(key);
      if (valued) {
        return this.#acknowledgeOption(key, this.#consumeOptionValue(constant));
      }
      return this.#acknowledgeOption(key, "true");
    }
    throw new TypoError(
      new TypoText(
        new TypoString(constant, typoStyleConstants),
        new TypoString(`: Unexpected unknown option`),
      ),
    );
  }

  #tryConsumeOptionShort(short: string, rest: string): boolean | null {
    const key = this.#keyByShort.get(short);
    if (key !== undefined) {
      if (rest.startsWith("=")) {
        this.#acknowledgeOption(key, rest.slice(1));
        return true;
      }
      const valued = this.#valuedByKey.get(key);
      if (valued) {
        if (rest === "") {
          this.#acknowledgeOption(key, this.#consumeOptionValue(`-${short}`));
        } else {
          this.#acknowledgeOption(key, rest);
        }
        return true;
      }
      this.#acknowledgeOption(key, "true");
      return rest === "";
    }
    return null;
  }

  #consumeOptionValue(constant: string) {
    const arg = this.#consumeArg();
    if (arg === null) {
      throw new TypoError(
        new TypoText(
          new TypoString(constant, typoStyleConstants),
          new TypoString(`: Requires a value, but got end of input`),
        ),
      );
    }
    if (this.#parsedDouble) {
      throw new TypoError(
        new TypoText(
          new TypoString(constant, typoStyleConstants),
          new TypoString(`: Requires a value before `),
          new TypoString(`"--"`, typoStyleQuote),
        ),
      );
    }
    // TODO - is that weird, could a valid value start with dash ?
    if (arg.startsWith("-")) {
      throw new TypoError(
        new TypoText(
          new TypoString(constant, typoStyleConstants),
          new TypoString(`: Requires a value, but got: `),
          new TypoString(`"${arg}"`, typoStyleQuote),
        ),
      );
    }
    return arg;
  }

  #acknowledgeOption(key: ReaderOptionKey, value: string) {
    this.getOptionValues(key).push(value);
  }
}
