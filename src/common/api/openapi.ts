import {
  API,
  Contact,
  OpenAPI,
  PathItem as OpenAPIPathItem,
  PathWithParams,
  Resource,
  APISchema,
  Operation,
  RequestBody,
  Parameter,
  Response,
} from "./types.js";
import { collectionName } from "./resource.js";
import { kebabToPascalCase } from "../cases/cases.js";

export function convertToOpenAPI(api: API): OpenAPI {
  const paths: Record<string, OpenAPIPathItem> = {};
  const components = {
    schemas: {} as Record<string, APISchema>,
  };

  for (const r of Object.values(api.resources)) {
    const schema = r.schema;
    const [collection, parentPWPS] = generateParentPatternsWithParams(r);

    if (parentPWPS.length === 0) {
      parentPWPS.push({ pattern: "", params: [] });
    }

    const patterns: string[] = [];
    const schemaRef = `#/components/schemas/${r.singular}`;
    const singular = r.singular;

    const bodyParam = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: schemaRef },
        },
      },
    };

    const idParam = {
      in: "path",
      name: singular,
      required: true,
      schema: { type: "string" },
    };

    const resourceResponse = {
      description: "Successful response",
      content: {
        "application/json": {
          schema: { $ref: schemaRef },
        },
      },
    };

    for (const pwp of parentPWPS) {
      const resourcePath = `${pwp.pattern}${collection}/{${singular}}`;
      patterns.push(resourcePath.slice(1));

      if (r.listMethod) {
        const listPath = `${pwp.pattern}${collection}`;
        const responseProperties: Record<string, APISchema> = {
          results: {
            type: "array",
            items: { $ref: schemaRef },
          },
          nextPageToken: {
            type: "string",
          },
        };

        if (r.listMethod.hasUnreachableResources) {
          responseProperties.unreachable = {
            type: "array",
            items: { type: "string" },
          };
        }

        const params = [
          ...pwp.params,
          {
            in: "query",
            name: "maxPageSize",
            required: false,
            schema: { type: "integer" },
          },
          {
            in: "query",
            name: "pageToken",
            required: false,
            schema: { type: "string" },
          },
        ];

        if (r.listMethod.supportsSkip) {
          params.push({
            in: "query",
            name: "skip",
            required: false,
            schema: { type: "integer" },
          });
        }

        if (r.listMethod.supportsFilter) {
          params.push({
            in: "query",
            name: "filter",
            required: false,
            schema: { type: "string" },
          });
        }

        addMethodToPath(paths, listPath, "get", {
          operationId: `List${kebabToPascalCase(singular)}`,
          description: `List method for ${singular}`,
          parameters: params,
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: responseProperties,
                  },
                },
              },
            },
          },
        });
      }

      if (r.createMethod) {
        const createPath = `${pwp.pattern}${collection}`;
        const params = [...pwp.params];
        if (r.createMethod.supportsUserSettableCreate) {
          params.push({
            in: "query",
            name: "id",
            required: false,
            schema: { type: "string" },
          });
        }

        addMethodToPath(paths, createPath, "post", {
          operationId: `Create${kebabToPascalCase(singular)}`,
          description: `Create method for ${singular}`,
          parameters: params,
          requestBody: bodyParam,
          responses: {
            "200": resourceResponse,
          },
        });
      }

      if (r.getMethod) {
        addMethodToPath(paths, resourcePath, "get", {
          operationId: `Get${kebabToPascalCase(singular)}`,
          description: `Get method for ${singular}`,
          parameters: [...pwp.params, idParam],
          responses: {
            "200": resourceResponse,
          },
        });
      }

      if (r.updateMethod) {
        addMethodToPath(paths, resourcePath, "patch", {
          operationId: `Update${kebabToPascalCase(singular)}`,
          description: `Update method for ${singular}`,
          parameters: [...pwp.params, idParam],
          requestBody: {
            required: true,
            content: {
              "application/merge-patch+json": {
                schema: { $ref: schemaRef },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/merge-patch+json": {
                  schema: { $ref: schemaRef },
                },
              },
            },
          },
        });
      }

      if (r.deleteMethod) {
        const params = [...pwp.params, idParam];
        if (r.children.length > 0) {
          params.push({
            in: "query",
            name: "force",
            required: false,
            schema: { type: "boolean" },
          });
        }

        addMethodToPath(paths, resourcePath, "delete", {
          operationId: `Delete${kebabToPascalCase(singular)}`,
          description: `Delete method for ${singular}`,
          parameters: params,
          responses: {
            "204": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: {},
                },
              },
            },
          },
        });
      }

      for (const custom of r.customMethods) {
        const methodType = custom.method.toLowerCase();
        const cmPath = `${resourcePath}:${custom.name}`;
        const methodInfo = {
          operationId: `:${kebabToPascalCase(custom.name)}${kebabToPascalCase(
            singular
          )}`,
          description: `Custom method ${custom.name} for ${singular}`,
          parameters: [...pwp.params, idParam],
          requestBody: {},
          responses: {
            "200": {
              description: "Successful response",
              content: {
                "application/json": {
                  schema: custom.response,
                },
              },
            },
          },
        };

        if (custom.method == "POST") {
          methodInfo.requestBody = {
            required: true,
            content: {
              "application/json": {
                schema: custom.request,
              },
            },
          };
        }

        addMethodToPath(paths, cmPath, methodType, methodInfo);
      }
    }

    const parents = r.parents.map((p) => p.singular);
    schema.xAEPResource = {
      singular: r.singular,
      plural: r.plural,
      patterns,
      parents,
    };

    components.schemas[r.singular] = schema;
  }

  for (const [k, v] of Object.entries(api.schemas)) {
    components.schemas[k] = v;
  }

  const contact = api.contact
    ? {
        name: api.contact.name,
        email: api.contact.email,
        url: api.contact.url,
      }
    : undefined;

  return {
    openapi: "3.1.0",
    servers: [{ url: api.serverURL }],
    info: {
      title: api.name,
      version: "version not set",
      description: `An API for ${api.name}`,
      contact,
    },
    paths,
    components,
  };
}

