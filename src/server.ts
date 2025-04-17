import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { fetchOpenAPI } from "./common/openapi/openapi.js";
import { APIClient } from "./common/api/api.js";
import { OpenAPI as OpenAPIType } from "./common/api/types.js";
import { resourceToZodSchema } from "./schema.js";

const openapiUrl =
  "https://raw.githubusercontent.com/Roblox/creator-docs/refs/heads/main/content/en-us/reference/cloud/cloud.docs.json";
const prefix = "/cloud/v2";

async function main() {
  const openapi = await fetchOpenAPI(openapiUrl);

  const a = await APIClient.fromOpenAPI(openapi as OpenAPIType, "", prefix);

  // Create an MCP server
  const server = new McpServer({
    name: "Demo",
    version: "1.0.0",
  });

  // Create sample tool for MCP.
  const resources = a.resources();
  for (const [resourceName, resource] of Object.entries(resources)) {
    server.tool(
      resourceName,
      resourceToZodSchema(resource.schema),
      async (args, extra) => {
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
