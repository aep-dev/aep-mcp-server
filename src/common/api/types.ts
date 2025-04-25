export interface Contact {
  name: string;
  email: string;
  url: string;
}

export interface API {
  serverURL: string;
  name: string;
  contact: Contact | null;
  schemas: Record<string, APISchema>;
  resources: Record<string, Resource>;
}

export interface Resource {
  singular: string;
  plural: string;
  parents: Resource[];
  children: Resource[];
  patternElems: string[];
  schema: APISchema;
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
  request: APISchema | null;
  response: APISchema | null;
}

export interface APISchema {
  type?: string;
  properties?: Record<string, APISchema>;
  items?: APISchema;
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
    schemas: Record<string, APISchema>;
  };
  definitions?: Record<string, APISchema>;
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
      schema: APISchema;
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
            schema: APISchema;
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
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: APISchema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
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
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: APISchema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
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
      schema: APISchema;
      xAEPResourceRef?: {
        resource: string;
      };
    }>;
    requestBody?: {
      required: boolean;
      content: {
        "application/json": {
          schema: APISchema;
        };
      };
    };
    responses: Record<
      string,
      {
        description: string;
        content?: {
          "application/json": {
            schema: APISchema;
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
      schema: APISchema;
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
            schema: APISchema;
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
    schema: APISchema;
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
          schema: APISchema;
        };
      };
    }
  >;
  requestBody?: {
    required: boolean;
    content: {
      "application/json": {
        schema: APISchema;
      };
    };
  };
}

export interface Parameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: APISchema;
  type?: string;
  xAEPResourceRef?: XAEPResourceRef;
}

export interface XAEPResourceRef {
  resource: string;
}

export interface Response {
  description?: string;
  content?: Record<string, MediaType>;
  schema?: APISchema;
}

export interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required: boolean;
  schema?: APISchema;
}

export interface MediaType {
  schema?: APISchema;
}

export interface Components {
  schemas: Record<string, APISchema>;
}

export interface PathWithParams {
  pattern: string;
  params: Array<{
    in: string;
    name: string;
    required: boolean;
    schema: APISchema;
    xAEPResourceRef?: {
      resource: string;
    };
  }>;
}
