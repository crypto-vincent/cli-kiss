import { ArgumentUsage } from "./Argument";
import { OptionUsage } from "./Option";
import { Processor } from "./Processor";
import { ReaderTokenizer } from "./Reader";

export type Command<Context, Result> = {
  getDescription(): string | undefined;
  prepareRunner(
    readerTokenizer: ReaderTokenizer,
  ): CommandRunner<Context, Result>;
};

export type CommandRunner<Context, Result> = {
  computeUsage(): CommandUsage;
  execute(context: Context): Promise<Result>;
};

export type CommandUsage = {
  description: string | undefined;
  // TODO - parsed values
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
  subcommands: Array<{
    name: string;
    description: string | undefined;
  }>;
};

export function command<Context, Result>(
  description: string,
  processor: Processor<Context, Result>,
): Command<Context, Result> {
  return {
    getDescription() {
      return description;
    },
    prepareRunner(readerTokenizer: ReaderTokenizer) {
      const processorResolver = processor.prepareResolver(readerTokenizer);
      const lastPositional = readerTokenizer.consumePositional();
      if (lastPositional !== undefined) {
        throw Error(`Unprocessed positional: ${lastPositional}`);
      }
      const processorRunner = processorResolver();
      return {
        computeUsage() {
          const processorUsage = processorRunner.computeUsage();
          return {
            description,
            options: processorUsage.options,
            arguments: processorUsage.arguments,
            subcommands: [],
          };
        },
        async execute(context: Context) {
          return await processorRunner.execute(context);
        },
      };
    },
  };
}

export function commandWithSubcommands<Context, Payload, Result>(
  description: string,
  processor: Processor<Context, Payload>,
  subcommands: { [subcommand: string]: Command<Payload, Result> },
): Command<Context, Result> {
  return {
    getDescription() {
      return description;
    },
    prepareRunner(readerTokenizer: ReaderTokenizer) {
      const processorResolver = processor.prepareResolver(readerTokenizer);
      const subcommandName = readerTokenizer.consumePositional();
      if (subcommandName === undefined) {
        throw new Error("Expected a subcommand");
      }
      const subcommandInput = subcommands[subcommandName];
      if (subcommandInput === undefined) {
        throw new Error(`Unknown subcommand: ${subcommandName}`);
      }
      const subcommandRunner = subcommandInput.prepareRunner(readerTokenizer);
      const processorRunner = processorResolver();
      return {
        computeUsage() {
          const processorUsage = processorRunner.computeUsage();
          const subcommandUsage = subcommandRunner.computeUsage();
          const combinedUsage: CommandUsage = {
            description:
              "combined: " + description + " - " + subcommandUsage.description,
            options: processorUsage.options.concat(subcommandUsage.options),
            arguments: processorUsage.arguments.concat(
              subcommandUsage.arguments,
            ),
            subcommands: [], // TODO - how ?
          };
          // TODO - handle subcommands usage
          return combinedUsage;
        },
        async execute(context: Context) {
          const payload = await processorRunner.execute(context);
          return await subcommandRunner.execute(payload);
        },
      };
    },
  };
}

export function commandUsageToString(commandUsage: CommandUsage): string {
  console.warn(commandUsage);
  let result = "";
  if (commandUsage.description) {
    result += commandUsage.description + "\n\n";
  }
  if (commandUsage.arguments.length > 0) {
    result += "Arguments:\n";
    for (const arg of commandUsage.arguments) {
      result += `  ${arg.label}`;
      if (arg.description) {
        result += `\t${arg.description}`;
      }
      result += "\n";
    }
    result += "\n";
  }
  if (commandUsage.options.length > 0) {
    result += "Options:\n";
    for (const option of commandUsage.options) {
      if (option.short) {
        result += ` -${option.short}`;
      }
      result += `\t--${option.long}`;
      if (option.value) {
        result += ` ${option.value}`;
      }
      if (option.description) {
        result += `\t${option.description}`;
      }
      result += "\n";
    }
    result += "\n";
  }
  if (commandUsage.subcommands.length > 0) {
    result += "Subcommands:\n";
    for (const subcommand of commandUsage.subcommands) {
      result += `  ${subcommand.name}`;
      if (subcommand.description) {
        result += `\t${subcommand.description}`;
      }
      result += "\n";
    }
    result += "\n";
  }
  return result;
}
