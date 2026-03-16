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
      function computeUsage(): CommandUsage {
        const processorUsage = processor.computeUsage();
        return {
          description,
          options: processorUsage.options,
          arguments: processorUsage.arguments,
          subcommands: [],
        };
      }
      try {
        const processorResolver = processor.prepareResolver(readerTokenizer);
        const lastPositional = readerTokenizer.consumePositional();
        if (lastPositional !== undefined) {
          throw Error(`Unprocessed positional: ${lastPositional}`);
        }
        const processorRunner = processorResolver();
        return {
          computeUsage,
          async execute(context: Context) {
            return await processorRunner.execute(context);
          },
        };
      } catch (error) {
        return {
          computeUsage,
          async execute(_context: Context) {
            throw error;
          },
        };
      }
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
      try {
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
            const processorUsage = processor.computeUsage();
            const subcommandUsage = subcommandRunner.computeUsage();
            return {
              description: subcommandUsage.description,
              options: processorUsage.options.concat(subcommandUsage.options),
              arguments: processorUsage.arguments.concat(
                subcommandUsage.arguments,
              ),
              subcommands: subcommandUsage.subcommands,
            };
          },
          async execute(context: Context) {
            const payload = await processorRunner.execute(context);
            return await subcommandRunner.execute(payload);
          },
        };
      } catch (error) {
        return {
          computeUsage() {
            const processorUsage = processor.computeUsage();
            return {
              description,
              options: processorUsage.options,
              arguments: processorUsage.arguments,
              subcommands: Object.entries(subcommands).map(
                ([name, subcommand]) => ({
                  name,
                  description: subcommand.getDescription(),
                }),
              ),
            };
          },
          async execute(_context: Context) {
            throw error;
          },
        };
      }
    },
  };
}
