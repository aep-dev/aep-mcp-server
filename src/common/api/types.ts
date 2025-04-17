export interface Contact {
  name: string;
  email: string;
  url: string;
}

export interface API {
  serverURL: string;
  name: string;
  contact: Contact | null;
  schemas: Record<string, Schema>;
  resources: Record<string, Resource>;
}

export interface Resource {
  singular: string;
  plural: string;
  parents: Resource[];
  children: Resource[];
  patternElems: string[];
  schema: Schema;
  getMethod?: GetMethod;
  listMethod?: ListMethod;
  createMethod?: CreateMethod;
  updateMethod?: UpdateMethod;
  deleteMethod?: DeleteMethod;
  customMethods: CustomMethod[];
}

export interface GetMethod {}

export interface ListMethod {
  hasUnreachableResources: boolean;
  supportsFilter: boolean;
  supportsSkip: boolean;
}

export interface CreateMethod {
  supportsUserSettableCreate: boolean;
}

export interface UpdateMethod {}

export interface DeleteMethod {}

export interface CustomMethod {
  name: string;
  method: string;
  request: Schema | null;
  response: Schema | null;
}

export interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  $ref?: string;
  xAEPResource?: {
    singular: string;
    plural: string;
    patterns: string[];
    parents: string[];
  };
}

export interface XAEPResource {
  singular: string;
  plural: string;
  patterns: string[];
  parents: string[];
}

export interface PatternInfo {
  isResourcePattern: boolean;
  customMethodName: string;
}

export interface OpenAPI {
  openapi: string;
  servers: Array<{ url: string }>;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: Contact;
  };
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, Schema>;
  };
  definitions?: Record<string, Schema>;
}

export interface Info {
  title: string;
  description?: string;
  version: string;
  contact?: Contact;
}

export interface Server {
  url: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
}

export interface ServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface PathItem {
  get?: {
    operationId?: string;
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: Schema;
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
            schema: Schema;
          };
        };
      }
    >;
  };
  post?: {
    operationId?: string;
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: Schema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: Schema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: Schema;
          };
        };
      }
    >;
  };
  put?: {
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: Schema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: Schema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: Schema;
          };
        };
      }
    >;
  };
  patch?: {
    operationId?: string;
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: Schema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: Schema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: Schema;
          };
        };
      }
    >;
  };
  delete?: {
    operationId?: string;
    parameters?: Array<{
      in: string;
      name: string;
      required: boolean;
      schema: Schema;
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
            schema: Schema;
          };
        };
      }
    >;
  };
}

export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Array<{
    in: string;
    name: string;
    required: boolean;
    schema: Schema;
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
          schema: Schema;
        };
      };
    }
  >;
  requestBody?: {
    required: boolean;
    content: {
      "application/json": {
        schema: Schema;
      };
    };
  };
}

export interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: Schema;
  type?: string;
  xAEPResourceRef?: XAEPResourceRef;
}

export interface XAEPResourceRef {
  resource: string;
}

export interface Response {
  description?: string;
  content?: Record<string, MediaType>;
  schema?: Schema;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required: boolean;
  schema?: Schema;
}

export interface MediaType {
  schema?: Schema;
}

export interface Components {
  schemas: Record<string, Schema>;
}

export interface PathWithParams {
  pattern: string;
  params: Array<{
    in: string;
    name: string;
    required: boolean;
    schema: Schema;
    xAEPResourceRef?: {
      resource: string;
    };
  }>;
}
