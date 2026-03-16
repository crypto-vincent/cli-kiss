import { CommandOption } from "./Command";
import { Reader } from "./Reader";

export function optionMultipleValues<Value>(definition: {
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
  decoder: (value: string) => Value;
}): CommandOption<Array<Value>> {
  return {
    prepare: (reader: Reader) => {
      const key = definition.long;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      reader.registerOption({ key, longs, shorts });
      return () => {
        return reader.consumeOption(key).map(definition.decoder);
      };
    },
  };
}

export function optionSingleValue<Value>(definition: {
  long: string;
  short?: string;
  aliases?: {
    longs?: Array<string>;
    shorts?: Array<string>;
  };
  decoder: (value: string) => Value;
}): CommandOption<Value> {
  return {
    prepare: (reader: Reader) => {
      const key = definition.long;
      const longs = [definition.long];
      if (definition.aliases?.longs) {
        longs.push(...definition.aliases?.longs);
      }
      const shorts = definition.short ? [definition.short] : [];
      if (definition.aliases?.shorts) {
        shorts.push(...definition.aliases?.shorts);
      }
      reader.registerOption({ key, longs, shorts });
      return () => {
        // TODO - error handling
        const values = reader.consumeOption(definition.long);
        if (values.length > 1) {
          throw new Error("???");
        }
        if (values.length < 1) {
          throw new Error("???");
        }
        return definition.decoder(values[0]!);
      };
    },
  };
}
