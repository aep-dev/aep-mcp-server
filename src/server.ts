import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fetchOpenAPI, OpenAPIImpl } from "./common/openapi/openapi.js";
import { APIClient } from "./common/api/api.js";
import { OpenAPI as OpenAPIType, Resource } from "./common/api/types.js";
import { parameterSchema, resourceToZodSchema, schemaToZodSchema } from "./schema.js";
import { z } from "zod";

import axios from "axios";
import { Client } from "./common/client/client.js";


type RequestHandlerExtra = {
  [key: string]: unknown;
};

type ResponseContent = {
  type: "text";
  text: string;
};

type Response = {
  content: ResponseContent[];
  _meta?: Record<string, unknown>;
  isError?: boolean;
};

const openapiUrl =
  "https://raw.githubusercontent.com/Roblox/creator-docs/refs/heads/main/content/en-us/reference/cloud/cloud.docs.json";
const prefix = "/cloud/v2";

async function main() {
  const openapi = await fetchOpenAPI(openapiUrl);
  const oas = new OpenAPIImpl(openapi as OpenAPIType);

  const a = await APIClient.fromOpenAPI(openapi as OpenAPIType, "", prefix);

  // Create an MCP server
  const server = new McpServer({
    name: "AEP MCP Server",
    version: "0.1.0",
  });
  const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": process.env.API_KEY!,
    };

  // Create an axios instance with default configuration
  const axiosInstance = axios.create({
    headers: headers,
  });

  function fetchParameters(requestBody: Record<string, any>, resource: Resource): Record<string, any> {
    const filteredParameters: Record<string, any> = {};
    for (const [key, value] of Object.entries(requestBody)) {
      for (const pattern of resource.patternElems.slice(0, -1)) {
        const patternKey = pattern.replace(/{|}/g, '');
        if(key == patternKey) {
          filteredParameters[key] = value;
        }
      }
    }
    return filteredParameters;
  }

  function fetchRequestBody(requestBody: Record<string, any>, resource: Resource): Record<string, any> {
    const filteredRequestBody = { ...requestBody };
    for (const pattern of resource.patternElems.slice(0, -1)) {
      const patternKey = pattern.replace(/{|}/g, '');
      delete filteredRequestBody[patternKey];
    }
    return filteredRequestBody;
  }


  // Create a new client instance
  const client = new Client(axiosInstance, headers);

  // Create sample tool for MCP.
  const resources = a.resources();
  for (const [resourceName, resource] of Object.entries(resources)) {
    const zodSchema = await resourceToZodSchema(resource.schema, oas);
    const parameters = await parameterSchema(resource, oas);
    const mergedSchema = { ...zodSchema, ...parameters };

    server.tool(
      `create-${resourceName}`,
      mergedSchema,
      async (
        args: Record<string, unknown>,
        extra: RequestHandlerExtra
      ): Promise<Response> => {
        const resp = await client.create({}, resource, a.serverUrl(), fetchRequestBody(args, resource), fetchParameters(args, resource))
        return {
          content: [{ type: "text", text: JSON.stringify(resp) }],
        };
      }
    );

    server.tool(
      `delete-${resourceName}`,
      {path: z.string()},
      async (
        args: Record<string, unknown>,
        extra: RequestHandlerExtra
      ): Promise<Response> => {
        if (!args.path) {
          throw new Error("Path is required for deletion.");
        }
        const path = args.path as string
        const resp = await client.delete({}, a.serverUrl(), path)
        return {
          content: [{ type: "text", text: `Successfully deleted ${path}` }],
        };
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
