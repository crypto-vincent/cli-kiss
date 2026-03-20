import { ReaderPositionals } from "./Reader";
import { Type, typeDecodeWithContext } from "./Type";
import { TypoError, TypoString, typoStyleUserInput, TypoText } from "./Typo";

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
  const label = `<${definition.label ?? definition.type.label}>`;
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
      return typeDecodeWithContext(
        definition.type,
        positional,
        makeDecodeContext(label),
      );
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
  const label = `[${definition.label ?? definition.type.label}]`;
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
      return typeDecodeWithContext(
        definition.type,
        positional,
        makeDecodeContext(label),
      );
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
  const label = `[${definition.label ?? definition.type.label}]`;
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
        positionals.push(
          typeDecodeWithContext(
            definition.type,
            positional,
            makeDecodeContext(label),
          ),
        );
      }
      return positionals;
    },
  };
}

function makeDecodeContext(label: string): () => TypoText {
  return () => new TypoText(new TypoString(label, typoStyleUserInput));
}
