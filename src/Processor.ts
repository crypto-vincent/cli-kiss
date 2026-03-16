import { Argument, ArgumentUsage } from "./Argument";
import { Option, OptionUsage } from "./Option";
import { ReaderTokenizer } from "./Reader";

export type Processor<Context, Result> = {
  prepareResolver(
    readerTokenizer: ReaderTokenizer,
  ): ProcessorResolver<Context, Result>;
};

export type ProcessorResolver<Context, Result> = () => ProcessorRunner<
  Context,
  Result
>;

export type ProcessorRunner<Context, Result> = {
  computeUsage(): ProcessorUsage;
  execute(context: Context): Promise<Result>;
};

export type ProcessorUsage = {
  options: Array<OptionUsage>;
  arguments: Array<ArgumentUsage>;
};

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
        return {
          computeUsage() {
            const optionsUsage = new Array<OptionUsage>();
            for (const optionKey in inputs.options) {
              const optionInput = inputs.options[optionKey]!;
              // TODO - use values from inputs for usages
              optionsUsage.push(optionInput.generateUsage());
            }
            const argumentsUsage = new Array<ArgumentUsage>();
            for (const argumentInput of inputs.arguments) {
              argumentsUsage.push(argumentInput.generateUsage());
            }
            return { options: optionsUsage, arguments: argumentsUsage };
          },
          async execute(context: Context) {
            return await handler(context, {
              options: optionsValues,
              arguments: argumentsValues,
            });
          },
        };
      };
    },
  };
}
