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
 * Parsing behaviour for a registered option, passed to {@link ReaderArgs.registerOption}.
 */
export type ReaderOptionParsing = {
  consumeShortGroup: boolean;
  consumeNextArg: (
    inlined: string | null,
    separated: Array<string>,
    next: string | undefined,
  ) => boolean;
};

/**
 * Result of parsing an option, including its inlined value and any following separated values.
 */
export type ReaderOptionValue = {
  inlined: string | null;
  separated: Array<string>;
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
   * @param definition.parsing - Parsing behaviour.
   * @returns A {@link ReaderOptionKey} for later retrieval.
   * @throws `Error` if a name is already registered or short names overlap.
   */
  registerOption(definition: {
    longs: Array<string>;
    shorts: Array<string>;
    parsing: ReaderOptionParsing;
  }): ReaderOptionKey;
  getOptionValues(key: ReaderOptionKey): Array<ReaderOptionValue>;
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
  #optionContextByLong: Map<string, ReaderOptionContext>;
  #optionContextByShort: Map<string, ReaderOptionContext>;
  #optionContextByKey: Map<ReaderOptionKey, ReaderOptionContext>;

  /**
   * @param args - Raw CLI tokens (e.g. `process.argv.slice(2)`). Not mutated.
   */
  constructor(args: ReadonlyArray<string>) {
    this.#args = args;
    this.#parsedIndex = 0;
    this.#parsedDouble = false;
    this.#optionContextByLong = new Map();
    this.#optionContextByShort = new Map();
    this.#optionContextByKey = new Map();
  }

  /**
   * Registers an option; all `longs` and `shorts` share the same key.
   * Short names support stacking (e.g. `-abc`) and inline values (e.g. `-nvalue`),
   * but must not be prefixes of one another.
   *
   * @param definition.longs - Long-form names (without `--`).
   * @param definition.shorts - Short-form names (without `-`).
   * @param definition.parsing - Parsing behaviour.
   * @returns A {@link ReaderOptionKey} for {@link ReaderArgs.getOptionValues}.
   * @throws `Error` if any name is already registered or short names overlap.
   */
  registerOption(definition: {
    longs: Array<string>;
    shorts: Array<string>;
    parsing: ReaderOptionParsing;
  }) {
    const key = [
      ...definition.longs.map((long) => `--${long}`),
      ...definition.shorts.map((short) => `-${short}`),
    ].join(", ") as ReaderOptionKey;
    for (const long of definition.longs) {
      if (!this.#isValidOptionName(long)) {
        throw new Error(`Invalid option name: --${long}`);
      }
      if (this.#optionContextByLong.has(long)) {
        throw new Error(`Option already registered: --${long}`);
      }
    }
    for (const short of definition.shorts) {
      if (!this.#isValidOptionName(short)) {
        throw new Error(`Invalid option name: -${short}`);
      }
      if (this.#optionContextByShort.has(short)) {
        throw new Error(`Option already registered: -${short}`);
      }
      for (let i = 0; i < short.length; i++) {
        const shortSlice = short.slice(0, i);
        if (this.#optionContextByShort.has(shortSlice)) {
          throw new Error(
            `Option -${short} overlap with shorter option: -${shortSlice}`,
          );
        }
      }
      for (const shortOther of this.#optionContextByShort.keys()) {
        if (shortOther.startsWith(short)) {
          throw new Error(
            `Option -${short} overlap with longer option: -${shortOther}`,
          );
        }
      }
    }
    const optionContext = {
      parsing: definition.parsing,
      results: new Array<ReaderOptionValue>(),
    };
    for (const long of definition.longs) {
      this.#optionContextByLong.set(long, optionContext);
    }
    for (const short of definition.shorts) {
      this.#optionContextByShort.set(short, optionContext);
    }
    this.#optionContextByKey.set(key, optionContext);
    return key;
  }

  /**
   * Returns all values collected for the option key.
   *
   * @param key - Key from {@link ReaderArgs.registerOption}.
   * @returns String values, one per occurrence.
   * @throws `Error` if `key` was not registered.
   */
  getOptionValues(key: ReaderOptionKey): Array<ReaderOptionValue> {
    const optionContext = this.#optionContextByKey.get(key);
    if (optionContext === undefined) {
      throw new Error(`Unregistered option: ${key}`);
    }
    return optionContext.results;
  }

  /**
   * Returns the next bare positional token.
   * Parse intervening options as side-effects.
   * All tokens after `--` are treated as positionals.
   *
   * @returns The next positional, or `undefined` when exhausted.
   * @throws {@link TypoError} on an unrecognised option.
   */
  consumePositional(): string | undefined {
    while (true) {
      const arg = this.#consumeArg();
      if (arg === undefined) {
        return undefined;
      }
      if (!this.#tryConsumeAsOption(arg)) {
        return arg;
      }
    }
  }

  #consumeArg(): string | undefined {
    const arg = this.#args[this.#parsedIndex];
    if (arg === undefined) {
      return undefined;
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

  #tryConsumeAsOption(arg: string): boolean {
    if (this.#parsedDouble) {
      return false;
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
      return true;
    }
    if (arg.startsWith("-")) {
      let shortIndexStart = 1;
      let shortIndexEnd = 2;
      while (shortIndexEnd <= arg.length) {
        const short = arg.slice(shortIndexStart, shortIndexEnd);
        const optionContext = this.#optionContextByShort.get(short);
        if (optionContext !== undefined) {
          const rest = arg.slice(shortIndexEnd);
          if (this.#tryConsumeOptionShort(optionContext, short, rest)) {
            return true;
          }
          shortIndexStart = shortIndexEnd;
        }
        shortIndexEnd++;
      }
      throw new TypoError(
        new TypoText(
          new TypoString(`Unexpected unknown option(s): `),
          new TypoString(`-${arg.slice(shortIndexStart)}`, typoStyleQuote),
        ),
      );
    }
    return false;
  }

  #consumeOptionLong(long: string, inlined: string | null): void {
    const constant = `--${long}`;
    const optionContext = this.#optionContextByLong.get(long);
    if (optionContext !== undefined) {
      return this.#consumeOptionValues(optionContext, constant, inlined);
    }
    throw new TypoError(
      new TypoText(
        new TypoString(`Unexpected unknown option: `),
        new TypoString(constant, typoStyleQuote),
      ),
    );
  }

  #tryConsumeOptionShort(
    optionContext: ReaderOptionContext,
    short: string,
    rest: string,
  ): boolean {
    const constant = `-${short}`;
    if (rest.startsWith("=")) {
      this.#consumeOptionValues(optionContext, constant, rest.slice(1));
      return true;
    }
    if (rest.length === 0) {
      this.#consumeOptionValues(optionContext, constant, null);
      return true;
    }
    if (optionContext.parsing.consumeShortGroup) {
      this.#consumeOptionValues(optionContext, constant, rest);
      return true;
    }
    this.#consumeOptionValues(optionContext, constant, null);
    return false;
  }

  #consumeOptionValues(
    optionContext: ReaderOptionContext,
    constant: string,
    inlined: string | null,
  ) {
    const separated = new Array<string>();
    while (
      optionContext.parsing.consumeNextArg(
        inlined,
        separated,
        this.#args[this.#parsedIndex],
      )
    ) {
      separated.push(this.#consumeOptionValue(constant));
    }
    optionContext.results.push({ inlined, separated });
  }

  #consumeOptionValue(constant: string): string {
    const arg = this.#consumeArg();
    if (arg === undefined) {
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

  #isValidOptionName(name: string): boolean {
    return name.length > 0 && !name.includes("=");
  }
}

type ReaderOptionContext = {
  parsing: ReaderOptionParsing;
  results: Array<ReaderOptionValue>;
};
