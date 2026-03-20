import {
  TypoError,
  TypoString,
  typoStyleLogic,
  typoStyleQuote,
  TypoText,
} from "./Typo";

export type Type<Value> = {
  content: string;
  decoder(value: string): Value;
};

export const typeBoolean: Type<boolean> = {
  content: "Boolean",
  decoder(value: string) {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "true" || lowerValue === "yes") {
      return true;
    }
    if (lowerValue === "false" || lowerValue === "no") {
      return false;
    }
    throw new TypoError(
      new TypoText(
        new TypoString(`Invalid value: `),
        new TypoString(`"${value}"`, typoStyleQuote),
      ),
    );
  },
};

export const typeDate: Type<Date> = {
  content: "Date",
  decoder(value: string) {
    try {
      const timestampMs = Date.parse(value);
      if (isNaN(timestampMs)) {
        throw new Error();
      }
      return new Date(timestampMs);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Not a valid ISO_8601: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export const typeNumber: Type<number> = {
  content: "Number",
  decoder(value: string) {
    try {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        throw new Error();
      }
      return parsed;
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export const typeInteger: Type<bigint> = {
  content: "Integer",
  decoder(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export const typeUrl: Type<URL> = {
  content: "Url",
  decoder(value: string) {
    try {
      return new URL(value);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Unable to parse: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export const typeString: Type<string> = {
  content: "String",
  decoder(value: string) {
    return value;
  },
};

export function typeConverted<Before, After>(
  before: Type<Before>,
  after: { content: string; decoder: (value: Before) => After },
): Type<After> {
  return {
    content: after.content,
    decoder: (value: string) => {
      return after.decoder(
        TypoError.tryWithContext(
          () => before.decoder(value),
          () =>
            new TypoText(
              new TypoString("from: "),
              new TypoString(before.content, typoStyleLogic),
            ),
        ),
      );
    },
  };
}

export function typeOneOf(
  content: string,
  values: Array<string>,
): Type<string> {
  const valuesSet = new Set(values);
  return {
    content: content,
    decoder(value: string) {
      if (valuesSet.has(value)) {
        return value;
      }
      const valuesPreview = [];
      for (const value of values) {
        if (valuesPreview.length >= 5) {
          valuesPreview.push(new TypoString(`...`));
          break;
        }
        if (valuesPreview.length > 0) {
          valuesPreview.push(new TypoString(` | `));
        }
        valuesPreview.push(new TypoString(`"${value}"`, typoStyleQuote));
      }
      throw new TypoError(
        new TypoText(
          new TypoString(`Invalid value: `),
          new TypoString(`"${value}"`, typoStyleQuote),
          new TypoString(` (expected one of: `),
          ...valuesPreview,
          new TypoString(`)`),
        ),
      );
    },
  };
}

export function typeTuple<const Elements extends Array<any>>(
  elementTypes: { [K in keyof Elements]: Type<Elements[K]> },
  separator: string = ",",
): Type<Elements> {
  return {
    content: elementTypes
      .map((elementType) => elementType.content)
      .join(separator),
    decoder(value: string) {
      const splits = value.split(separator, elementTypes.length);
      if (splits.length !== elementTypes.length) {
        throw new TypoError(
          new TypoText(
            new TypoString(`Found ${splits.length} splits: `),
            new TypoString(`Expected ${elementTypes.length} splits from: `),
            new TypoString(`"${value}"`, typoStyleQuote),
          ),
        );
      }
      return splits.map((split, index) => {
        const elementType = elementTypes[index]!;
        return TypoError.tryWithContext(
          () => elementType.decoder(split),
          () =>
            new TypoText(
              new TypoString(`at ${index}: `),
              new TypoString(elementType.content, typoStyleLogic),
            ),
        );
      }) as Elements;
    },
  };
}

export function typeList<Value>(
  elementType: Type<Value>,
  separator: string = ",",
): Type<Array<Value>> {
  return {
    content: `${elementType.content}[${separator}${elementType.content}]...`,
    decoder(value: string) {
      const splits = value.split(separator);
      return splits.map((split, index) =>
        TypoError.tryWithContext(
          () => elementType.decoder(split),
          () =>
            new TypoText(
              new TypoString(`at ${index}: `),
              new TypoString(elementType.content, typoStyleLogic),
            ),
        ),
      );
    },
  };
}
