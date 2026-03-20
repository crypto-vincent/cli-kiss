import { ReaderArgs as ReaderOptions } from "./Reader";
import { Type, typeBoolean, typeDecodeWithContext } from "./Type";
import {
  TypoError,
  TypoString,
  typoStyleConstants,
  typoStyleUserInput,
  TypoText,
} from "./Typo";

export type Option<Value> = {
  generateUsage(): OptionUsage;
  createGetter(readerOptions: ReaderOptions): OptionGetter<Value>;
};

export type OptionUsage = {
  description: string | undefined;
  hint: string | undefined;
  long: Lowercase<string>; // TODO - better type for long option names ?
  short: string | undefined;
  label: Uppercase<string> | undefined;
};

export type OptionGetter<Value> = {
  getValue(): Value;
};

export function optionFlag(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  default?: () => boolean;
}): Option<boolean> {
  const label = `<${typeBoolean.label}>`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        long: definition.long,
        short: definition.short,
        label: undefined,
      };
    },
    createGetter(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: false,
      });
      return {
        getValue() {
          const optionValues = readerOptions.getOptionValues(key);
          if (optionValues.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${definition.long}`, typoStyleConstants),
                new TypoString(`: Must not be set multiple times`),
              ),
            );
          }
          const optionValue = optionValues[0];
          if (optionValue === undefined) {
            try {
              return definition.default ? definition.default() : false;
            } catch (error) {
              throw new TypoError(
                new TypoText(
                  new TypoString(`--${definition.long}`, typoStyleConstants),
                  new TypoString(`: Failed to get default value`),
                ),
                error,
              );
            }
          }
          return typeDecodeWithContext(
            typeBoolean,
            optionValue,
            makeDecodeContext(definition.long, label),
          );
        },
      };
    },
  };
}

export function optionSingleValue<Value>(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Option<Value> {
  const label = `<${definition.label ?? definition.type.label}>`;
  return {
    generateUsage() {
      return {
        description: definition.description,
        hint: definition.hint,
        long: definition.long,
        short: definition.short,
        label: label as Uppercase<string>,
      };
    },
    createGetter(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: true,
      });
      return {
        getValue() {
          const optionValues = readerOptions.getOptionValues(key);
          if (optionValues.length > 1) {
            throw new TypoError(
              new TypoText(
                new TypoString(`--${definition.long}`, typoStyleConstants),
                new TypoString(`: Requires a single value, but got multiple`),
              ),
            );
          }
          const optionValue = optionValues[0];
          if (optionValue === undefined) {
            try {
              return definition.default();
            } catch (error) {
              throw new TypoError(
                new TypoText(
                  new TypoString(`--${definition.long}`, typoStyleConstants),
                  new TypoString(`: Failed to get default value`),
                ),
                error,
              );
            }
          }
          return typeDecodeWithContext(
            definition.type,
            optionValue,
            makeDecodeContext(definition.long, label),
          );
        },
      };
    },
  };
}

export function optionRepeatable<Value>(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  hint?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  label?: Uppercase<string>;
  type: Type<Value>;
}): Option<Array<Value>> {
  const label = `<${definition.label ?? definition.type.label}>`;
  return {
    generateUsage() {
      // TODO - showcase that it can be repeated ?
      return {
        description: definition.description,
        hint: definition.hint,
        long: definition.long,
        short: definition.short,
        label: label as Uppercase<string>,
      };
    },
    createGetter(readerOptions: ReaderOptions) {
      const key = registerOption(readerOptions, {
        ...definition,
        valued: true,
      });
      return {
        getValue() {
          return readerOptions
            .getOptionValues(key)
            .map((value) =>
              typeDecodeWithContext(
                definition.type,
                value,
                makeDecodeContext(definition.long, label),
              ),
            );
        },
      };
    },
  };
}

function makeDecodeContext(long: string, label: string): () => TypoText {
  return () =>
    new TypoText(
      new TypoString(`--${long}`, typoStyleConstants),
      new TypoString(`: `),
      new TypoString(label, typoStyleUserInput),
    );
}

function registerOption(
  readerOptions: ReaderOptions,
  definition: {
    long: Lowercase<string>;
    short?: string;
    aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
    valued: boolean;
  },
) {
  const { long, short, aliases, valued } = definition;
  const longs = long ? [long] : [];
  if (aliases?.longs) {
    longs.push(...aliases?.longs);
  }
  const shorts = short ? [short] : [];
  if (aliases?.shorts) {
    shorts.push(...aliases?.shorts);
  }
  return readerOptions.registerOption({ longs, shorts, valued });
}
