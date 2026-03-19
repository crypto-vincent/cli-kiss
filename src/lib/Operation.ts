import { Option, OptionUsage } from "./Option";
import { Positional, PositionalUsage } from "./Positional";
import { ReaderArgs } from "./Reader";

export type Operation<Input, Output> = {
  generateUsage(): OperationUsage;
  createRunnerFromArgs(readerArgs: ReaderArgs): OperationRunner<Input, Output>;
};

export type OperationRunner<Input, Output> = {
  executeWithContext(input: Input): Promise<Output>;
};

export type OperationUsage = {
  options: Array<OptionUsage>;
  positionals: Array<PositionalUsage>;
};

export function operation<
  Context,
  Result,
  Options extends { [option: string]: any },
  const Positionals extends Array<any>,
>(
  inputs: {
    options: { [K in keyof Options]: Option<Options[K]> };
    positionals: { [K in keyof Positionals]: Positional<Positionals[K]> };
  },
  handler: (
    context: Context,
    inputs: { options: Options; positionals: Positionals },
  ) => Promise<Result>,
): Operation<Context, Result> {
  return {
    generateUsage() {
      const optionsUsage = new Array<OptionUsage>();
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        if (optionInput) {
          optionsUsage.push(optionInput.generateUsage());
        }
      }
      const positionalsUsage = new Array<PositionalUsage>();
      for (const positionalInput of inputs.positionals) {
        positionalsUsage.push(positionalInput.generateUsage());
      }
      return { options: optionsUsage, positionals: positionalsUsage };
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      const optionsReaders: any = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsReaders[optionKey] = optionInput.createGetter(readerArgs);
      }
      const positionalsValues: any = [];
      for (const positionalInput of inputs.positionals) {
        positionalsValues.push(positionalInput.consumePositionals(readerArgs));
      }
      return {
        executeWithContext(context: Context) {
          const optionsValues: any = {};
          for (const optionKey in optionsReaders) {
            optionsValues[optionKey] = optionsReaders[optionKey]!.readValue();
          }
          return handler(context, {
            options: optionsValues,
            positionals: positionalsValues,
          });
        },
      };
    },
  };
}
