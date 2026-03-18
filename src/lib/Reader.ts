export type ReaderPositionals = {
  consumePositional(): string | undefined;
};

export class ReaderTokenizer {
  #parsedArgs: Array<string>;
  #parsedIndex: number;
  #parsedDouble: boolean;

  #flagKeyByShort: Map<string, string>;
  #flagKeyByLong: Map<string, string>;
  #flagInfoByKey: Map<string, {}>;
  #flagResultByKey: Map<string, boolean | null>;

  #optionKeyByShort: Map<string, string>;
  #optionKeyByLong: Map<string, string>;
  #optionInfoByKey: Map<string, {}>; // TODO - what dis for
  #optionResultByKey: Map<string, Array<string> | null>;

  constructor(args: Array<string>) {
    this.#parsedArgs = args;
    this.#parsedIndex = 0;
    this.#parsedDouble = false;

    // TODO - this seems like a good candidate for abstraction
    this.#flagKeyByShort = new Map();
    this.#flagKeyByLong = new Map();
    this.#flagInfoByKey = new Map();
    this.#flagResultByKey = new Map();

    this.#optionKeyByShort = new Map();
    this.#optionKeyByLong = new Map();
    this.#optionInfoByKey = new Map();
    this.#optionResultByKey = new Map();
  }

  registerFlag(definition: {
    key: string;
    shorts: Array<string>;
    longs: Array<string>;
  }) {
    this.#ensureUniqueKey(definition.key);
    this.#flagInfoByKey.set(definition.key, {});
    for (const short of definition.shorts) {
      this.#ensureUniqueName(short);
      this.#flagKeyByShort.set(short, definition.key);
    }
    for (const long of definition.longs) {
      this.#ensureUniqueName(long);
      this.#flagKeyByLong.set(long, definition.key);
    }
  }

  registerOption(definition: {
    key: string;
    shorts: Array<string>;
    longs: Array<string>;
  }) {
    this.#ensureUniqueKey(definition.key);
    this.#optionInfoByKey.set(definition.key, {});
    for (const short of definition.shorts) {
      this.#ensureUniqueName(short);
      this.#optionKeyByShort.set(short, definition.key);
    }
    for (const long of definition.longs) {
      this.#ensureUniqueName(long);
      this.#optionKeyByLong.set(long, definition.key);
    }
  }

  consumeFlag(key: string): boolean | undefined {
    const flagInfo = this.#flagInfoByKey.get(key);
    if (flagInfo === undefined) {
      throw new Error(`Flag not registered: ${key}`);
    }
    const result = this.#flagResultByKey.get(key);
    if (result === undefined) {
      this.#flagResultByKey.set(key, null);
      return undefined;
    }
    if (result === null) {
      throw new Error(`Flag already consumed: ${key}`);
    }
    this.#flagResultByKey.set(key, null);
    return result;
  }

  consumeOption(key: string): Array<string> {
    const optionInfo = this.#optionInfoByKey.get(key);
    if (optionInfo === undefined) {
      throw new Error(`Option not registered: ${key}`);
    }
    const result = this.#optionResultByKey.get(key);
    if (result === undefined) {
      this.#optionResultByKey.set(key, null);
      return new Array<string>();
    }
    if (result === null) {
      throw new Error(`Option already consumed: ${key}`);
    }
    this.#optionResultByKey.set(key, null);
    return result;
  }

  consumePositional(): string | undefined {
    while (true) {
      const arg = this.#consumeArg();
      if (arg === null) {
        return undefined;
      }
      const positional = this.#parseAsPositional(arg);
      if (positional !== null) {
        return positional;
      }
    }
  }

  #consumeArg(): string | null {
    const arg = this.#parsedArgs[this.#parsedIndex];
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

