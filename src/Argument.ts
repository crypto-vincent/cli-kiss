import { ReaderPositionals } from "./Reader";
import { Type } from "./Type";

export type Argument<Value> = {
  generateInfo(): {
    description: string | undefined;
  };
  consumeValue: (readerPositionals: ReaderPositionals) => Value;
};

export function argumentRequired<Value>(definition: {
  description?: string;
  type: Type<Value>;
  name: string;
}): Argument<Value> {
  return {
    generateInfo: () => ({
      description: definition.description,
    }),
    consumeValue: (readerPositionals: ReaderPositionals) => {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        throw new Error(`Missing required arg: ${definition.name}`);
      }
      return definition.type.decoder(positional);
    },
  };
}

export function argumentOptional<Value>(definition: {
  description?: string;
  type: Type<Value>;
  name: string;
  default: () => Value;
}): Argument<Value> {
  return {
    generateInfo: () => ({
      description: definition.description,
    }),
    consumeValue: (readerPositionals: ReaderPositionals) => {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        return definition.default();
      }
      return definition.type.decoder(positional);
    },
  };
}

export function argumentVariadics<Value>(definition: {
  description?: string;
  type: Type<Value>;
  name: string;
  endDelimiter?: string;
}): Argument<Array<Value>> {
  return {
    generateInfo: () => ({
      description: definition.description,
    }),
    consumeValue: (readerPositionals: ReaderPositionals) => {
      const values: Array<Value> = [];
      while (true) {
        const positional = readerPositionals.consumePositional();
        if (
          positional === undefined ||
          positional === definition.endDelimiter
        ) {
          break;
        }
        values.push(definition.type.decoder(positional));
      }
      return values;
    },
  };
}
