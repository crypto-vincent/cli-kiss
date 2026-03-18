import { ReaderArgs } from "./Reader";
import { Type, typeDecode } from "./Type";

export type Option<Value> = {
  generateUsage(): OptionUsage;
  prepareConsumer(readerArgs: ReaderArgs): OptionConsumer<Value>;
};

export type OptionUsage = {
  description: string | undefined;
  long: Lowercase<string>; // TODO - better type for long option names ?
  short: string | undefined;
  label: Uppercase<string> | undefined;
  // TODO - default value for usage ? but it can be dynamic, so maybe not
};

export type OptionConsumer<Value> = () => Value;

export function optionFlag(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  default?: () => boolean;
}): Option<boolean> {
  return {
    generateUsage() {
      return {
        description: definition.description,
        long: definition.long,
        short: definition.short,
        label: undefined,
      };
    },
    prepareConsumer(readerArgs: ReaderArgs) {
      const key = definition.short
        ? `-${definition.short}, --${definition.long}`
        : `--${definition.long}`;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      readerArgs.registerFlag({ key, longs, shorts });
      return () => {
        const value = readerArgs.consumeFlag(key);
        if (value === undefined) {
          return definition.default ? definition.default() : false;
        }
        return value;
      };
    },
  };
}

export function optionRepeatable<Value>(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  label?: Uppercase<string>;
  type: Type<Value>;
}): Option<Array<Value>> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      // TODO - showcase that it can be repeated ?
      return {
        description: definition.description,
        long: definition.long,
        short: definition.short,
        label: `<${label}>` as Uppercase<string>,
      };
    },
    prepareConsumer(readerArgs: ReaderArgs) {
      const key = definition.short
        ? `-${definition.short}, --${definition.long}`
        : `--${definition.long}`;
      const longs = definition.long ? [definition.long] : [];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      readerArgs.registerOption({ key, longs, shorts });
      return () => {
        return readerArgs
          .consumeOption(key)
          .map((value) =>
            typeDecode(definition.type, value, `${key}: ${label}`),
          );
      };
    },
  };
}

export function optionSingleValue<Value>(definition: {
  long: Lowercase<string>;
  short?: string;
  description?: string;
  aliases?: { longs?: Array<Lowercase<string>>; shorts?: Array<string> };
  label?: Uppercase<string>;
  type: Type<Value>;
  default: () => Value;
}): Option<Value> {
  const label = definition.label ?? definition.type.label;
  return {
    generateUsage() {
      return {
        description: definition.description,
        long: definition.long,
        short: definition.short,
        label: `<${label}>` as Uppercase<string>,
      };
    },
    prepareConsumer(readerArgs: ReaderArgs) {
      const key = definition.short
        ? `-${definition.short}, --${definition.long}`
        : `--${definition.long}`;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      readerArgs.registerOption({ key, longs, shorts });
      return () => {
        const values = readerArgs.consumeOption(key);
        if (values.length > 1) {
          throw new Error(
            `Multiple values provided for option: ${key}, expected only one. Found: ${values.map((v) => `"${v}"`).join(", ")}`,
          );
        }
        const firstValue = values[0];
        if (firstValue === undefined) {
          return definition.default();
        }
        return typeDecode(definition.type, firstValue, `${key}: ${label}`);
      };
    },
  };
}
