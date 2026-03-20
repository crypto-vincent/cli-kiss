import { ReaderPositionals } from "./Reader";
import { Type } from "./Type";
import {
  TypoError,
  TypoString,
  typoStyleLogic,
  typoStyleUserInput,
  TypoText,
} from "./Typo";

export type Positional<Value> = {
  generateUsage(): PositionalUsage;
  consumePositionals(readerPositionals: ReaderPositionals): Value;
};

export type PositionalUsage = {
  description: string | undefined;
  hint: string | undefined;
  label: Uppercase<string>;
};

export function positionalRequired<Value>(definition: {
  description?: string;
  hint?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Positional<Value> {
  const label = `<${definition.label ?? definition.type.content.toUpperCase()}>`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        label: label as Uppercase<string>,
      };
    },
    consumePositionals(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        throw new TypoError(
          new TypoText(
            new TypoString(label, typoStyleUserInput),
            new TypoString(`: Is required, but was not provided`),
          ),
        );
      }
      return decodeValue(label, definition.type, positional);
    },
  };
}

export function positionalOptional<Value>(definition: {
  description?: string;
  hint?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Positional<Value> {
  const label = `[${definition.label ?? definition.type.content.toUpperCase()}]`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        label: label as Uppercase<string>,
      };
    },
    consumePositionals(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        try {
          return definition.default();
        } catch (error) {
          throw new TypoError(
            new TypoText(
              new TypoString(label, typoStyleUserInput),
              new TypoString(`: Failed to get default value`),
            ),
            error,
          );
        }
      }
      return decodeValue(label, definition.type, positional);
    },
  };
}

export function positionalVariadics<Value>(definition: {
  endDelimiter?: string;
  description?: string;
  hint?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Positional<Array<Value>> {
  const label = `[${definition.label ?? definition.type.content.toUpperCase()}]`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        label: (`${label}...` +
          (definition.endDelimiter
            ? `["${definition.endDelimiter}"]`
            : "")) as Uppercase<string>,
      };
    },
    consumePositionals(readerPositionals: ReaderPositionals) {
      const positionals: Array<Value> = [];
      while (true) {
        const positional = readerPositionals.consumePositional();
        if (
          positional === undefined ||
          positional === definition.endDelimiter
        ) {
          break;
        }
        positionals.push(decodeValue(label, definition.type, positional));
      }
      return positionals;
    },
  };
}

function decodeValue<Value>(
  label: string,
  type: Type<Value>,
  value: string,
): Value {
  return TypoError.tryWithContext(
    () => type.decoder(value),
    () =>
      new TypoText(
        new TypoString(label, typoStyleUserInput),
        new TypoString(`: `),
        new TypoString(type.content, typoStyleLogic),
      ),
  );
}
