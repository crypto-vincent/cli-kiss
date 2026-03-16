import { Argument } from "./Argument";
import { Option } from "./Option";
import { ReaderTokenizer } from "./Reader";

export type Processor<Context, Result> = {
  prepareFactory: (
    readerTokenizer: ReaderTokenizer,
  ) => () => ProcessorInterpreter<Context, Result>;
};

export type ProcessorInterpreter<Context, Result> = (
  context: Context,
) => Promise<Result>;

export function processor<
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
): Processor<Context, Result> {
  return {
    prepareFactory: (readerTokenizer: ReaderTokenizer) => {
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
