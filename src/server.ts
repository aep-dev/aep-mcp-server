import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fetchOpenAPI, OpenAPIImpl } from "./common/openapi/openapi.js";
import { APIClient } from "./common/api/api.js";
import { OpenAPI as OpenAPIType, Resource } from "./common/api/types.js";
import { BuildCreateTool, BuildDeleteTool, BuildResource, BuildUpdateTool } from "./schema.js";

import axios from "axios";
import { Client } from "./common/client/client.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ReadResourceRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { parseArguments } from "./cli.js";
import { logger } from "./logger.js";
import { inspect } from "util";

export async function main() {

  logger.info("Server initialization started");

  const argv = parseArguments(process.argv.slice(2));
  const openapiUrl = argv["openapi-url"];
  const prefix = argv.prefix;
  const headers: Record<string, string> = JSON.parse(argv.headers);

  const openapi = await fetchOpenAPI(openapiUrl);
  const oas = new OpenAPIImpl(openapi as OpenAPIType);

  const a = await APIClient.fromOpenAPI(openapi as OpenAPIType, "", prefix);

  // Create an MCP server
  const server = new Server({
    name: "AEP MCP Server",
    version: "0.1.0",
  }, {
    capabilities: {
      tools: {},
      logging: {},
      resources: {}
    },
  });

  // Create an axios instance with default configuration
  const axiosInstance = axios.create({
    headers: headers,
  });

  function fetchParameters(requestBody: Record<string, any>, resource: Resource): Record<string, any> {
    const filteredParameters: Record<string, any> = {};
    for (const [key, value] of Object.entries(requestBody)) {
      for (const pattern of resource.patternElems.slice(0, -1)) {
        const patternKey = pattern.replace(/{|}/g, '');
        if (key == patternKey) {
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
  const client = new Client(axiosInstance, headers,
    (ctx, req, ...args) => {
      server.sendLoggingMessage({
        level: "info",
        data: `Request ${JSON.stringify(req)}`,
      });
    },
    (ctx, resp, ...args) => {
      server.sendLoggingMessage({
        level: "info",
        data: `Response ${JSON.stringify(resp.data)}`,
      });
    },
  );

  // Create sample tool for MCP.
  const resources = a.resources();
  const tools: Tool[] = []
  const resourceList: Array<{ uriTemplate: string; name: string; mime: string }> = []
  for (const [resourceName, resource] of Object.entries(resources)) {
    logger.info(`Processing resource: ${resourceName}`);
    tools.push(BuildCreateTool(resource, resourceName));
    tools.push(BuildDeleteTool(resource, resourceName));
    tools.push(BuildUpdateTool(resource, resourceName));
    resourceList.push(BuildResource(resource, resourceName, a.serverUrl(), prefix))
  }

  // empty handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: []
    };
  });

  // functional handlers

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: resourceList
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri.toString();
    server.sendLoggingMessage({
      level: "info",
      data: `Received resource uri ${uri}}`,
    });
    const resp = await client.getWithFullUrl({}, uri);
    return {
      contents: [{
        uri,
        mimeType: "text/plain",
        text: JSON.stringify(resp),
      }]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request: any): Promise<any> => {
    try {
      const toolName = request.params.name;
      server.sendLoggingMessage({
        level: "info",
        data: `Received tool ${toolName}}`,
      });
      const matchingTool = tools.find(tool => tool.name === toolName);
      if (!matchingTool) {
        throw new Error(`Matching tool not found: ${toolName}`);
      }
      if (matchingTool.name.startsWith("create")) {
        const resourceSingular = matchingTool.name.split("-")[1];
        const resource = a.resources()[resourceSingular];
        const parameters = fetchParameters(request.params.arguments!, resource)
        const body = fetchRequestBody(request.params.arguments!, resource)
        const resp = await client.create({}, resource, a.serverUrl(), body, parameters)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(resp)
          }],
          isError: false
        };
      } else if (matchingTool.name.startsWith("delete")) {
        const path = request.params.arguments!["path"]
        const resp = await client.delete({}, a.serverUrl(), path)
        return {
          content: [{
            type: "text",
            text: `Successfully deleted ${path}`
          }],
          isError: false
        };
      } else if (matchingTool.name.startsWith("update")) {
        const path = request.params.arguments!["path"]
        const resp = await client.update({}, a.serverUrl(), path, request.params.arguments!)
        return {
          content: [{
            type: "text",
            text: JSON.stringify(resp)
          }],
          isError: false
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  })

  const transport = new StdioServerTransport();
  logger.info("Starting server connection...");
  await server.connect(transport);
}