  #consumeOptionValue(key: string) {
    const arg = this.#consumeArg();
    if (arg === null) {
      throw new Error(`Option ${key} requires a value but none was provided`);
    }
    if (this.#parsedDouble) {
      throw new Error(`Option ${key} requires a value before "--"`);
    }
    // TODO - is that weird, could a valid value start with dash ?
    if (arg.startsWith("-")) {
      throw new Error(`Option ${key} requires a value, got: "${arg}"`);
    }
    return arg;
  }

  #parseAsPositional(arg: string): string | null {
    if (this.#parsedDouble) {
      return arg;
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
      return null;
    }
    if (arg.startsWith("-")) {
      let shortIndexStart = 1;
      let shortIndexEnd = 2;
      while (shortIndexEnd <= arg.length) {
        const short = arg.slice(shortIndexStart, shortIndexEnd);
        const rest = arg.slice(shortIndexEnd);
        const result = this.#tryConsumeOptionShort(short, rest);
        if (result === true) {
          return null;
        }
        if (result === false) {
          shortIndexStart = shortIndexEnd;
        }
        shortIndexEnd++;
      }
      throw new Error(
        `Unknown flags or option: -${arg.slice(shortIndexStart)}`,
      );
    }
    return arg;
  }

  #consumeOptionLong(long: string, direct: string | null): void {
    const flagKey = this.#flagKeyByLong.get(long);
    if (flagKey !== undefined) {
      if (direct !== null) {
        const value = asBoolean(direct);
        if (value !== undefined) {
          return this.#acknowledgeFlag(flagKey, value);
        }
        throw new Error(`Invalid value for flag: --${long}: "${direct}"`);
      }
      return this.#acknowledgeFlag(flagKey, true);
    }
    const optionKey = this.#optionKeyByLong.get(long);
    if (optionKey !== undefined) {
      if (direct !== null) {
        return this.#acknowledgeOption(optionKey, direct);
      }
      return this.#acknowledgeOption(
        optionKey,
        this.#consumeOptionValue(`--${long}`),
      );
    }
    throw new Error(`Unknown long flag or option: --${long}`);
  }

  #tryConsumeOptionShort(short: string, rest: string): boolean | null {
    const flagKey = this.#flagKeyByShort.get(short);
    if (flagKey !== undefined) {
      if (rest.startsWith("=")) {
        const value = asBoolean(rest.slice(1));
        if (value !== undefined) {
          this.#acknowledgeFlag(flagKey, value);
          return true;
        }
        throw new Error(`Invalid value for flag: -${short}: "${rest}"`);
      }
      this.#acknowledgeFlag(flagKey, true);
      return rest === "";
    }
    const optionKey = this.#optionKeyByShort.get(short);
    if (optionKey !== undefined) {
      if (rest === "") {
        this.#acknowledgeOption(
          optionKey,
          this.#consumeOptionValue(`-${short}`),
        );
        return true;
      }
      if (rest.startsWith("=")) {
        this.#acknowledgeOption(optionKey, rest.slice(1));
      } else {
        this.#acknowledgeOption(optionKey, rest);
      }
      return true;
    }
    return null;
  }

  #acknowledgeFlag(key: string, value: boolean) {
    if (this.#flagResultByKey.has(key)) {
      throw new Error(`Flag already set: ${key}`);
    }
    this.#flagResultByKey.set(key, value);
  }

  #acknowledgeOption(key: string, value: string) {
    const values = this.#optionResultByKey.get(key) ?? new Array<string>();
    values.push(value);
    this.#optionResultByKey.set(key, values);
  }

  #ensureUniqueKey(key: string) {
    if (this.#flagInfoByKey.has(key)) {
      throw new Error(`Flag already registered: ${key}`);
    }
    if (this.#optionInfoByKey.has(key)) {
      throw new Error(`Option already registered: ${key}`);
    }
  }

  #ensureUniqueName(nameShortOrLong: string) {
    // TODO - overall better error handling
    // TODO - short flag overlap might be annoying here
    if (this.#flagKeyByShort.has(nameShortOrLong)) {
      throw new Error(`Flag already registered: -${nameShortOrLong}`);
    }
    if (this.#flagKeyByLong.has(nameShortOrLong)) {
      throw new Error(`Flag already registered: --${nameShortOrLong}`);
    }
    if (this.#optionKeyByShort.has(nameShortOrLong)) {
      throw new Error(`Option already registered: -${nameShortOrLong}`);
    }
    if (this.#optionKeyByLong.has(nameShortOrLong)) {
      throw new Error(`Option already registered: --${nameShortOrLong}`);
    }
  }
}

function asBoolean(value: string): boolean | undefined {
  const lower = value.toLowerCase();
  if (lower === "true" || lower === "t" || lower === "y" || lower === "yes") {
    return true;
  }
  if (lower === "false" || lower === "f" || lower === "n" || lower === "no") {
    return false;
  }
  return undefined;
}
