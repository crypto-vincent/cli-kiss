import {
  TypoError,
  TypoString,
  typoStyleQuote,
  typoStyleUserInput,
  TypoText,
} from "./Typo";

export type Type<Value> = {
  label: Uppercase<string>; // TODO - is there a better way to enforce uppercase labels?
  decoder(value: string): Value;
};

export const typeBoolean: Type<boolean> = {
  label: "BOOLEAN",
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
        new TypoString(`Invalid boolean: `),
        new TypoString(`"${value}"`, typoStyleQuote),
      ),
    );
  },
};

export const typeDate: Type<Date> = {
  label: "DATE",
  decoder(value: string) {
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new TypoError(
        new TypoText(
          new TypoString(`Invalid date (ISO_8601): `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
    return new Date(timestamp);
  },
};

export const typeUrl: Type<URL> = {
  label: "URL",
  decoder(value: string) {
    try {
      return new URL(value);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Invalid URL: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export const typeString: Type<string> = {
  label: "STRING",
  decoder(value: string) {
    return value;
  },
};

export const typeNumber: Type<number> = {
  label: "NUMBER",
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
          new TypoString(`Invalid number: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export const typeBigInt: Type<bigint> = {
  label: "BIGINT",
  decoder(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new TypoError(
        new TypoText(
          new TypoString(`Invalid integer: `),
          new TypoString(`"${value}"`, typoStyleQuote),
        ),
      );
    }
  },
};

export function typeMapped<Before, After>(
  before: Type<Before>,
  after: {
    label: Uppercase<string>;
    decoder: (value: Before) => After;
  },
): Type<After> {
  return {
    label: after.label,
    decoder: (value: string) => {
      return after.decoder(
        typeDecode(
          before,
          value,
          () => new TypoText(new TypoString(before.label, typoStyleUserInput)),
        ),
      );
    },
  };
}

export function typeOneOf<Value>(
  type: Type<Value>,
  values: Array<Value>,
): Type<Value> {
  const valuesSet = new Set(values);
  return {
    label: type.label,
    decoder(value: string) {
      const decoded = typeDecode(
        type,
        value,
        () => new TypoText(new TypoString(type.label, typoStyleUserInput)),
      );
      if (valuesSet.has(decoded)) {
        return decoded;
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
    label: elementTypes
      .map((elementType) => elementType.label)
      .join(separator) as Uppercase<string>,
    decoder(value: string) {
      const parts = value.split(separator, elementTypes.length);
      if (parts.length !== elementTypes.length) {
        throw new TypoError(
          new TypoText(
            new TypoString(`Invalid tuple: `),
            new TypoString(`"${value}"`, typoStyleQuote),
            new TypoString(` (expected ${elementTypes.length} parts)`),
          ),
        );
      }
      return parts.map((part, index) =>
        typeDecode(
          elementTypes[index]!,
          part,
          () =>
            new TypoText(
              new TypoString(elementTypes[index]!.label, typoStyleUserInput),
              new TypoString(`@${index}`),
            ),
        ),
      ) as Elements;
    },
  };
}

export function typeList<Value>(
  elementType: Type<Value>,
  separator: string = ",",
): Type<Array<Value>> {
  return {
    label:
      `${elementType.label}[${separator}${elementType.label}]...` as Uppercase<string>,
    decoder(value: string) {
      return value
        .split(separator)
        .map((part, index) =>
          typeDecode(
            elementType,
            part,
            () =>
              new TypoText(
                new TypoString(elementType.label, typoStyleUserInput),
                new TypoString(`@${index}`),
              ),
          ),
        );
    },
  };
}

export function typeDecode<Value>(
  type: Type<Value>,
  value: string,
  context: () => TypoText,
): Value {
  try {
    return type.decoder(value);
  } catch (error) {
    throw new TypoError(context(), error);
  }
}
