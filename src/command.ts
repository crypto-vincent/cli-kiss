import { Reader } from "./Reader";

export type Parser<Parsed> = {
  prep: (reader: Reader) => () => Parsed;
};

export type Processor<Context, Inputs, Result> = (
  context: Context,
  inputs: Inputs,
) => Promise<Result>;

export type Continuation<Result, End> = {
  prep: (reader: Reader) => (result: Result) => Promise<End>;
};

export class ContinationSubcommands<Result, End> {
  #subcommands: { [subcommand: string]: Command<Result, any, any, End> };

  constructor(subcommands: {
    [subcommand: string]: Command<Result, any, any, End>;
  }) {
    this.#subcommands = subcommands;
  }

  prep(reader: Reader) {
    const name = reader.consumePositional();
    if (name === undefined) {
      throw new Error("Expected a subcommand");
    }
    const subcommand = this.#subcommands[name];
    if (subcommand === undefined) {
      throw new Error(`Unknown subcommand: ${name}`);
    }
    console.log("Subcommand selected:", name, subcommand);
    const subGen = subcommand.prep(reader);
    return async (result: Result) => {
      return await subGen(result);
    };
  }
}

export class ContinuationRest<Result> {
  prep(reader: Reader) {
    console.log("ContinuationRest.prep");
    const rest = new Array<string>();
    while (true) {
      const arg = reader.consumePositional();
      if (arg === undefined) {
        break;
      }
      rest.push(arg);
    }
    return async (result: Result) => {
      console.log("rest", rest);
      return { result, rest };
    };
  }
}

export class Command<Context, Inputs, Result, End> {
  #parser: Parser<Inputs>;
  #processor: Processor<Context, Inputs, Result>;
  #continuation: Continuation<Result, End>;

  constructor(
    parser: Parser<Inputs>,
    processor: Processor<Context, Inputs, Result>,
    continuation: Continuation<Result, End>,
  ) {
    this.#parser = parser;
    this.#processor = processor;
    this.#continuation = continuation;
  }

  prep(reader: Reader) {
    const genThis = this.#parser.prep(reader);
    const genNext = this.#continuation.prep(reader);
    return async (context: Context) => {
      console.log("Running command with context:", context);
      const inputs = await genThis();
      const result = await this.#processor(context, inputs);
      return await genNext(result);
    };
  }
}