export function generateParentPatternsWithParams(
  resource: Resource
): [string, PathWithParams[]] {
  if (resource.patternElems.length > 0) {
    const collection = `/${
      resource.patternElems[resource.patternElems.length - 2]
    }`;
    const params: any[] = [];
    for (let i = 0; i < resource.patternElems.length - 2; i += 2) {
      const pElem = resource.patternElems[i + 1];
      params.push({
        in: "path",
        name: pElem.slice(1, -1),
        required: true,
        schema: { type: "string" },
      });
    }

    const pattern = resource.patternElems
      .slice(0, resource.patternElems.length - 2)
      .join("/");
    return [
      collection,
      [
        {
          pattern: pattern ? `/${pattern}` : "",
          params,
        },
      ],
    ];
  }

  const collection = `/${collectionName(resource)}`;
  const pwps: PathWithParams[] = [];

  for (const parent of resource.parents) {
    const singular = parent.singular;
    const basePattern = `/${collectionName(parent)}/{${singular}}`;
    const baseParam = {
      in: "path",
      name: singular,
      required: true,
      schema: { type: "string" },
      xAEPResourceRef: { resource: singular },
    };

    if (parent.parents.length === 0) {
      pwps.push({
        pattern: basePattern,
        params: [baseParam],
      });
    } else {
      const [_, parentPWPS] = generateParentPatternsWithParams(parent);
      for (const parentPWP of parentPWPS) {
        const params = [...parentPWP.params, baseParam];
        const pattern = `${parentPWP.pattern}${basePattern}`;
        pwps.push({ pattern, params });
      }
    }
  }

  return [collection, pwps];
}

function addMethodToPath(
  paths: Record<string, OpenAPIPathItem>,
  path: string,
  method: string,
  methodInfo: any
): void {
  let methods = paths[path];
  if (!methods) {
    methods = {};
    paths[path] = methods;
  }

  switch (method) {
    case "get":
      methods.get = methodInfo;
      break;
    case "post":
      methods.post = methodInfo;
      break;
    case "patch":
      methods.patch = methodInfo;
      break;
    case "put":
      methods.put = methodInfo;
      break;
    case "delete":
      methods.delete = methodInfo;
      break;
  }
}

export interface PathItem {
  get?: {
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
          };
        };
      }
    >;
  };
  post?: {
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: APISchema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
          };
        };
      }
    >;
  };
  patch?: {
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: APISchema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
          };
        };
      }
    >;
  };
  delete?: {
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
          };
        };
      }
    >;
  };
}

export function parseOpenAPI(openapi: OpenAPI): OpenAPI {
  return openapi;
}

export function getPathItem(
  openapi: OpenAPI,
  path: string
): PathItem | undefined {
  return openapi.paths[path];
}

export function getSchema(schema: APISchema | undefined): APISchema {
  if (!schema) {
    return { type: "object", properties: {} };
  }
  if ("$ref" in schema && schema.$ref) {
    const refSchema: APISchema = {
      type: "object",
      properties: {},
      $ref: schema.$ref,
    };
    return refSchema;
  }
  return {
    ...schema,
    type: schema.type || "object",
  };
}

export function getMethod(
  openapi: OpenAPI,
  path: string,
  method: string
): PathItem[keyof PathItem] | undefined {
  const pathItem = getPathItem(openapi, path);
  if (!pathItem) {
    return undefined;
  }
  return pathItem[method as keyof PathItem];
}

export function getParameters(
  openapi: OpenAPI,
  path: string,
  method: string
):
  | Array<{
      in: string;
      name: string;
      required: boolean;
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>
  | undefined {
  const methodItem = getMethod(openapi, path, method);
  if (!methodItem || !("parameters" in methodItem)) {
    return undefined;
  }
  return methodItem.parameters;
}

export function getRequestBody(
  methodInfo: PathItem[keyof PathItem]
): RequestBody | undefined {
  if (!methodInfo || !("requestBody" in methodInfo)) {
    return undefined;
  }
  const requestBody = (methodInfo as { requestBody?: RequestBody }).requestBody;
  return requestBody;
}

export function getResponses(
  openapi: OpenAPI,
  path: string,
  method: string
):
  | Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
          };
        };
      }
    >
  | undefined {
  const methodItem = getMethod(openapi, path, method);
  if (!methodItem || !("responses" in methodItem)) {
    return undefined;
  }
  return methodItem.responses;
}
