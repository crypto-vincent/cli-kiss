import { ReaderTokenizer } from "./Reader";
import { Type } from "./Type";

export type Option<Value> = {
  generateInfo(): { description: string | undefined };
  prepareConsumer: (readerTokenizer: ReaderTokenizer) => () => Value;
};

export function optionFlag(definition: {
  description?: string;
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
}): Option<boolean> {
  return {
    generateInfo: () => ({
      description: definition.description,
    }),
    prepareConsumer: (readerTokenizer: ReaderTokenizer) => {
      const key = definition.long;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      readerTokenizer.registerFlag({ key, longs, shorts });
      return () => {
        return readerTokenizer.consumeFlag(key);
      };
    },
  };
}

export function optionRepeatable<Value>(definition: {
  description?: string;
  type: Type<Value>;
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  label?: string;
}): Option<Array<Value>> {
  return {
    generateInfo: () => ({
      description: definition.description,
    }),
    prepareConsumer: (readerTokenizer: ReaderTokenizer) => {
      const key = definition.long;
      const longs = definition.long ? [definition.long] : [];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      readerTokenizer.registerOption({ key, longs, shorts });
      return () => {
        return readerTokenizer.consumeOption(key).map(definition.type.decoder);
      };
    },
  };
}

export function optionSingleValue<Value>(definition: {
  description?: string;
  type: Type<Value>;
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  label?: string;
  default: () => Value;
}): Option<Value> {
  return {
    generateInfo: () => ({
      description: definition.description,
    }),
    prepareConsumer: (readerTokenizer: ReaderTokenizer) => {
      const key = definition.long;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      readerTokenizer.registerOption({ key, longs, shorts });
      return () => {
        // TODO - error handling
        const values = readerTokenizer.consumeOption(definition.long);
        if (values.length > 1) {
          throw new Error(
            `Multiple values provided for option: ${definition.long}`,
          );
        }
        const firstValue = values[0];
        if (firstValue === undefined) {
          return definition.default();
        }
        return definition.type.decoder(firstValue);
      };
    },
  };
}
