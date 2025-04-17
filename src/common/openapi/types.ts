export const OAS2 = "2.0";
export const OAS3 = "3.0";
export const ContentType = "application/json";

export interface Contact {
  name?: string;
  email?: string;
  url?: string;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface Info {
  title: string;
  description: string;
  version: string;
  contact?: Contact;
}

export interface XAEPResourceRef {
  resource?: string;
}

export interface Parameter {
  name?: string;
  in?: string;
  description?: string;
  required?: boolean;
  schema?: Schema;
  type?: string;
  "x-aep-resource-reference"?: XAEPResourceRef;
}

export interface MediaType {
  schema?: Schema;
}

export interface Response {
  description?: string;
  content?: Record<string, MediaType>;
  schema?: Schema; // OAS 2.0
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required: boolean;
  schema?: Schema; // OAS 2.0
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  responses?: Record<string, Response>;
  requestBody?: RequestBody;
}

export interface PathItem {
  get?: Operation;
  patch?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
}

export interface XAEPResource {
  singular?: string;
  plural?: string;
  patterns?: string[];
  parents?: string[];
}

export interface Schema {
  type?: string;
  format?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  $ref?: string;
  "x-aep-resource"?: XAEPResource;
  "x-aep-field-numbers"?: Record<number, string>;
  readOnly?: boolean;
  required?: string[];
  description?: string;
}

export interface Components {
  schemas: Record<string, Schema>;
}

export interface OpenAPI {
  swagger?: string; // OAS 2.0
  info: Info;
  openapi?: string; // OAS 3.0
  servers?: Server[];
  paths: Record<string, PathItem>;
  components?: Components;
  definitions?: Record<string, Schema>; // OAS 2.0
}
