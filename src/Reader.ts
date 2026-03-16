/**
 * Minimal interface for reading positional arguments from the command line.
 *
 * @remarks
 * This interface is exposed to `CommandArg` and `CommandVariadics` readers so
 * they can consume positional arguments without having access to the full
 * {@link Reader} internals.
 */
export type ReaderPositional = {
  /**
   * Consumes and returns the next positional argument, skipping over any
   * flags or options encountered along the way.
   *
   * @returns The next positional argument string, or `undefined` when no more
   *   positional arguments are available.
   */
  consumePositional(): string | undefined;
};

/**
 * Low-level argv parser that registers flags and options before parsing, then
 * allows callers to consume the parsed results.
 *
 * @remarks
 * The typical lifecycle is:
 * 1. Create a `Reader` with `process.argv`.
 * 2. Register all expected flags via {@link Reader.registerFlag} and options
 *    via {@link Reader.registerOption}.
 * 3. Read positional arguments via {@link Reader.consumePositional}.
 * 4. Consume flag and option results via {@link Reader.consumeFlag} /
 *    {@link Reader.consumeOption}.
 *
 * You rarely need to instantiate `Reader` directly – prefer the higher-level
 * {@link runWithArgv} entry-point instead.
 */
export class Reader {
  #argv: Array<string>;
  #parsedIndex: number;
  #parsedDouble: boolean;

  #flagKeyByShort: Map<string, string>;
  #flagKeyByLong: Map<string, string>;
  #flagInfoByKey: Map<string, {}>;
  #flagResultByKey: Map<string, boolean | null>;

  #optionKeyByShort: Map<string, string>;
  #optionKeyByLong: Map<string, string>;
  #optionInfoByKey: Map<string, {}>; // TODO - what dis
  #optionResultByKey: Map<string, Array<string> | null>;

  /**
   * Creates a new `Reader` for the given `argv` array.
   *
   * @param argv - The raw argument vector, typically `process.argv`. Must
   *   contain at least two elements (the Node.js executable path and the
   *   script path); parsing starts at index 2.
   * @throws {Error} If `argv` has fewer than 2 elements.
   */
  constructor(argv: Array<string>) {
    if (argv.length < 2) {
      throw new Error("argv must have at least 2 elements (node and script)");
    }
    this.#argv = argv;
    this.#parsedIndex = 2;
    this.#parsedDouble = false;

    this.#flagKeyByShort = new Map();
    this.#flagKeyByLong = new Map();
    this.#flagInfoByKey = new Map();
    this.#flagResultByKey = new Map();

    this.#optionKeyByShort = new Map();
    this.#optionKeyByLong = new Map();
    this.#optionInfoByKey = new Map();
    this.#optionResultByKey = new Map();
  }

  /**
   * Asserts that no flag or option has already been registered under the given
   * key.
   *
   * @param key - The unique key to check.
   * @throws {Error} If a flag or option with the same key is already
   *   registered.
   */
  ensureUniqueKey(key: string) {
    if (this.#flagInfoByKey.has(key)) {
      throw new Error(`Option already registered: ${key}`);
    }
    if (this.#optionInfoByKey.has(key)) {
      throw new Error(`Option already registered: ${key}`);
    }
  }

  /**
   * Asserts that the given short or long name is not already in use by any
   * registered flag or option.
   *
   * @param nameShortOrLong - The short (e.g. `"v"`) or long (e.g.
   *   `"verbose"`) name to check.
   * @throws {Error} If the name conflicts with an existing registration.
   */
  ensureUniqueName(nameShortOrLong: string) {
    // TODO - overall better error handling
    // TODO - short flag overlap might be annoying here
    if (this.#flagKeyByShort.has(nameShortOrLong)) {
      throw new Error(`Option already registered: ${nameShortOrLong}`);
    }
    if (this.#flagKeyByLong.has(nameShortOrLong)) {
      throw new Error(`Option already registered: ${nameShortOrLong}`);
    }
    if (this.#optionKeyByShort.has(nameShortOrLong)) {
      throw new Error(`Option already registered: ${nameShortOrLong}`);
    }
    if (this.#optionKeyByLong.has(nameShortOrLong)) {
      throw new Error(`Option already registered: ${nameShortOrLong}`);
    }
  }

