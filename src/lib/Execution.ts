import { Option, OptionUsage } from "./Option";
import { Parameter, ParameterUsage } from "./Parameter";
import { ReaderArgs } from "./Reader";

export type Execution<Input, Output> = {
  generateUsage(): ExecutionUsage;
  createRunnerFromArgs(readerArgs: ReaderArgs): ExecutionRunner<Input, Output>;
};

export type ExecutionRunner<Input, Output> = {
  executeWithContext(input: Input): Promise<Output>;
};

export type ExecutionUsage = {
  options: Array<OptionUsage>;
  parameters: Array<ParameterUsage>;
};

export function execution<
  Context,
  Result,
  Options extends { [option: string]: any },
  const Parameters extends Array<any>,
>(
  inputs: {
    options: { [K in keyof Options]: Option<Options[K]> };
    parameters: { [K in keyof Parameters]: Parameter<Parameters[K]> };
  },
  handler: (
    context: Context,
    inputs: { options: Options; parameters: Parameters },
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
      const parametersUsage = new Array<ParameterUsage>();
      for (const parameterInput of inputs.parameters) {
        parametersUsage.push(parameterInput.generateUsage());
      }
      return { options: optionsUsage, parameters: parametersUsage };
    },
    createRunnerFromArgs(readerArgs: ReaderArgs) {
      const optionsReaders: any = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsReaders[optionKey] = optionInput.createReader(readerArgs);
      }
      const parametersValues: any = [];
      for (const parameterInput of inputs.parameters) {
        parametersValues.push(parameterInput.consumePositionals(readerArgs));
      }
      return {
        executeWithContext(context: Context) {
          const optionsValues: any = {};
          for (const optionKey in optionsReaders) {
            optionsValues[optionKey] = optionsReaders[optionKey]!.readValue();
          }
          return handler(context, {
            options: optionsValues,
            parameters: parametersValues,
          });
        },
      };
    },
  };
}
