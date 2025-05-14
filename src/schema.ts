import { Resource, APISchema } from "./common/api/types.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export function BuildCreateTool(resource: Resource, resourceName: string): Tool {
  const schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } = {
    type: "object" as const,
    properties: { ...resource.schema.properties } as Record<string, unknown>
  };

  // Process pattern elements
  const patternElems = resource.patternElems.slice(0, -1);
  const required: string[] = [];

  if (schema.required == undefined) {
    schema.required = []
  }

  for (const elem of patternElems) {
    if (elem.startsWith('{') && elem.endsWith('}')) {
      const paramName = elem.slice(1, -1);
      schema.properties = {
        ...schema.properties,
        [paramName]: { type: "string" }
      };
      schema.required.push(paramName)
    }
  }

  if (resource.createMethod?.supportsUserSettableCreate) {
    schema.required.push('id');
    if (schema.properties.id) {
      schema.properties.id = { ...schema.properties.id, readOnly: false };
    }
  }

  if (schema.required && schema.required.includes('path')) {
    schema.required = schema.required.filter(req => req !== 'path');
  }

  return {
    name: `create-${resourceName}`,
    description: `Create a ${resourceName}`,
    inputSchema: schema
  };
}

export function BuildDeleteTool(resource: Resource, resourceName: string): Tool {
  const schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } = {
    type: "object" as const,
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  };

  return {
    name: `delete-${resourceName}`,
    description: `Delete a ${resourceName}`,
    inputSchema: schema,
  };
}

export function BuildUpdateTool(resource: Resource, resourceName: string): Tool {
  const schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } = {
    type: "object" as const,
    properties: { ...resource.schema.properties } as Record<string, unknown>
  };

  if (!schema.properties.path) {
    schema.properties.path = { type: "string" };
    schema.required = schema.required || [];
  }

  if (!schema.required || !schema.required.includes("path")) {
    schema.required = schema.required || [];
    schema.required.push("path");
  }

  return {
    name: `update-${resourceName}`,
    description: `Update a ${resourceName}`,
    inputSchema: schema,
  };
}

export function BuildListTool(resource: Resource, resourceName: string): Tool {
  // get all path params except the last one, which is the resource name. For list
  // we ignore it.
  const parentFieldNames = resource.patternElems.filter((elem) => elem.startsWith("{")).slice(0, -1);
  // strip the braces from the field names
  for (let i = 0; i < parentFieldNames.length; i++) {
    parentFieldNames[i] = parentFieldNames[i].slice(1, -1);
  }
  const properties: Record<string, unknown> = {};
  // iterate parentFieldNames
  for (const name of parentFieldNames) {
    properties[name] = {
      type: "string",
      description: `The ${name} to filter the list of ${resourceName} resources`,
    };
  }
  return {
    name: `list-${resourceName}`,
    description: `List all ${resourceName} resources`,
    inputSchema: {
      type: "object",
      properties: properties,
    },
  };
}

export function BuildGetTool(resource: Resource, resourceName: string): Tool {
  return {
    name: `get-${resourceName}`,
    description: `Get details of a specific ${resourceName}`,
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
    },
  };
}

export function BuildResource(resource: Resource, resourceName: string, serverUrl: string, prefix: string) {
  return {
    uriTemplate: `${serverUrl}/${resource.patternElems.join('/')}`,
    name: resourceName,
    mime: "text/plain",
  }
}