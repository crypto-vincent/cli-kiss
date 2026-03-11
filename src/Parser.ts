import { Command } from ".";
import { Reader } from "./Reader";

export type Flag = {
  long: string;
};

export type Option<Payload> = {
  long: string;
  decoder: (input: string) => Promise<Payload>;
};

export type Required<Payload> = {
  name: string;
  decoder: (input: string) => Promise<Payload>;
};

export type Optional<Payload> = {
  name: string;
  decoder: (input: string) => Promise<Payload>;
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
    const flags: { [K in keyof Flags]: boolean } = {} as any;
    for (const key in definitions.flags) {
      flags[key] = reader.getFlag(key);
    }
    const options: {
      [K in keyof Options]: Awaited<ReturnType<Options[K]["decoder"]>>;
    } = {} as any;
    for (const key in definitions.options) {
      const optionDef = definitions.options[key]!;
      const optionValue = reader.getOption(optionDef.long);
      if (optionValue !== undefined) {
        // TODO - handle decoding errors
        options[key] = await optionDef.decoder(optionValue);
      }
    }
    const requireds: {
      [K in keyof Requireds]: Awaited<ReturnType<Requireds[K]["decoder"]>>;
    } = [] as any;
    for (let i = 0; i < definitions.requireds.length; i++) {
      const requiredDef = definitions.requireds[i]!;
      const value = reader.nextPositional();
      if (value === undefined) {
        // TODO - handle missing requireds
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
      const positionalValue = reader.nextPositional();
      if (positionalValue !== undefined) {
        optionals.push(await optionalDef.decoder(positionalValue));
      } else {
        optionals.push(undefined);
      }
    }
    return await processor(
      input,
      { flags, options, requireds, optionals },
      reader,
    );
  };
}
