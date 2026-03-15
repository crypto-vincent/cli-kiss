import { CommandArg } from "./Command";
import { ReaderPositional } from "./Reader";

export function argSingle<Value>(definition: {
  name: string;
  decoder: (value: string) => Value;
}): CommandArg<Value> {
  return {
    read: (readerPositional: ReaderPositional) => {
      const positional = readerPositional.consumePositional();
      if (positional === undefined) {
        throw new Error(`Missing required arg: ${definition.name}`);
      }
      return definition.decoder(positional);
    },
  };
}
