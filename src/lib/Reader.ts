import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleQuote,
  TypoText,
} from "./Typo";

/**
 * Opaque key identifying a registered option within a {@link ReaderArgs} instance.
 * Returned by {@link ReaderArgs.registerOption}; passed to {@link ReaderArgs.getOptionValues}.
 */
export type ReaderOptionKey = (string | { __brand: "ReaderOptionKey" }) & {
  __brand: "ReaderOptionKey";
};

/**
 * Option registration and query interface, implemented by {@link ReaderArgs}.
 * Exposed separately from {@link ReaderPositionals} so parsers depend only on what they need.
 */
export type ReaderOptions = {
  /**
   * Registers an option so the parser can recognise it.
   *
   * @param definition.longs - Long-form names (without `--`).
   * @param definition.shorts - Short-form names (without `-`).
   * @param definition.valued - `true` if the option takes a value; `false` for flags.
   * @returns A {@link ReaderOptionKey} for later retrieval.
   * @throws `Error` if a name is already registered or short names overlap.
   */
  registerOption(definition: {
    longs: Array<string>;
    shorts: Array<string>;
    valued: boolean;
  }): ReaderOptionKey;
  /**
   * Returns all values collected for the option identified by `key`.
   *
   * @param key - Key from {@link ReaderOptions.registerOption}.
   * @returns Raw string values, one per occurrence; empty if never provided.
   * @throws `Error` if `key` was not registered.
   */
  getOptionValues(key: ReaderOptionKey): Array<string>;
};

/**
 * Positional token consumption interface, implemented by {@link ReaderArgs}.
 */
export type ReaderPositionals = {
  /**
   * Returns the next positional token, parsing intervening options as side-effects.
   *
   * @returns The next positional, or `undefined` when exhausted.
   * @throws {@link TypoError} on an unrecognised option.
   */
  consumePositional(): string | undefined;
};

/**
 * Core argument parser: converts raw CLI tokens into named options and positionals.
 * Options must be registered before {@link ReaderArgs.consumePositional} is called.
 *
 * Supported syntax: `--name`, `--name value`, `--name=value`,
 * `-n`, `-n value`, `-nvalue`, `-abc` (stacked), `--` (end-of-options).
 *
 * Created internally by {@link runAndExit}; exposed for advanced / custom runners.
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
   * @param args - Raw CLI tokens (e.g. `process.argv.slice(2)`). Not mutated.
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
   * Registers an option; all `longs` and `shorts` share the same key.
   * Short names support stacking (e.g. `-abc`) and inline values (e.g. `-nvalue`),
   * but must not be prefixes of one another.
   *
   * @param definition.longs - Long-form names (without `--`).
   * @param definition.shorts - Short-form names (without `-`).
   * @param definition.valued - `true` if the option takes a value; `false` for flags.
   * @returns A {@link ReaderOptionKey} for {@link ReaderArgs.getOptionValues}.
   * @throws `Error` if any name is already registered or short names overlap.
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
   * Returns all values collected for the option key.
   * Flags produce `"true"` per occurrence; valued options produce the literal string.
   *
   * @param key - Key from {@link ReaderArgs.registerOption}.
   * @returns String values, one per occurrence.
   * @throws `Error` if `key` was not registered.
   */
  getOptionValues(key: ReaderOptionKey): Array<string> {
    const optionResult = this.#resultByKey.get(key);
    if (optionResult === undefined) {
      throw new Error(`Unregistered option: ${key}`);
    }
    return optionResult;
  }

  /**
   * Returns the next bare positional token, parsing intervening options as side-effects.
   * All tokens after `--` are treated as positionals.
   *
   * @returns The next positional, or `undefined` when exhausted.
   * @throws {@link TypoError} on an unrecognised option.
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
