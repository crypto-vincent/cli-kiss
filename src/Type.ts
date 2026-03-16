export type Type<Value> = {
  label: string;
  decoder: (value: string) => Value;
};

export const typeBoolean = {
  label: "Boolean",
  decoder: (value: string) => {
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
  decoder: (value: string) => {
    const timestamp = Date.parse(value);
    if (isNaN(timestamp)) {
      throw new Error(`Invalid date value: ${value}`);
    }
    return new Date(timestamp);
  },
};

export const typeString = {
  label: "String",
  decoder: (value: string) => value,
};

export const typeNumber = {
  label: "Number",
  decoder: (value: string) => Number(value),
};

export const typeBigInt = {
  label: "BigInt",
  decoder: (value: string) => BigInt(value),
};

export function typeArray(elementType: Type<any>): Type<Array<any>> {
  return {
    label: `Array<${elementType.label}>`,
    decoder: (value: string) => value.split(",").map(elementType.decoder),
  };
}
