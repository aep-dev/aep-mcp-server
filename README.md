# AEP MCP Server
The AEP MCP Server is a Model Context Protocol server that will generate MCP resources and tools based off an AEP-compliant API. This allows API developers with AEP-compliant APIs to create MCP resources that read/list their API resources and MCP tools that allow the creation/deletion/updating of their API resources.

Visit [aep.dev](https://aep.dev) for more information on the AEP project.

# Installation
```
git clone https://github.com/aep-dev/aep-mcp-server.git
cd aep-mcp-server
npm install
```

# Running the Server

To run the server locally, use the following command:

```bash
npm run serve --openapi-url="http://localhost:8081/openapi.json"
npm run serve --openapi-url="https://raw.githubusercontent.com/Roblox/creator-docs/refs/heads/main/content/en-us/reference/cloud/cloud.docs.json" --prefix="/cloud/v2"
```

Alternatively, if the package is installed globally or published to npm, you can run it directly using:

```bash
npx . --openapi-url="http://localhost:8081/openapi.json"
```

# Inspecting the resources

The `@modelcontextprotocol/inspector` can be used:

```bash
npx @modelcontextprotocol/inspector node src/bin.js --openapi-url="http://localhost:8081/openapi.json"
```
