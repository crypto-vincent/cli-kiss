import { Reader } from "./Reader";

export type Flag = {
  long: string;
};

export type Option<Content> = {
  long: string;
  decoder: (arg: string | undefined) => Content;
};

export type Required<Content> = {
  name: string;
  decoder: (arg: string) => Content;
};

export type Optional<Content> = {
  name: string;
  decoder: (arg: string | undefined) => Content;
};

export class Parser<
  Inputs,
  Flags extends { [key: string]: Flag },
  Options extends { [key: string]: Option<any> },
  const Requireds extends Array<Required<any>>,
  const Optionals extends Array<Optional<any>>,
> {
  #flags: Flags;
  #options: Options;
  #requireds: Requireds;
  #optionals: Optionals;
  #packer: (args: {
    flags: { [K in keyof Flags]: boolean };
    options: { [K in keyof Options]: ReturnType<Options[K]["decoder"]> };
    requireds: { [K in keyof Requireds]: ReturnType<Requireds[K]["decoder"]> };
    optionals: { [K in keyof Optionals]: ReturnType<Optionals[K]["decoder"]> };
  }) => Inputs;

  constructor(
    args: {
      flags: Flags;
      options: Options;
      requireds: Requireds;
      optionals: Optionals;
    },
    packer: (args: {
      flags: { [K in keyof Flags]: boolean };
      options: { [K in keyof Options]: ReturnType<Options[K]["decoder"]> };
      requireds: {
        [K in keyof Requireds]: ReturnType<Requireds[K]["decoder"]>;
      };
      optionals: {
        [K in keyof Optionals]: ReturnType<Optionals[K]["decoder"]>;
      };
    }) => Inputs,
  ) {
    this.#flags = args.flags;
    this.#options = args.options;
    this.#requireds = args.requireds;
    this.#optionals = args.optionals;
    this.#packer = packer;
  }

  prep(reader: Reader) {
    for (const key in this.#flags) {
      const flagDef = this.#flags[key]!;
      reader.registerFlagName(flagDef.long);
    }
    for (const key in this.#options) {
      const optionDef = this.#options[key]!;
      reader.registerOptionName(optionDef.long);
    }

    const requireds: {
      [K in keyof Requireds]: ReturnType<Requireds[K]["decoder"]>;
    } = [] as any;
    for (let i = 0; i < this.#requireds.length; i++) {
      const requiredDef = this.#requireds[i]!;
      const value = reader.consumePositional();
      if (value === undefined) {
        // TODO - beatiful error message with the command usage
        throw new Error(
          `Missing required positional argument: ${requiredDef.name}`,
        );
      }
      requireds.push(requiredDef.decoder(value));
    }
    const optionals: {
      [K in keyof Optionals]: ReturnType<Optionals[K]["decoder"]>;
    } = [] as any;
    for (let i = 0; i < this.#optionals.length; i++) {
      const optionalDef = this.#optionals[i]!;
      const positionalValue = reader.consumePositional();
      optionals.push(optionalDef.decoder(positionalValue));
    }

    return () => {
      const flags: {
        [K in keyof Flags]: boolean;
      } = {} as any;
      for (const key in this.#flags) {
        const flagDef = this.#flags[key]!;
        flags[key] = reader.consumeFlag(flagDef.long);
      }
      const options: {
        [K in keyof Options]: ReturnType<Options[K]["decoder"]>;
      } = {} as any;
      for (const key in this.#options) {
        const optionDef = this.#options[key]!;
        const optionValue = reader.consumeOption(optionDef.long);
        options[key] = optionDef.decoder(optionValue);
      }

      return this.#packer({
        flags,
        options,
        requireds,
        optionals,
      });
    };
  }
}
