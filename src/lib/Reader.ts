export type ReaderFlags = {
  readFlag(key: string): boolean | undefined;
};

export type ReaderOptionals = {
  readOption(key: string): Array<string>;
};

export type ReaderPositionals = {
  consumePositional(): string | undefined;
};

export class ReaderArgs {
  #args: ReadonlyArray<string>;

  #parsedIndex: number;
  #parsedDouble: boolean;

  #flagKeyByLong: Map<string, string>;
  #flagKeyByShort: Map<string, string>;
  #flagInfoByKey: Map<string, {}>;
  #flagResultByKey: Map<string, boolean>;

  #optionKeyByLong: Map<string, string>;
  #optionKeyByShort: Map<string, string>;
  #optionInfoByKey: Map<string, {}>; // TODO - what dis for
  #optionResultByKey: Map<string, Array<string>>;

  constructor(args: ReadonlyArray<string>) {
    this.#args = args;

    this.#parsedIndex = 0;
    this.#parsedDouble = false;

    // TODO - this seems like a good candidate for abstraction
    this.#flagKeyByLong = new Map();
    this.#flagKeyByShort = new Map();
    this.#flagInfoByKey = new Map();
    this.#flagResultByKey = new Map();

    this.#optionKeyByLong = new Map();
    this.#optionKeyByShort = new Map();
    this.#optionInfoByKey = new Map();
    this.#optionResultByKey = new Map();
  }

  registerFlag(definition: {
    key: string;
    longs: Array<string>;
    shorts: Array<string>;
  }) {
    for (const long of definition.longs) {
      this.#ensureUniqueLong(long);
      this.#flagKeyByLong.set(long, definition.key);
    }
    for (const short of definition.shorts) {
      this.#ensureUniqueShort(short);
      this.#flagKeyByShort.set(short, definition.key);
    }
    this.#flagInfoByKey.set(definition.key, {});
  }

  registerOption(definition: {
    key: string;
    longs: Array<string>;
    shorts: Array<string>;
  }) {
    for (const long of definition.longs) {
      this.#ensureUniqueLong(long);
      this.#optionKeyByLong.set(long, definition.key);
    }
    for (const short of definition.shorts) {
      this.#ensureUniqueShort(short);
      this.#optionKeyByShort.set(short, definition.key);
    }
    this.#optionInfoByKey.set(definition.key, {});
  }

  readFlag(key: string): boolean | undefined {
    const flagInfo = this.#flagInfoByKey.get(key);
    if (flagInfo === undefined) {
      throw new Error(`Flag not registered: ${key}`);
    }
    const flagResult = this.#flagResultByKey.get(key);
    if (flagResult === undefined) {
      return undefined;
    }
    return flagResult;
  }

  readOption(key: string): Array<string> {
    const optionInfo = this.#optionInfoByKey.get(key);
    if (optionInfo === undefined) {
      throw new Error(`Option not registered: ${key}`);
    }
    const optionResult = this.#optionResultByKey.get(key);
    if (optionResult === undefined) {
      return new Array<string>();
    }
    return optionResult;
  }

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
      const leftovers = arg.slice(shortIndexStart);
      throw new Error(`Unknown flag or option: -${leftovers}`);
    }
    return true;
  }

  #consumeOptionLong(long: string, direct: string | null): void {
    const flagKey = this.#flagKeyByLong.get(long);
    if (flagKey !== undefined) {
      if (direct !== null) {
        const value = booleanValues.get(direct.toLowerCase());
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
    throw new Error(`Unknown flag or option: --${long}`);
  }

  #tryConsumeOptionShort(short: string, rest: string): boolean | null {
    const flagKey = this.#flagKeyByShort.get(short);
    if (flagKey !== undefined) {
      if (rest.startsWith("=")) {
        const value = booleanValues.get(rest.slice(1).toLowerCase());
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

  #consumeOptionValue(key: string) {
    const parameter = this.#consumeArg();
    if (parameter === null) {
      throw new Error(`Option ${key} requires a value but none was provided`);
    }
    if (this.#parsedDouble) {
      throw new Error(`Option ${key} requires a value before "--"`);
    }
    // TODO - is that weird, could a valid value start with dash ?
    if (parameter.startsWith("-")) {
      throw new Error(`Option ${key} requires a value, got: "${parameter}"`);
    }
    return parameter;
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

  #ensureUniqueLong(long: string) {
    const flagKey = this.#flagKeyByLong.get(long);
    if (flagKey !== undefined) {
      throw new Error(`Flag already registered: --${long}`);
    }
    const optionKey = this.#optionKeyByLong.get(long);
    if (optionKey !== undefined) {
      throw new Error(`Option already registered: --${long}`);
    }
  }

  #ensureUniqueShort(short: string) {
    for (let i = 0; i < short.length; i++) {
      const shortSlice = short.slice(0, i);
      const flagKey = this.#flagKeyByShort.get(shortSlice);
      if (flagKey !== undefined) {
        throw new Error(`Flag -${shortSlice} can overlap with -${short}`);
      }
      const optionKey = this.#optionKeyByShort.get(shortSlice);
      if (optionKey !== undefined) {
        throw new Error(`Option -${shortSlice} can overlap with -${short}`);
      }
    }
    for (const [flagShort] of this.#flagKeyByShort) {
      if (flagShort.startsWith(short)) {
        throw new Error(`Flag ${flagShort} can overlap with -${short}`);
      }
    }
    for (const [optionShort] of this.#optionKeyByShort) {
      if (optionShort.startsWith(short)) {
        throw new Error(`Option -${optionShort} can overlap with -${short}`);
      }
    }
  }
}

const booleanValues = new Map<string, boolean>([
  ["true", true],
  ["false", false],
  ["yes", true],
  ["no", false],
  ["t", true],
  ["f", false],
  ["y", true],
  ["n", false],
]);
