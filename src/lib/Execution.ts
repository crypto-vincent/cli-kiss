import { Argument, ArgumentUsage } from "./Argument";
import { Option, OptionUsage } from "./Option";
import { ReaderTokenizer } from "./Reader";

export type Execution<Context, Result> = {
  computeUsage(): ExecutionUsage;
  prepareResolver(
    readerTokenizer: ReaderTokenizer,
  ): ExecutionResolver<Context, Result>;
};

export type ExecutionResolver<Context, Result> = () => ExecutionCallback<
  Context,
  Result
>;

export type ExecutionCallback<Context, Result> = (
  context: Context,
) => Promise<Result>;

export type ExecutionUsage = {
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
};

export function execution<
  Context,
  Result,
  Options extends { [option: string]: Option<any> },
  const Arguments extends Array<Argument<any>>,
>(
  inputs: { options: Options; arguments: Arguments },
  handler: (
    context: Context,
    inputs: {
      options: {
        [K in keyof Options]: ReturnType<
          ReturnType<Options[K]["prepareConsumer"]>
        >;
      };
      arguments: {
        [K in keyof Arguments]: ReturnType<Arguments[K]["consumeValue"]>;
      };
    },
  ) => Promise<Result>,
): Execution<Context, Result> {
  return {
    computeUsage() {
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
    prepareResolver(readerTokenizer: ReaderTokenizer) {
      const optionsConsumers: any = {};
      for (const optionKey in inputs.options) {
        const optionInput = inputs.options[optionKey]!;
        optionsConsumers[optionKey] =
          optionInput.prepareConsumer(readerTokenizer);
      }
      const argumentsValues: any = [];
      for (const argumentInput of inputs.arguments) {
        argumentsValues.push(argumentInput.consumeValue(readerTokenizer));
      }
      return () => {
        const optionsValues: any = {};
        for (const optionKey in optionsConsumers) {
          optionsValues[optionKey] = optionsConsumers[optionKey]!();
        }
        return async (context: Context) => {
          return await handler(context, {
            options: optionsValues,
            arguments: argumentsValues,
          });
        };
      };
    },
  };
}
