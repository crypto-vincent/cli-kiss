import { Reader, ReaderPositional } from "./Reader";

/**
 * A fully-assembled CLI command that knows how to parse a {@link Reader} and
 * then execute asynchronous logic against a caller-supplied `Context`.
 *
 * @typeParam Context - Arbitrary application context passed through to the
 *   command handler (e.g. dependency-injection container, config object).
 * @typeParam Result - The value produced by the command handler.
 *
 * @remarks
 * Use the factory functions {@link commandWithFixedArgs},
 * {@link commandWithVariadics}, or {@link commandWithSubcommand} to create
 * `Command` instances. Pass the resulting value to {@link runWithArgv} to
 * execute it.
 */
export type Command<Context, Result> = {
  prepare: (reader: Reader) => (context: Context) => Promise<Result>;
};

/**
 * A boolean command-line flag definition (e.g. `--verbose`, `-v`).
 *
 * @remarks
 * Create instances with the {@link flag} factory function. Pass them inside
 * the `flags` map when constructing a command.
 */
export type CommandFlag = {
  prepare: (reader: Reader) => () => boolean;
};

/**
 * A named option that carries an associated value (e.g. `--output file`,
 * `-o file`).
 *
 * @typeParam Value - The decoded type of the option's value(s).
 *
 * @remarks
 * Create instances with {@link optionSingleValue} (exactly one value) or
 * {@link optionMultipleValues} (zero or more values). Pass them inside the
 * `options` map when constructing a command.
 */
export type CommandOption<Value> = {
  prepare: (reader: Reader) => () => Value;
};

/**
 * A single required positional argument definition.
 *
 * @typeParam Value - The decoded type of the argument.
 *
 * @remarks
 * Create instances with the {@link argSingle} factory function. Pass them
 * inside the `args` tuple when constructing a command.
 */
export type CommandArg<Value> = {
  read: (readerPositional: ReaderPositional) => Value;
};

/**
 * A variadic positional arguments definition that captures optional and rest
 * positional arguments after the fixed `args`.
 *
 * @typeParam Value - The decoded type produced by reading variadic arguments
 *   (typically `{ optionals: [...], rests: [...] }`).
 *
 * @remarks
 * Create instances with the {@link variadics} factory function. Pass the
 * result as the `variadics` property when constructing a command with
 * {@link commandWithVariadics}.
 */
export type CommandVariadics<Value> = {
  read: (readerPositional: ReaderPositional) => Value;
};

// TODO - better types definitions for all factory cases at least

/**
 * Creates a {@link Command} that accepts a fixed set of positional arguments
 * together with any number of flags and named options.
 *
 * @remarks
 * All positional arguments declared in `args` are consumed in order during the
 * prepare phase. Any extra positional argument that remains after consuming the
 * declared ones causes an error.
 *
 * @typeParam Context - Arbitrary application context forwarded to the handler.
 * @typeParam Result - Value returned by the handler.
 * @typeParam Flags - Map of flag keys to {@link CommandFlag} definitions.
 * @typeParam Options - Map of option keys to {@link CommandOption} definitions.
 * @typeParam Args - Tuple of {@link CommandArg} definitions for positional
 *   arguments.
 *
 * @param definition - Command definition object.
 * @param definition.flags - Map of flag definitions keyed by their logical
 *   name.
 * @param definition.options - Map of option definitions keyed by their logical
 *   name.
 * @param definition.args - Ordered tuple of positional argument definitions.
 * @param definition.handler - Async function called with the parsed `context`
 *   and `inputs` when the command runs.
 *
 * @returns A {@link Command} ready to be passed to {@link runWithArgv}.
 *
 * @throws {Error} If an unrecognised positional argument remains after all
 *   declared args have been consumed.
 *
 * @example
 * ```ts
 * const cmd = commandWithFixedArgs({
 *   flags: { verbose: flag({ long: "verbose", short: "v" }) },
 *   options: { output: optionSingleValue({ long: "output", short: "o", decoder: String }) },
 *   args: [argSingle({ name: "file", decoder: String })],
 *   handler: async (ctx, { flags, options, args }) => {
 *     console.log(`file=${args[0]}, output=${options.output}, verbose=${flags.verbose}`);
 *   },
 * });
 * ```
 */
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

