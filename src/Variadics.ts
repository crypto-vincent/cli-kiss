import { CommandVariadics } from "./Command";
import { ReaderPositional } from "./Reader";

export function variadics<
  const Optionals extends Array<{
    decoder: (value: string | undefined) => any;
  }>,
  Rest,
>(definition: {
  optionals: Optionals;
  rests: { decoder: (value: string) => Rest };
}): CommandVariadics<{
  optionals: { [K in keyof Optionals]: ReturnType<Optionals[K]["decoder"]> };
  rests: Array<Rest>;
}> {
  return {
    read: (readerPositional: ReaderPositional) => {
      const optionalsValues: any = [];
      for (const optional of definition.optionals) {
        optionalsValues.push(
          optional.decoder(readerPositional.consumePositional()),
        );
      }
      const restsValues = new Array<Rest>();
      while (true) {
        const positional = readerPositional.consumePositional();
        if (positional === undefined) {
          break;
        }
        restsValues.push(definition.rests.decoder(positional));
      }
      return { optionals: optionalsValues, rests: restsValues };
    },
  };
}
