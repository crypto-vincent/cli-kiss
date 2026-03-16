import { CommandFlag } from "./Command";
import { Reader } from "./Reader";

export function flag(definition: {
  long: string;
  short?: string;
  aliases?: { longs?: Array<string>; shorts?: Array<string> };
}): CommandFlag {
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
      reader.registerFlag({ key, longs, shorts });
      return () => {
        return reader.consumeFlag(key);
      };
    },
  };
}
