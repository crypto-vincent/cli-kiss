import { TypoError, TypoString, typoStyleConstants, TypoText } from "./Typo";

export type ReaderOptionKey = (string | { __brand: "ReaderOptionKey" }) & {
  __brand: "ReaderOptionKey";
};

export type ReaderOptions = {
  registerOption(definition: {
    longs: Array<string>;
    shorts: Array<string>;
    valued: boolean;
  }): ReaderOptionKey;
  getOptionValues(key: ReaderOptionKey): Array<string>;
};

export type ReaderPositionals = {
  consumePositional(): string | undefined;
};

export class ReaderArgs {
  #args: ReadonlyArray<string>;
  #parsedIndex: number;
  #parsedDouble: boolean;
  #keyByLong: Map<string, ReaderOptionKey>;
  #keyByShort: Map<string, ReaderOptionKey>;
  #valuedByKey: Map<ReaderOptionKey, boolean>;
  #resultByKey: Map<ReaderOptionKey, Array<string>>;

  constructor(args: ReadonlyArray<string>) {
    this.#args = args;
    this.#parsedIndex = 0;
    this.#parsedDouble = false;
    this.#keyByLong = new Map();
    this.#keyByShort = new Map();
    this.#valuedByKey = new Map();
    this.#resultByKey = new Map();
  }

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
            `Option -${short} can overlap with a shorter option: -${shortSlice}`,
          );
        }
      }
      for (const shortOther of this.#keyByShort.keys()) {
        if (shortOther.startsWith(short)) {
          throw new Error(
            `Option -${short} can overlap with a longer option: -${shortOther}`,
          );
        }
      }
      this.#keyByShort.set(short, key);
    }
    this.#valuedByKey.set(key, definition.valued);
    this.#resultByKey.set(key, new Array<string>());
    return key;
  }

  getOptionValues(key: ReaderOptionKey): Array<string> {
    const optionResult = this.#resultByKey.get(key);
    if (optionResult === undefined) {
      throw new Error(`Unregistered option: ${key}`);
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
      throw new TypoError(
        new TypoText(
          new TypoString(`Unknown option `),
          new TypoString(`-${arg.slice(shortIndexStart)}`, typoStyleConstants),
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
        new TypoString(`Unknown option `),
        new TypoString(constant, typoStyleConstants),
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
          new TypoString(`Option `),
          new TypoString(constant, typoStyleConstants),
          new TypoString(` requires a value but none was provided`),
        ),
      );
    }
    if (this.#parsedDouble) {
      throw new TypoError(
        new TypoText(
          new TypoString(`Option `),
          new TypoString(constant, typoStyleConstants),
          new TypoString(` requires a value before "--"`),
        ),
      );
    }
    // TODO - is that weird, could a valid value start with dash ?
    if (arg.startsWith("-")) {
      throw new TypoError(
        new TypoText(
          new TypoString(`Option `),
          new TypoString(constant, typoStyleConstants),
          new TypoString(` requires a value, but got: "${arg}"`),
        ),
      );
    }
    return arg;
  }

  #acknowledgeOption(key: ReaderOptionKey, value: string) {
    this.getOptionValues(key).push(value);
  }
}
