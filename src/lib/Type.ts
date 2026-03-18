export type Type<Value> = {
  label: Uppercase<string>; // TODO - is there a better way to enforce uppercase labels?
  decoder(value: string): Value;
};

export const typeBoolean: Type<boolean> = {
  label: "BOOLEAN",
  decoder(value: string) {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    throw new Error(`Invalid boolean: ${value} (expected: "true"|"false")`);
  },
};

export const typeDate: Type<Date> = {
  label: "DATE",
  decoder(value: string) {
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new Error(`Invalid date: ${value} (expected: ISO_8601 format)`);
    }
    return new Date(timestamp);
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
          `Invalid tuple value: "${value}", expected ${elementTypes.length} comma-separated parts`,
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
      `${elementType.label}[,${elementType.label}...]` as Uppercase<string>,
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
      `Failed to decode value "${value}" for ${context}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
