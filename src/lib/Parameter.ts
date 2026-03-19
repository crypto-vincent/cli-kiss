import { ReaderPositionals } from "./Reader";
import { Type, typeDecode } from "./Type";

export type Parameter<Value> = {
  generateUsage(): ParameterUsage;
  consumePositionals(readerPositionals: ReaderPositionals): Value;
};

export type ParameterUsage = {
  description: string | undefined;
  label: Uppercase<string>;
};

export function parameterRequired<Value>(definition: {
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Parameter<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `<${label}>` as Uppercase<string>,
      };
    },
    consumePositionals(readerArgs: ReaderPositionals) {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        throw new Error(`Missing required parameter: ${label}`);
      }
      return typeDecode(definition.type, positional, label);
    },
  };
}

export function parameterOptional<Value>(definition: {
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Parameter<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `[${label}]` as Uppercase<string>,
      };
    },
    consumePositionals(readerArgs: ReaderPositionals) {
      const positional = readerArgs.consumePositional();
      if (positional === undefined) {
        try {
          return definition.default();
        } catch (error) {
          throw new Error(
            `Error computing default value for parameter ${label}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      return typeDecode(definition.type, positional, label);
    },
  };
}

export function parameterVariadics<Value>(definition: {
  endDelimiter?: string;
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Parameter<Array<Value>> {
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
    consumePositionals(readerArgs: ReaderPositionals) {
      const parameter: Array<Value> = [];
      while (true) {
        const positional = readerArgs.consumePositional();
        if (
          positional === undefined ||
          positional === definition.endDelimiter
        ) {
          break;
        }
        parameter.push(typeDecode(definition.type, positional, label));
      }
      return parameter;
    },
  };
}
