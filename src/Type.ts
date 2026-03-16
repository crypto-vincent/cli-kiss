export type Type<Value> = {
  label: string;
  decoder(value: string): Value;
};

export const typeBoolean = {
  label: "Boolean",
  decoder(value: string) {
    if (value === "true") {
      return true;
    }
    if (value === "false") {
      return false;
    }
    throw new Error(`Invalid boolean value: ${value}`);
  },
};

export const typeDate = {
  label: "Date",
  decoder(value: string) {
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return new Date(timestamp);
  },
};

export const typeString = {
  label: "String",
  decoder(value: string) {
    return value;
  },
};

export const typeNumber = {
  label: "Number",
  decoder(value: string) {
    return Number(value);
  },
};

export const typeBigInt = {
  label: "BigInt",
  decoder(value: string) {
    return BigInt(value);
  },
};

export function typeLabelled<Value>(
  label: string,
  type: Type<Value>,
): Type<Value> {
  return {
    label,
    decoder: type.decoder,
  };
}

export function typeCommaArray(elementType: Type<any>): Type<Array<any>> {
  return {
    label: `${elementType.label}[${elementType.label},...]`,
    decoder(value: string) {
      return value.split(",").map(elementType.decoder);
    },
  };
}
