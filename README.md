# AEP MCP Server
The AEP MCP Server is a Model Context Protocol server that will generate resources and tools based off an AEP-compliant API.

Visit [aep.dev](https://aep.dev) for more information on the AEP project.

# Installation
```
git clone https://github.com/aep-dev/aep-mcp-server.git
cd aep-mcp-server
npm install
```

# Configuring the server

The server can be configured by modifying three variables in `src/server.ts`:

1. `openapiUrl`: The URL to your OpenAPI specification.
   ```typescript
   const openapiUrl = "https://my-open-api-spec.com/spec.json";
   ```

2. `prefix`: (optional) The API prefix path that will be used for all API calls. If all paths in your OpenAPI spec share a common prefix, list it here. Set to the empty string if no prefix exists.
   ```typescript
   const prefix = "/cloud/v2";
   ```

3. Headers: The server sends headers with each API request. We recommend not hard-coding any authentication credentials into the server file and instead using environment variables. You can modify these in the `headers` object:
   ```typescript
   const headers: Record<string, string> = {
     "Content-Type": "application/json",
     "x-api-key": process.env.API_KEY!,
   };
   ```

# Running the server
```
npm run build
node dist/server.js
```