  /**
   * Registers a boolean flag so the parser recognises it during positional
   * consumption.
   *
   * @param definition - Descriptor for the flag to register.
   * @param definition.key - Unique internal key used to look up the parsed
   *   result via {@link Reader.consumeFlag}.
   * @param definition.shorts - Short single-character names (e.g. `["v"]` for
   *   `-v`).
   * @param definition.longs - Long names (e.g. `["verbose"]` for `--verbose`).
   * @throws {Error} If the key or any name is already in use.
   */
  registerFlag(definition: {
    key: string;
    shorts: Array<string>;
    longs: Array<string>;
  }) {
    this.ensureUniqueKey(definition.key);
    this.#flagInfoByKey.set(definition.key, {});
    for (const short of definition.shorts) {
      this.ensureUniqueName(short);
      this.#flagKeyByShort.set(short, definition.key);
    }
    for (const long of definition.longs) {
      this.ensureUniqueName(long);
      this.#flagKeyByLong.set(long, definition.key);
    }
  }

  /**
   * Registers a named option so the parser recognises it and collects its
   * value(s) during positional consumption.
   *
   * @param definition - Descriptor for the option to register.
   * @param definition.key - Unique internal key used to look up parsed values
   *   via {@link Reader.consumeOption}.
   * @param definition.shorts - Short single-character names (e.g. `["o"]` for
   *   `-o value`).
   * @param definition.longs - Long names (e.g. `["output"]` for
   *   `--output value`).
   * @throws {Error} If the key or any name is already in use.
   */
  registerOption(definition: {
    key: string;
    shorts: Array<string>;
    longs: Array<string>;
  }) {
    this.ensureUniqueKey(definition.key);
    this.#optionInfoByKey.set(definition.key, {});
    for (const short of definition.shorts) {
      this.ensureUniqueName(short);
      this.#optionKeyByShort.set(short, definition.key);
    }
    for (const long of definition.longs) {
      this.ensureUniqueName(long);
      this.#optionKeyByLong.set(long, definition.key);
    }
  }

  /**
   * Returns the boolean value parsed for the flag registered under `key` and
   * marks it as consumed so it cannot be read a second time.
   *
   * @remarks
   * If the flag was not present on the command line the method returns `false`.
   * Call this method only once per flag per parse cycle; a second call on the
   * same key throws.
   *
   * @param key - The unique key the flag was registered with.
   * @returns `true` if the flag was set, `false` if it was absent.
   * @throws {Error} If no flag is registered under `key`.
   * @throws {Error} If the flag has already been consumed.
   */
  consumeFlag(key: string): boolean {
    const flagInfo = this.#flagInfoByKey.get(key);
    if (flagInfo === undefined) {
      throw new Error(`Option flag not registered: ${key}`);
    }
    const result = this.#flagResultByKey.get(key);
    if (result === undefined) {
      this.#flagResultByKey.set(key, null);
      return false;
    }
    if (result === null) {
      throw new Error(`Option flag already consumed: ${key}`);
    }
    this.#flagResultByKey.set(key, null);
    return result;
  }

  /**
   * Returns all values parsed for the option registered under `key` and marks
   * it as consumed so it cannot be read a second time.
   *
   * @remarks
   * If the option was not present on the command line an empty array is
   * returned. Call this method only once per option per parse cycle; a second
   * call on the same key throws.
   *
   * @param key - The unique key the option was registered with.
   * @returns An array of raw string values supplied for the option (may be
   *   empty if the option was not provided).
   * @throws {Error} If no option is registered under `key`.
   * @throws {Error} If the option has already been consumed.
   */
  consumeOption(key: string): Array<string> {
    const optionInfo = this.#optionInfoByKey.get(key);
    if (optionInfo === undefined) {
      throw new Error(`Option values not registered: ${key}`);
    }
    const result = this.#optionResultByKey.get(key);
    if (result === undefined) {
      this.#optionResultByKey.set(key, null);
      return new Array<string>();
    }
    if (result === null) {
      throw new Error(`Option values already consumed: ${key}`);
    }
    this.#optionResultByKey.set(key, null);
    return result;
  }

  /**
   * Advances through the argv array, skipping any flags or options, and
   * returns the next bare positional argument.
   *
   * @remarks
   * Flags and option key-value pairs encountered while scanning are handled
   * internally and stored for later retrieval via {@link Reader.consumeFlag}
   * and {@link Reader.consumeOption}. Arguments appearing after a bare `--`
   * separator are always treated as positional.
   *
   * @returns The next positional argument string, or `undefined` when there
   *   are no more positional arguments.
   */
  consumePositional(): string | undefined {
    while (true) {
      const arg = this.consumeArg();
      if (arg === null) {
        return undefined;
      }
      const positional = this.parseAsPositional(arg);
      if (positional !== null) {
        return positional;
      }
    }
  }

