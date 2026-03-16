import { Reader, ReaderPositional } from "./Reader";

export type Command<Context, Result> = {
  prepare: (reader: Reader) => (context: Context) => Promise<Result>;
};

export type CommandFlag = {
  prepare: (reader: Reader) => () => boolean;
};

export type CommandOption<Value> = {
  prepare: (reader: Reader) => () => Value;
};

export type CommandArg<Value> = {
  read: (readerPositional: ReaderPositional) => Value;
};

export type CommandVariadics<Value> = {
  read: (readerPositional: ReaderPositional) => Value;
};

// TODO - better types definitions for all factory cases at least

export function commandWithFixedArgs<
  Context,
  Result,
  Flags extends { [flag: string]: CommandFlag },
  Options extends { [option: string]: CommandOption<any> },
  const Args extends Array<CommandArg<any>>,
>(definition: {
  flags: Flags;
  options: Options;
  args: Args;
  handler: (
    context: Context,
    inputs: {
      flags: {
        [K in keyof Flags]: ReturnType<ReturnType<Flags[K]["prepare"]>>;
      };
      options: {
        [K in keyof Options]: ReturnType<ReturnType<Options[K]["prepare"]>>;
      };
      args: {
        [K in keyof Args]: ReturnType<Args[K]["read"]>;
      }; // TODO - type aliases for those
    },
  ) => Promise<Result>;
}): Command<Context, Result> {
  return {
    prepare: (reader: Reader) => {
      const flagsRunners: any = {};
      if (definition.flags) {
        for (const flagKey in definition.flags) {
          const flagDef = definition.flags[flagKey]!;
          flagsRunners[flagKey] = flagDef.prepare(reader);
        }
      }
      const optionsRunners: any = {};
      if (definition.options) {
        for (const optionKey in definition.options) {
          const optionDef = definition.options[optionKey]!;
          optionsRunners[optionKey] = optionDef.prepare(reader);
        }
      }
      const argsValues: any = [];
      if (definition.args) {
        for (const argDef of definition.args) {
          argsValues.push(argDef.read(reader));
        }
      }
      const lastPositional = reader.consumePositional();
      if (lastPositional !== undefined) {
        throw Error(`Unprocessed positional: ${lastPositional}`);
      }
      return async (context: Context) => {
        const flagsValues: any = {};
        for (const flagKey in flagsRunners) {
          const flagRunner = flagsRunners[flagKey]!;
          flagsValues[flagKey] = flagRunner();
        }
        const optionsValues: any = {};
        for (const optionKey in optionsRunners) {
          const optionRunner = optionsRunners[optionKey]!;
          optionsValues[optionKey] = optionRunner();
        }
        return await definition.handler(context, {
          flags: flagsValues,
          options: optionsValues,
          args: argsValues,
        });
      };
    },
  };
}

export function commandWithVariadics<
  Context,
  Result,
  Flags extends { [flag: string]: CommandFlag },
  Options extends { [option: string]: CommandOption<any> },
  const Args extends Array<CommandArg<any>>,
  Variadics,
>(definition: {
  flags: Flags;
  options: Options;
  args: Args;
  variadics: CommandVariadics<Variadics>;
  handler: (
    context: Context,
    inputs: {
      flags: {
        [K in keyof Flags]: ReturnType<ReturnType<Flags[K]["prepare"]>>;
      };
      options: {
        [K in keyof Options]: ReturnType<ReturnType<Options[K]["prepare"]>>;
      };
      args: {
        [K in keyof Args]: ReturnType<Args[K]["read"]>;
      }; // TODO - type aliases for those
      variadics: Variadics;
    },
  ) => Promise<Result>;
}): Command<Context, Result> {
  return {
    prepare: (reader: Reader) => {
      const flagsRunners: any = {};
      if (definition.flags) {
        for (const flagKey in definition.flags) {
          const flagDef = definition.flags[flagKey]!;
          flagsRunners[flagKey] = flagDef.prepare(reader);
        }
      }
      const optionsRunners: any = {};
      if (definition.options) {
        for (const optionKey in definition.options) {
          const optionDef = definition.options[optionKey]!;
          optionsRunners[optionKey] = optionDef.prepare(reader);
        }
      }
      const argsValues: any = [];
      if (definition.args) {
        for (const argDef of definition.args) {
          argsValues.push(argDef.read(reader));
        }
      }
      const variadicsValue = definition.variadics.read(reader);
      const lastPositional = reader.consumePositional();
      if (lastPositional !== undefined) {
        throw Error(`Unprocessed positional: ${lastPositional}`);
      }
      return async (context: Context) => {
        const flagsValues: any = {};
        for (const flagKey in flagsRunners) {
          const flagRunner = flagsRunners[flagKey]!;
          flagsValues[flagKey] = flagRunner();
        }
        const optionsValues: any = {};
        for (const optionKey in optionsRunners) {
          const optionRunner = optionsRunners[optionKey]!;
          optionsValues[optionKey] = optionRunner();
        }
        return await definition.handler(context, {
          flags: flagsValues,
          options: optionsValues,
          args: argsValues,
          variadics: variadicsValue,
        });
      };
    },
  };
}

export function commandWithSubcommand<
  Context,
  Payload,
  Result,
  Flags extends { [flag: string]: CommandFlag },
  Options extends { [option: string]: CommandOption<any> },
  const Args extends Array<CommandArg<any>>,
>(definition: {
  flags: Flags;
  options: Options;
  args: Args;
  handler: (
    context: Context,
    inputs: {
      flags: {
        [K in keyof Flags]: ReturnType<ReturnType<Flags[K]["prepare"]>>;
      };
      options: {
        [K in keyof Options]: ReturnType<ReturnType<Options[K]["prepare"]>>;
      };
      args: {
        [K in keyof Args]: ReturnType<Args[K]["read"]>;
      };
    },
  ) => Promise<Payload>;
  subcommands: { [subcommand: string]: Command<Payload, Result> };
}): Command<Context, Result> {
  return {
    prepare: (reader: Reader) => {
      const flagsRunners: any = {};
      if (definition.flags) {
        for (const flagKey in definition.flags) {
          const flagDef = definition.flags[flagKey]!;
          flagsRunners[flagKey] = flagDef.prepare(reader);
        }
      }
      const optionsRunners: any = {};
      if (definition.options) {
        for (const optionKey in definition.options) {
          const optionDef = definition.options[optionKey]!;
          optionsRunners[optionKey] = optionDef.prepare(reader);
        }
      }
      const argsValues: any = [];
      if (definition.args) {
        for (const argDef of definition.args) {
          argsValues.push(argDef.read(reader));
        }
      }
      const subcommandName = reader.consumePositional();
      if (subcommandName === undefined) {
        throw new Error("Expected a subcommand");
      }
      const subcommandDef = definition.subcommands[subcommandName];
      if (subcommandDef === undefined) {
        throw new Error(`Unknown subcommand: ${subcommandName}`);
      }
      const subcommandRunner = subcommandDef.prepare(reader);
      return async (context: Context) => {
        const flagsValues: any = {};
        for (const flagKey in flagsRunners) {
          const flagRunner = flagsRunners[flagKey];
          flagsValues[flagKey] = flagRunner();
        }
        const optionsValues: any = {};
        for (const optionKey in optionsRunners) {
          const optionRunner = optionsRunners[optionKey];
          optionsValues[optionKey] = optionRunner();
        }
        const payload = await definition.handler(context, {
          flags: flagsValues,
          options: optionsValues,
          args: argsValues,
        });
        return await subcommandRunner(payload);
      };
    },
  };
}
