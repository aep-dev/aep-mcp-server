import { z } from "zod";
import { Resource, APISchema } from "./common/api/types.js";
import { OpenAPIImpl } from "./common/openapi/openapi.js";

export async function resourceToZodSchema(schema: APISchema, oas: OpenAPIImpl): Promise<Record<string, z.ZodTypeAny>> {
  if (schema.$ref) {
    const newSchema = await oas.dereferenceSchema(schema);
    return resourceToZodSchema(newSchema, oas);
  }

  const properties: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(schema.properties!)) {
    properties[key] = await schemaToZodSchema(value, oas);
  }
  return properties;
}

export async function schemaToZodSchema(
  schema: APISchema,
  oas: OpenAPIImpl
): Promise<z.ZodTypeAny> {
  if (schema.$ref) {
    const newSchema = await oas.dereferenceSchema(schema);
    return schemaToZodSchema(newSchema, oas);
  }
  switch (schema.type) {
    case "boolean":
      return z.boolean().nullish();
    case "integer":
      return z.number().nullish();
    case "number":
      return z.number().nullish();
    case "string":
      return z.string().nullish();
    case "object":
      const properties: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(schema.properties || {})) {
        properties[key] = await schemaToZodSchema(value, oas);
      }
      return z.object(properties).nullish();
    case "array":
      if (!schema.items) {
        throw "array type with no items set";
      }
      const itemSchema = await schemaToZodSchema(schema.items, oas);
      return itemSchema.array().nullish();

    default:
      console.warn(
        `could not find item type ${schema.type} for schema ${JSON.stringify(
          schema
        )}`
      );
      return z.string().nullish();
  }
}

export async function parameterSchema(resource: Resource, oas: OpenAPIImpl): Promise<Record<string, z.ZodString>> {
  const properties: Record<string, z.ZodString> = {};
  for (const pattern of resource.patternElems.slice(0, -1)) {
    if (pattern.startsWith("{") && pattern.endsWith("}")) {
      const key = pattern.slice(1, -1);
      properties[key] = z.string();
    }
  }
  return properties;
}