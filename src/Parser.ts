import { Command } from ".";
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

export function command<
  Input,
  Output,
  Flags extends { [key: string]: Flag },
  Options extends { [key: string]: Option<any> },
  const Requireds extends Array<Required<any>>,
  const Optionals extends Array<Optional<any>>,
>(
  definitions: {
    flags: Flags;
    options: Options;
    requireds: Requireds;
    optionals: Optionals;
  },
  processor: (
    input: Input,
    args: {
      flags: { [K in keyof Flags]: boolean };
      options: {
        [K in keyof Options]: Awaited<ReturnType<Options[K]["decoder"]>>;
      };
      requireds: {
        [K in keyof Requireds]: Awaited<ReturnType<Requireds[K]["decoder"]>>;
      };
      optionals: {
        [K in keyof Optionals]:
          | undefined
          | Awaited<ReturnType<Optionals[K]["decoder"]>>;
      };
    },
    rest: Reader,
  ) => Promise<Output>,
): Command<Input, Output> {
  return async (reader: Reader, input: Input): Promise<Output> => {
    for (const key in definitions.flags) {
      const flagDef = definitions.flags[key]!;
      reader.registerFlagName(flagDef.long);
    }
    for (const key in definitions.options) {
      const optionDef = definitions.options[key]!;
      reader.registerOptionName(optionDef.long);
    }
    const requireds: {
      [K in keyof Requireds]: Awaited<ReturnType<Requireds[K]["decoder"]>>;
    } = [] as any;
    for (let i = 0; i < definitions.requireds.length; i++) {
      const requiredDef = definitions.requireds[i]!;
      const value = reader.consumePositional();
      if (value === undefined) {
        // TODO - beatiful error message with the command usage
        throw new Error(
          `Missing required positional argument: ${requiredDef.name}`,
        );
      }
      requireds.push(await requiredDef.decoder(value));
    }
    const optionals: {
      [K in keyof Optionals]:
        | undefined
        | Awaited<ReturnType<Optionals[K]["decoder"]>>;
    } = [] as any;
    for (let i = 0; i < definitions.optionals.length; i++) {
      const optionalDef = definitions.optionals[i]!;
      const positionalValue = reader.consumePositional();
      if (positionalValue !== undefined) {
        optionals.push(await optionalDef.decoder(positionalValue));
      } else {
        optionals.push(undefined);
      }
    }
    const flags: { [K in keyof Flags]: boolean } = {} as any;
    for (const key in definitions.flags) {
      const flagDef = definitions.flags[key]!;
      flags[key] = reader.consumeFlag(flagDef.long);
    }
    const options: {
      [K in keyof Options]: Awaited<ReturnType<Options[K]["decoder"]>>;
    } = {} as any;
    for (const key in definitions.options) {
      const optionDef = definitions.options[key]!;
      const optionValue = reader.consumeOption(optionDef.long);
      options[key] = await optionDef.decoder(optionValue);
    }
    return await processor(
      input,
      { flags, options, requireds, optionals },
      reader,
    );
  };
}
