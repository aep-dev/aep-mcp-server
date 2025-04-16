import { z } from "zod";
import { Schema } from "./common/api/types";

export function resourceToZodSchema(schema: Schema): z.ZodRawShape {
  switch (schema.type) {
    case "boolean":
      return { type: z.boolean() };
    case "number":
      return { type: z.number() };
    case "string":
      return { type: z.string() };
    case "object":
      return Object.entries(schema.properties || {}).reduce(
        (acc: Record<string, z.ZodTypeAny>, [key, value]) => {
          acc[key] = resourceToZodSchema(value).type;
          return acc;
        },
        {}
      );
    case "array":
      if (!schema.items) {
        throw "array type with no items set";
      }
      return { type: resourceToZodSchema(schema.items).type.array() };

    default:
      throw "could not find item type " + schema.type;
  }
}
