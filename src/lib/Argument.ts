import { ReaderPositionals } from "./Reader";
import { Type, typeDecode } from "./Type";

export type Argument<Value> = {
  generateUsage(): ArgumentUsage;
  consumeValue(readerPositionals: ReaderPositionals): Value;
};

export type ArgumentUsage = {
  description: string | undefined;
  label: Uppercase<string>;
};

export function argumentRequired<Value>(definition: {
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Argument<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `<${label}>` as Uppercase<string>,
      };
    },
    consumeValue(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        throw new Error(`Missing required argument: ${label}`);
      }
      return typeDecode(definition.type, positional, label);
    },
  };
}

export function argumentOptional<Value>(definition: {
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Argument<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `[${label}]` as Uppercase<string>,
      };
    },
    consumeValue(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        return definition.default();
      }
      return typeDecode(definition.type, positional, label);
    },
  };
}

export function argumentVariadics<Value>(definition: {
  endDelimiter?: string;
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Argument<Array<Value>> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: (`[${label}]...` +
          (definition.endDelimiter
            ? `["${definition.endDelimiter}"]`
            : "")) as Uppercase<string>,
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
        values.push(typeDecode(definition.type, positional, label));
      }
      return values;
    },
  };
}
