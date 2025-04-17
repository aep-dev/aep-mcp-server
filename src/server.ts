import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fetchOpenAPI, OpenAPIImpl } from "./common/openapi/openapi.js";
import { APIClient } from "./common/api/api.js";
import { OpenAPI as OpenAPIType } from "./common/api/types.js";
import { resourceToZodSchema } from "./schema.js";
import { z } from "zod";

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
    name: "Demo",
    version: "1.0.0",
  });

  // Create sample tool for MCP.
  const resources = a.resources();
  for (const [resourceName, resource] of Object.entries(resources)) {
    const zodSchema = await resourceToZodSchema(resource.schema, oas);
    if (!(zodSchema instanceof z.ZodObject)) {
      throw new Error(`Expected object schema but got ${zodSchema.constructor.name}`);
    }
    server.tool(
      resourceName,
      zodSchema._def.shape(),
      async (args: Record<string, unknown>, extra: RequestHandlerExtra): Promise<Response> => {
        console.log(args);
        return {
          content: [{ type: "text", text: "Success" }],
        };
      }
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();
