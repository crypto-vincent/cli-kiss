import { Processor } from "./Processor";
import { ReaderTokenizer } from "./Reader";

export type Command<Context, Result> = {
  prepareInterpreter: (
    readerTokenizer: ReaderTokenizer,
  ) => CommandInterpreter<Context, Result>;
};

export type CommandInterpreter<Context, Result> = {
  evaluate: (context: Context) => Promise<Result>;
};

export function command<Context, Result>(
  _description: string, // TODO - use description for help
  processor: Processor<Context, Result>,
): Command<Context, Result> {
  return {
    prepareInterpreter: (readerTokenizer: ReaderTokenizer) => {
      const processorFactory = processor.prepareFactory(readerTokenizer);
      const lastPositional = readerTokenizer.consumePositional();
      if (lastPositional !== undefined) {
        throw Error(`Unprocessed positional: ${lastPositional}`);
      }
      const processorInterpreter = processorFactory();
      return {
        evaluate: async (context: Context) => {
          return await processorInterpreter(context);
        },
      };
    },
  };
}

export function commandWithSubcommands<Context, Payload, Result>(
  _description: string, // TODO - use description for help
  processor: Processor<Context, Payload>,
  subcommands: { [subcommand: string]: Command<Payload, Result> },
): Command<Context, Result> {
  return {
    prepareInterpreter: (readerTokenizer: ReaderTokenizer) => {
      const processorFactory = processor.prepareFactory(readerTokenizer);
      const subcommandName = readerTokenizer.consumePositional();
      if (subcommandName === undefined) {
        throw new Error("Expected a subcommand");
      }
      const subcommandInput = subcommands[subcommandName];
      if (subcommandInput === undefined) {
        throw new Error(`Unknown subcommand: ${subcommandName}`);
      }
      const subcommandInterpreter =
        subcommandInput.prepareInterpreter(readerTokenizer);
      const processorInterpreter = processorFactory();
      return {
        evaluate: async (context: Context) => {
          const payload = await processorInterpreter(context);
          return await subcommandInterpreter.evaluate(payload);
        },
      };
    },
  };
}