  private consumeArg(): string | null {
    const arg = this.#argv[this.#parsedIndex];
    if (arg === undefined) {
      return null;
    }
    this.#parsedIndex++;
    if (!this.#parsedDouble) {
      if (arg === "--") {
        this.#parsedDouble = true;
        return this.consumeArg();
      }
    }
    return arg;
  }

  private consumeOptionValue(name: string) {
    const arg = this.consumeArg();
    if (arg === null) {
      throw new Error(`Option ${name} requires a value`);
    }
    if (this.#parsedDouble) {
      throw new Error(`Option ${name} requires a value before --`);
    }
    // TODO - is that weird, could a valid value start with dash ?
    if (arg.startsWith("-")) {
      throw new Error(`Option ${name} requires a value, got: ${arg}`);
    }
    return arg;
  }

  private parseAsPositional(arg: string): string | null {
    if (this.#parsedDouble) {
      return arg;
    }
    if (arg.startsWith("--")) {
      const valueIndexStart = arg.indexOf("=");
      if (valueIndexStart === -1) {
        this.consumeOptionLong(arg.slice(2), null);
      } else {
        this.consumeOptionLong(
          arg.slice(2, valueIndexStart),
          arg.slice(valueIndexStart + 1),
        );
      }
      return null;
    }
    if (arg.startsWith("-")) {
      let shortIndexStart = 1;
      let shortIndexEnd = 2;
      while (shortIndexEnd <= arg.length) {
        const short = arg.slice(shortIndexStart, shortIndexEnd);
        const rest = arg.slice(shortIndexEnd);
        const result = this.tryConsumeOptionShort(short, rest);
        if (result === true) {
          return null;
        }
        if (result === false) {
          shortIndexStart = shortIndexEnd;
        }
        shortIndexEnd++;
      }
      throw new Error(
        `Unknown short flags or options: ${arg.slice(shortIndexStart)}`,
      );
    }
    return arg;
  }

  private consumeOptionLong(long: string, direct: string | null): void {
    const flagKey = this.#flagKeyByLong.get(long);
    if (flagKey !== undefined) {
      if (direct !== null) {
        if (direct === "true") {
          return this.acknowledgeFlag(flagKey, true);
        }
        if (direct === "false") {
          return this.acknowledgeFlag(flagKey, false);
        }
        throw new Error(
          `Invalid parameter for long flag: ${flagKey}, value: ${direct}`,
        );
      }
      return this.acknowledgeFlag(flagKey, true);
    }
    const optionKey = this.#optionKeyByLong.get(long);
    if (optionKey !== undefined) {
      if (direct !== null) {
        return this.acknowledgeOption(optionKey, direct);
      }
      return this.acknowledgeOption(optionKey, this.consumeOptionValue(long));
    }
    throw new Error(`Unknown long flag or option: ${long}`);
  }

  private tryConsumeOptionShort(short: string, rest: string): boolean | null {
    const flagKey = this.#flagKeyByShort.get(short);
    if (flagKey !== undefined) {
      if (rest.startsWith("=")) {
        if (rest === "=true") {
          this.acknowledgeFlag(flagKey, true);
          return true;
        }
        if (rest === "=false") {
          this.acknowledgeFlag(flagKey, false);
          return true;
        }
        throw new Error(
          `Invalid parameter for short flag: ${short}, value: ${rest}`,
        );
      }
      this.acknowledgeFlag(flagKey, true);
      return rest === "";
    }
    const optionKey = this.#optionKeyByShort.get(short);
    if (optionKey !== undefined) {
      if (rest === "") {
        this.acknowledgeOption(optionKey, this.consumeOptionValue(short));
        return true;
      }
      if (rest.startsWith("=")) {
        this.acknowledgeOption(optionKey, rest.slice(1));
      } else {
        this.acknowledgeOption(optionKey, rest);
      }
      return true;
    }
    return null;
  }

  private acknowledgeFlag(key: string, value: boolean) {
    if (this.#flagResultByKey.has(key)) {
      throw new Error(`Flag already set: ${key}`);
    }
    this.#flagResultByKey.set(key, value);
  }

  private acknowledgeOption(key: string, value: string) {
    const values = this.#optionResultByKey.get(key) ?? new Array<string>();
    values.push(value);
    this.#optionResultByKey.set(key, values);
  }
}
