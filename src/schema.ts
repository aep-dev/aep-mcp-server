import { z } from "zod";
import { Schema } from "./common/api/types.js";
import { OpenAPIImpl } from "./common/openapi/openapi.js";

export async function resourceToZodSchema(schema: Schema, oas: OpenAPIImpl): Promise<z.ZodTypeAny> {
  if(schema.$ref) {
    const newSchema = await oas.dereferenceSchema(schema)
    return resourceToZodSchema(newSchema, oas)
  }
  switch (schema.type) {
    case "boolean":
      return z.boolean();
    case "integer":
      return z.number();
    case "number":
      return z.number();
    case "string":
      return z.string();
    case "object":
      const properties = await Promise.all(
        Object.entries(schema.properties || {}).map(async ([key, value]) => {
          const schema = await resourceToZodSchema(value, oas);
          return [key, schema];
        })
      );
      return z.object(Object.fromEntries(properties));
    case "array":
      if (!schema.items) {
        throw "array type with no items set";
      }
      const itemSchema = await resourceToZodSchema(schema.items, oas);
      return itemSchema.array();

    default:
      // TODO: handle ref!
      console.warn(`could not find item type ${schema.type} for schema ${JSON.stringify(schema)}`);
      return z.string();
  }
}
