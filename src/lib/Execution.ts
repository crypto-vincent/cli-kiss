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
        optionsUsage.push(optionInput.generateUsage());
      }
      const argumentsUsage = new Array<ArgumentUsage>();
      for (const argumentInput of inputs.arguments) {
        argumentsUsage.push(argumentInput.generateUsage());
      }
      return { options: optionsUsage, arguments: argumentsUsage };
    },
    createInterpreterFactory(readerArgs: ReaderArgs) {
      const optionsConsumers: any = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsConsumers[optionKey] = optionInput.prepareConsumer(readerArgs);
      }
      const argumentsValues: any = [];
      for (const argumentInput of inputs.arguments) {
        argumentsValues.push(argumentInput.consumeValue(readerArgs));
      }
      return {
        createInterpreterInstance() {
          const optionsValues: any = {};
          for (const optionKey in optionsConsumers) {
            optionsValues[optionKey] = optionsConsumers[optionKey]!();
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
