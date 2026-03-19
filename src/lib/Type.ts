export type Type<Value> = {
  // TODO - maybe include an optional hint ??
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
    throw new Error(
      `Invalid value: "${value}" (expected: "true"|"false"|"yes"|"no")`,
    );
  },
};

export const typeDate: Type<Date> = {
  label: "DATE",
  decoder(value: string) {
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new Error(
        `Invalid value: "${value}" (expected: ISO_8601 date format)`,
      );
    }
    return new Date(timestamp);
  },
};

export const typeUrl: Type<URL> = {
  label: "URL",
  decoder(value: string) {
    return new URL(value);
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
    return Number(value);
  },
};

export const typeBigInt: Type<bigint> = {
  label: "BIGINT",
  decoder(value: string) {
    return BigInt(value);
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
      return after.decoder(typeDecode(before, value, `from ${before.label}`));
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
      const decoded = typeDecode(type, value, `from ${type.label}`);
      if (valuesSet.has(decoded)) {
        return decoded;
      }
      const valuesDesc = values.map((v) => `"${v}"`).join("|");
      throw new Error(`Invalid value: "${value}" (expected: ${valuesDesc})`);
    },
  };
}

export function typeCommaTuple<
  const Elements extends Array<any>,
>(elementTypes: {
  [K in keyof Elements]: Type<Elements[K]>;
}): Type<Elements> {
  return {
    label: elementTypes
      .map((elementType) => elementType.label)
      .join(",") as Uppercase<string>,
    decoder(value: string) {
      const parts = value.split(",", elementTypes.length);
      if (parts.length !== elementTypes.length) {
        throw new Error(
          // TODO - colored errors ?
          `Invalid value: "${value}" (expected: ${elementTypes.length} comma-separated parts)`,
        );
      }
      return parts.map((part, index) =>
        typeDecode(
          elementTypes[index]!,
          part,
          `[${index}].${elementTypes[index]!.label}`,
        ),
      ) as Elements;
    },
  };
}

export function typeCommaList<Value>(
  elementType: Type<Value>,
): Type<Array<Value>> {
  return {
    label:
      `${elementType.label}[,${elementType.label}]...` as Uppercase<string>,
    decoder(value: string) {
      return value
        .split(",")
        .map((part, index) =>
          typeDecode(elementType, part, `[${index}].${elementType.label}`),
        );
    },
  };
}

export function typeDecode<Value>(
  type: Type<Value>,
  value: string,
  context: string,
): Value {
  try {
    return type.decoder(value);
  } catch (error) {
    throw new Error(
      `${context}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
