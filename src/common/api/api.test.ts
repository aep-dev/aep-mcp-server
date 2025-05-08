/// <reference types="jest" />
import { API, Contact, OpenAPI, Resource, APISchema } from "./types.js";
import { APIClient } from "./api.js";
import { fetchOpenAPI, OpenAPIImpl } from "../openapi/openapi.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const basicOpenAPI: OpenAPI = {
  openapi: "3.1.0",
  info: {
    title: "Test API",
    version: "version not set",
    description: "An API for Test API",
    contact: {
      name: "John Doe",
      email: "john.doe@example.com",
      url: "https://example.com",
    },
  },
  servers: [{ url: "https://api.example.com" }],
  paths: {
    "/widgets": {
      get: {
        operationId: "ListWidget",
        parameters: [
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
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Widget",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "CreateWidget",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Widget",
                },
              },
            },
          },
        },
      },
    },
    "/widgets/{widget}": {
      get: {
        operationId: "GetWidget",
        parameters: [
          {
            in: "path",
            name: "widget",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Widget",
                },
              },
            },
          },
        },
      },
      delete: {
        operationId: "DeleteWidget",
        parameters: [
          {
            in: "path",
            name: "widget",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "204": {
            description: "Successful response",
          },
        },
      },
      patch: {
        operationId: "UpdateWidget",
        parameters: [
          {
            in: "path",
            name: "widget",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Widget",
                },
              },
            },
          },
        },
      },
    },
    "/widgets/{widget}:start": {
      post: {
        operationId: ":StartWidget",
        parameters: [
          {
            in: "path",
            name: "widget",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  foo: { type: "string" },
                  bar: { type: "integer" },
                  baz: {
                    type: "array",
                    items: {
                      type: "boolean",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Widget",
                },
              },
            },
          },
        },
      },
    },
    "/widgets/{widget}:stop": {
      post: {
        operationId: ":StopWidget",
        parameters: [
          {
            in: "path",
            name: "widget",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Widget",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Widget",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Widget: {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      },
      Account: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
      },
    },
  },
};

describe("APIClient", () => {
  describe("fromOpenAPI", () => {
    it("should handle basic resource with CRUD operations", async () => {
      const client = await APIClient.fromOpenAPI(basicOpenAPI);
      const api = (client as any).api;

      expect(api.serverURL).toBe("https://api.example.com");

      const widget = api.resources["widget"];
      expect(widget).toBeDefined();
      expect(widget.patternElems).toEqual(["widgets", "{widget}"]);
      expect(widget.getMethod).toBeDefined();
      expect(widget.listMethod).toBeDefined();
      expect(widget.createMethod).toBeDefined();
      if (widget.createMethod) {
        expect(widget.createMethod.supportsUserSettableCreate).toBeFalsy();
      }
      expect(widget.updateMethod).toBeDefined();
      expect(widget.deleteMethod).toBeDefined();
    });

    it("should handle non-resource schemas", async () => {
      const client = await APIClient.fromOpenAPI(basicOpenAPI);
      const api = (client as any).api;
      expect(api.schemas["Account"]).toBeDefined();
    });

    it("should handle server URL override", async () => {
      const client = await APIClient.fromOpenAPI(
        basicOpenAPI,
        "https://override.example.com"
      );
      const api = (client as any).api;
      expect(api.serverURL).toBe("https://override.example.com");
    });

    it("should handle resource with x-aep-resource annotation", async () => {
      const openAPI: OpenAPI = {
        openapi: "3.1.0",
        info: {
          title: "Test API",
          version: "version not set",
          description: "Test API",
        },
        servers: [{ url: "https://api.example.com" }],
        paths: {
          "/widgets/{widget}": {
            get: {
              operationId: "GetWidget",
              parameters: [
                {
                  in: "path",
                  name: "widget",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/widget",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            widget: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
              xAEPResource: {
                singular: "widget",
                plural: "widgets",
                patterns: ["/widgets/{widget}"],
                parents: [],
              },
            },
          },
        },
      };

      const client = await APIClient.fromOpenAPI(openAPI);
      const api = (client as any).api;
      const widget = api.resources["widget"];
      expect(widget).toBeDefined();
      expect(widget.singular).toBe("widget");
      expect(widget.patternElems).toEqual(["widgets", "{widget}"]);
    });

    it("should handle missing server URL", async () => {
      const invalidOpenAPI: OpenAPI = {
        openapi: "3.1.0",
        info: {
          title: "Test API",
          version: "version not set",
          description: "Test API",
        },
        servers: [],
        paths: {},
        components: {
          schemas: {},
        },
      };

      await expect(APIClient.fromOpenAPI(invalidOpenAPI)).rejects.toThrow(
        "No server URL found in openapi, and none was provided"
      );
    });

    it("should handle resource with user-settable create ID", async () => {
      const openAPI: OpenAPI = {
        openapi: "3.1.0",
        servers: [{ url: "https://api.example.com" }],
        info: {
          title: "Test API",
          version: "version not set",
          description: "Test API",
        },
        paths: {
          "/widgets": {
            post: {
              operationId: "CreateWidget",
              parameters: [
                {
                  in: "query",
                  name: "id",
                  required: false,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/Widget",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Widget: {
              type: "object",
            },
          },
        },
      };

      const client = await APIClient.fromOpenAPI(openAPI);
      const api = (client as any).api;
      const widget = api.resources["widget"];
      expect(widget).toBeDefined();
      expect(widget.createMethod?.supportsUserSettableCreate).toBeTruthy();
    });

    it("should handle contact information", async () => {
      const client = await APIClient.fromOpenAPI(basicOpenAPI);
      const api = (client as any).api;
      expect(api.contact).toBeDefined();
      expect(api.contact?.name).toBe("John Doe");
      expect(api.contact?.email).toBe("john.doe@example.com");
      expect(api.contact?.url).toBe("https://example.com");
    });
  });
});
