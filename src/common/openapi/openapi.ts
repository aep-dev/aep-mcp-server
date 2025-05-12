import {
  OpenAPI,
  OAS2,
  OAS3,
  ContentType,
  Schema,
  Response,
  RequestBody,
} from "./types.js";

import yaml from "js-yaml";

export class OpenAPIImpl {
  private api: OpenAPI;

  constructor(api: OpenAPI) {
    this.api = api;
  }

  oasVersion(): string {
    if (this.api.swagger === "2.0") {
      return OAS2;
    } else if (this.api.openapi) {
      return OAS3;
    }
    return "";
  }

  async dereferenceSchema(schema: Schema): Promise<Schema> {
    if (schema.$ref) {
      const parts = schema.$ref.split("/");
      const key = parts[parts.length - 1];
      let childSchema: Schema | undefined;

      switch (this.oasVersion()) {
        case OAS2:
          childSchema = this.api.definitions?.[key];
          if (!childSchema) {
            throw new Error(`schema ${schema.$ref} not found`);
          }
          break;
        default:
          childSchema = this.api.components?.schemas[key];
          if (!childSchema) {
            throw new Error(`schema ${schema.$ref} not found`);
          }
      }
      return this.dereferenceSchema(childSchema);
    }
    return schema;
  }

  getSchemaFromResponse(response: Response): Schema | undefined {
    switch (this.oasVersion()) {
      case OAS2:
        return response.schema;
      default:
        return response.content?.[ContentType]?.schema;
    }
  }

  getSchemaFromRequestBody(requestBody: RequestBody): Schema | undefined {
    switch (this.oasVersion()) {
      case OAS2:
        return requestBody.schema;
      default:
        return requestBody.content[ContentType]?.schema;
    }
  }
}

export async function fetchOpenAPI(pathOrURL: string): Promise<OpenAPI> {
  try {
    const body = await readFileOrURL(pathOrURL);
    return parseYAML(body);
  } catch (error) {
    throw new Error(`Failed to fetch or parse OpenAPI schema from ${pathOrURL}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readFileOrURL(pathOrURL: string): Promise<string> {
  if (isURL(pathOrURL)) {
    const response = await fetch(pathOrURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.text();
  }

  // In Node.js environment
  if (typeof process !== "undefined" && process.versions?.node) {
    const fs = await import("fs/promises");
    return fs.readFile(pathOrURL, "utf-8");
  }

  throw new Error("File system access not available in this environment");
}

function isURL(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function parseYAML(yamlString: string): Promise<OpenAPI> {
  return yaml.load(yamlString) as OpenAPI;
}
