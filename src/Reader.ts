export class Reader {
  flags: Map<string, boolean> = new Map();
  options: Map<string, string> = new Map();
  positionals: string[] = [];
  positionalIndex = 0;

  constructor(
    flags: Map<string, boolean> = new Map(),
    options: Map<string, string> = new Map(),
    positionals: string[] = [],
  ) {
    this.flags = flags;
    this.options = options;
    this.positionals = positionals;
  }

  getFlag(_name: string): boolean {
    return this.flags.get(_name) || false;
  }
  getOption(_name: string): string | undefined {
    return this.options.get(_name);
  }
  nextPositional(): string | undefined {
    if (this.positionalIndex < this.positionals.length) {
      return this.positionals[this.positionalIndex++];
    }
    return undefined;
  }
}

export type ReaderPositional<Type, Param> = (
  reader: Reader,
  param: Param,
) => Type;
