export class Stream {
  #argv: Array<string>;
  #registeredFlags: Set<string>;
  #registeredOptions: Set<string>;
  #parsedIndex: number;
  #parsedDouble: boolean;
  #parsedFlags: Map<string, boolean>;
  #parsedOptions: Map<string, string>;

  constructor(argv: Array<string>) {
    if (argv.length < 2) {
      throw new Error("argv must have at least 2 elements (node and script)");
    }
    this.#argv = argv;
    this.#registeredFlags = new Set();
    this.#registeredOptions = new Set();
    this.#parsedIndex = 2;
    this.#parsedDouble = false;
    this.#parsedFlags = new Map();
    this.#parsedOptions = new Map();
  }

  dump() {
    return {
      positionals: this.consumeRestPositionals(),
      parsedIndex: this.#parsedIndex,
      parsedDouble: this.#parsedDouble,
      parsedFlags: this.#parsedFlags,
      parsedOptions: this.#parsedOptions,
    };
  }

  registerFlagName(nameLongOrShort: string) {
    if (this.#registeredFlags.has(nameLongOrShort)) {
      throw new Error(`Flag name already registered: ${nameLongOrShort}`);
    }
    if (this.#registeredOptions.has(nameLongOrShort)) {
      throw new Error(
        `Flag name conflicts with an existing option name: ${nameLongOrShort}`,
      );
    }
    this.#registeredFlags.add(nameLongOrShort);
  }

  registerOptionName(nameLongOrShort: string) {
    if (this.#registeredOptions.has(nameLongOrShort)) {
      throw new Error(`Option name already registered: ${nameLongOrShort}`);
    }
    if (this.#registeredFlags.has(nameLongOrShort)) {
      throw new Error(
        `Option name conflicts with an existing flag name: ${nameLongOrShort}`,
      );
    }
    this.#registeredOptions.add(nameLongOrShort);
  }

  consumeNextPositional(): string | undefined {
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

  private consumeOptionParam(name: string) {
    const arg = this.consumeArg();
    if (arg === null) {
      throw new Error(`Option ${name} requires a value (1)`);
    }
    if (!this.#parsedDouble) {
      if (arg.startsWith("-")) {
        throw new Error(`Option ${name} requires a value (2)`);
      }
    }
    return arg;
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

  private parseAsPositional(arg: string): string | null {
    if (this.#parsedDouble) {
      return arg;
    }
    if (arg.startsWith("--")) {
      const [longName, valueDirect] = splitFirst(arg.slice(2), "=");
      if (this.#registeredFlags.has(`no-${longName}`)) {
        if (valueDirect !== null) {
          throw new Error(
            `Flag with --no- prefix should not have a value: ${longName}`,
          );
        }
        this.#parsedFlags.set(longName, false);
        return null;
      }
      // TODO - support --no- prefix for boolean flags
      if (this.#registeredFlags.has(longName)) {
        if (valueDirect !== null) {
          if (valueDirect === "true") {
            this.#parsedFlags.set(longName, true);
            return null;
          }
          if (valueDirect === "false") {
            this.#parsedFlags.set(longName, false);
            return null;
          }
          throw new Error(
            `Invalid parameter for flag: ${longName}, value: ${valueDirect}`,
          );
        }
        this.#parsedFlags.set(longName, true);
        return null;
      }
      if (this.#registeredOptions.has(longName)) {
        if (valueDirect !== null) {
          this.#parsedOptions.set(longName, valueDirect);
          return null;
        }
        this.#parsedOptions.set(longName, this.consumeOptionParam(longName));
        return null;
      }
      throw new Error(`Unknown flag or option: ${longName}`);
    }
    if (arg.startsWith("-")) {
      for (let shortIndex = 1; shortIndex < arg.length; shortIndex++) {
        const shortName = arg[shortIndex]!;
        this.parseAsShortName(shortName, shortIndex === arg.length - 1);
      }
      return null;
    }
    return arg;
  }

  private parseAsShortName(shortName: string, isLast: boolean) {
    if (this.#registeredFlags.has(shortName)) {
      this.#parsedFlags.set(shortName, true);
      return;
    }
    if (this.#registeredOptions.has(shortName)) {
      if (!isLast) {
        throw new Error(
          `Option ${shortName} requires a value, but is not last in group`,
        );
      }
      this.#parsedOptions.set(shortName, this.consumeOptionParam(shortName));
      return;
    }
    throw new Error(`Unknown flag or option: ${shortName}`);
  }
}

function splitFirst(str: string, delimiter: string): [string, string | null] {
  const index = str.indexOf(delimiter);
  if (index === -1) {
    return [str, null];
  }
  return [str.slice(0, index), str.slice(index + delimiter.length)];
}
