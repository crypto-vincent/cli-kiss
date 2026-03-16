export type Type<Value> = {
  label: string;
  decoder(value: string): Value;
};

export const typeBoolean = {
  label: "BOOLEAN",
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
  label: "DATE",
  decoder(value: string) {
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return new Date(timestamp);
  },
};

export const typeString = {
  label: "STRING",
  decoder(value: string) {
    return value;
  },
};

export const typeNumber = {
  label: "NUMBER",
  decoder(value: string) {
    return Number(value);
  },
};

export const typeBigInt = {
  label: "BIGINT",
  decoder(value: string) {
    return BigInt(value);
  },
};

export function typeCommaArray(elementType: Type<any>): Type<Array<any>> {
  return {
    label: `${elementType.label}[${elementType.label},...]`,
    decoder(value: string) {
      return value.split(",").map(elementType.decoder);
    },
  };
}
