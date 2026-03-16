import { ReaderPositionals } from "./Reader";
import { Type } from "./Type";

export type Argument<Value> = {
  generateUsage(): ArgumentUsage;
  consumeValue(readerPositionals: ReaderPositionals): Value;
};

export type ArgumentUsage = {
  description: string | undefined;
  label: string;
};

export function argumentRequired<Value>(definition: {
  description?: string;
  type: Type<Value>;
  label?: Uppercase<string>;
}): Argument<Value> {
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `<${definition.label ?? definition.type.label}>`,
      };
    },
    consumeValue(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        throw new Error(
          `Missing required arg: <${definition.label ?? definition.type.label}>`,
        );
      }
      return definition.type.decoder(positional);
    },
  };
}

export function argumentOptional<Value>(definition: {
  description?: string;
  type: Type<Value>;
  label?: Uppercase<string>;
  default: () => Value;
}): Argument<Value> {
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `[${definition.label ?? definition.type.label}]`,
      };
    },
    consumeValue(readerPositionals: ReaderPositionals) {
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
  label?: Uppercase<string>;
  endDelimiter?: string;
}): Argument<Array<Value>> {
  return {
    generateUsage() {
      return {
        description: definition.description,
        label:
          `[${definition.label ?? definition.type.label}...]` +
          (definition.endDelimiter
            ? ` (end with ${definition.endDelimiter})`
            : ""),
      };
    },
    consumeValue(readerPositionals: ReaderPositionals) {
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
