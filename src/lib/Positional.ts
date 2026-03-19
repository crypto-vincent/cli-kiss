import { ReaderPositionals } from "./Reader";
import { Type, typeDecode } from "./Type";
import { TypoError, TypoString, typoStyleUserInput, TypoText } from "./Typo";

export type Positional<Value> = {
  generateUsage(): PositionalUsage;
  consumePositionals(readerPositionals: ReaderPositionals): Value;
};

export type PositionalUsage = {
  description: string | undefined;
  label: Uppercase<string>;
};

export function positionalRequired<Value>(definition: {
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Positional<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `<${label}>` as Uppercase<string>,
      };
    },
    consumePositionals(readerPositionals: ReaderPositionals) {
      const positional = readerPositionals.consumePositional();
      if (positional === undefined) {
        throw new TypoError(
          new TypoText(
            new TypoString(`Missing required positional argument: `),
            new TypoString(label, typoStyleUserInput),
          ),
        );
      }
      return typeDecode(
        definition.type,
        positional,
        () => new TypoText(new TypoString(label, typoStyleUserInput)),
      );
    },
  };
}

export function positionalOptional<Value>(definition: {
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Positional<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        label: `[${label}]` as Uppercase<string>,
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
              new TypoString(`Failed to compute default value for: `),
              new TypoString(label, typoStyleUserInput),
            ),
            error,
          );
        }
      }
      return typeDecode(
        definition.type,
        positional,
        () => new TypoText(new TypoString(label, typoStyleUserInput)),
      );
    },
  };
}

export function positionalVariadics<Value>(definition: {
  endDelimiter?: string;
  description?: string;
  label?: Uppercase<string>;
  type: Type<Value>;
}): Positional<Array<Value>> {
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
          typeDecode(
            definition.type,
            positional,
            () => new TypoText(new TypoString(label, typoStyleUserInput)),
          ),
        );
      }
      return positionals;
    },
  };
}