/**
 * Creates a {@link Command} that accepts a fixed set of positional arguments
 * followed by variadic (optional + rest) positional arguments, together with
 * any number of flags and named options.
 *
 * @remarks
 * After consuming all fixed `args`, the variadic reader consumes any remaining
 * positionals according to its own `optionals` / `rests` configuration (see
 * {@link variadics}).
 *
 * @typeParam Context - Arbitrary application context forwarded to the handler.
 * @typeParam Result - Value returned by the handler.
 * @typeParam Flags - Map of flag keys to {@link CommandFlag} definitions.
 * @typeParam Options - Map of option keys to {@link CommandOption} definitions.
 * @typeParam Args - Tuple of {@link CommandArg} definitions for fixed
 *   positional arguments.
 * @typeParam Variadics - The decoded type produced by the variadic reader.
 *
 * @param definition - Command definition object.
 * @param definition.flags - Map of flag definitions keyed by their logical
 *   name.
 * @param definition.options - Map of option definitions keyed by their logical
 *   name.
 * @param definition.args - Ordered tuple of fixed positional argument
 *   definitions.
 * @param definition.variadics - Variadic argument definition created with
 *   {@link variadics}.
 * @param definition.handler - Async function called with the parsed `context`
 *   and `inputs` (including `variadics`) when the command runs.
 *
 * @returns A {@link Command} ready to be passed to {@link runWithArgv}.
 *
 * @example
 * ```ts
 * const cmd = commandWithVariadics({
 *   flags: {},
 *   options: {},
 *   args: [argSingle({ name: "first", decoder: String })],
 *   variadics: variadics({
 *     optionals: [{ decoder: (v) => v }],
 *     rests: { decoder: String },
 *   }),
 *   handler: async (ctx, { args, variadics }) => {
 *     console.log(args[0], variadics.optionals[0], variadics.rests);
 *   },
 * });
 * ```
 */
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

/**
 * Creates a {@link Command} that first processes its own flags, options, and
 * fixed args, then dispatches to one of several named subcommands.
 *
 * @remarks
 * The next positional argument after the fixed `args` is used as the
 * subcommand name. The handler is called first to produce a `Payload` (which
 * becomes the `Context` for the selected subcommand), and then the matched
 * subcommand runner is invoked with that payload.
 *
 * @typeParam Context - Arbitrary application context forwarded to this
 *   command's handler.
 * @typeParam Payload - The value produced by this command's handler and used
 *   as the context for the dispatched subcommand.
 * @typeParam Result - Value returned by the subcommand handler.
 * @typeParam Flags - Map of flag keys to {@link CommandFlag} definitions.
 * @typeParam Options - Map of option keys to {@link CommandOption} definitions.
 * @typeParam Args - Tuple of {@link CommandArg} definitions for positional
 *   arguments consumed before subcommand dispatch.
 *
 * @param definition - Command definition object.
 * @param definition.flags - Map of flag definitions keyed by their logical
 *   name.
 * @param definition.options - Map of option definitions keyed by their logical
 *   name.
 * @param definition.args - Ordered tuple of positional argument definitions
 *   consumed before the subcommand name.
 * @param definition.handler - Async function called with the parsed `context`
 *   and `inputs`; its return value becomes the subcommand's context
 *   (`Payload`).
 * @param definition.subcommands - Map of {@link Command} instances keyed by
 *   their subcommand name string.
 *
 * @returns A {@link Command} ready to be passed to {@link runWithArgv}.
 *
 * @throws {Error} If no subcommand name is found in the positional arguments.
 * @throws {Error} If the subcommand name does not match any key in
 *   `definition.subcommands`.
 *
 * @example
 * ```ts
 * const cli = commandWithSubcommand({
 *   flags: {},
 *   options: {},
 *   args: [],
 *   handler: async (ctx) => ({ appCtx: ctx }),
 *   subcommands: {
 *     build: commandWithFixedArgs({ ... }),
 *     test:  commandWithFixedArgs({ ... }),
 *   },
 * });
 * ```
 */
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
