import { Argument, ArgumentUsage } from "./Argument";
import { Option, OptionUsage } from "./Option";
import { ReaderArgs } from "./Reader";

export type Execution<Context, Result> = {
  generateUsage(): ExecutionUsage;
  createInterpreterFactory(
    readerArgs: ReaderArgs,
  ): ExecutionInterpreterFactory<Context, Result>;
};

export type ExecutionInterpreterFactory<Context, Result> = {
  // TODO - could extract arguments and options parsed for usage printing maybe?
  createInterpreterInstance(): ExecutionInterpreterInstance<Context, Result>;
};

export type ExecutionInterpreterInstance<Context, Result> = {
  executeWithContext(context: Context): Promise<Result>;
};

export type ExecutionUsage = {
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
};

export function execution<
  Context,
  Result,
  Options extends { [option: string]: any },
  const Arguments extends Array<any>,
>(
  inputs: {
    options: { [K in keyof Options]: Option<Options[K]> };
    arguments: { [K in keyof Arguments]: Argument<Arguments[K]> };
  },
  handler: (
    context: Context,
    inputs: {
      options: Options;
      arguments: Arguments;
    },
  ) => Promise<Result>,
): Execution<Context, Result> {
  return {
    generateUsage() {
      const optionsUsage = new Array<OptionUsage>();
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        if (optionInput) {
          optionsUsage.push(optionInput.generateUsage());
        }
      }
      const argumentsUsage = new Array<ArgumentUsage>();
      for (const argumentInput of inputs.arguments) {
        argumentsUsage.push(argumentInput.generateUsage());
      }
      return { options: optionsUsage, arguments: argumentsUsage };
    },
    createInterpreterFactory(readerArgs: ReaderArgs) {
      const optionsReaders: any = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsReaders[optionKey] = optionInput.createReader(readerArgs);
      }
      const argumentsValues: any = [];
      for (const argumentInput of inputs.arguments) {
        argumentsValues.push(argumentInput.consumeValue(readerArgs));
      }
      return {
        createInterpreterInstance() {
          const optionsValues: any = {};
          for (const optionKey in optionsReaders) {
            optionsValues[optionKey] = optionsReaders[optionKey]!.readValue();
          }
          return {
            executeWithContext(context: Context) {
              return handler(context, {
                options: optionsValues,
                arguments: argumentsValues,
              });
            },
          };
        },
      };
    },
  };
}
