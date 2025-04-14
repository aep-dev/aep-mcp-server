import { 
  API, 
  Contact, 
  OpenAPI, 
  PatternInfo, 
  Resource, 
  Schema,
  Response as OpenAPIResponse,
  RequestBody as OpenAPIRequestBody,
  CustomMethod
} from './types';
import { pascalCaseToKebabCase } from '../cases/cases';

export class APIClient {
  private api: API;

  constructor(api: API) {
    this.api = api;
  }

  static async fromOpenAPI(openAPI: OpenAPI, serverURL: string = '', pathPrefix: string = ''): Promise<APIClient> {
    if (!openAPI.openapi && !openAPI.openapi) {
      throw new Error('Unable to detect OAS openapi. Please add an openapi field or a openapi field');
    }

    const resourceBySingular: Record<string, Resource> = {};
    const customMethodsByPattern: Record<string, CustomMethod[]> = {};

    // Parse paths to find possible resources
    for (const [path, pathItem] of Object.entries(openAPI.paths)) {
      const trimmedPath = path.slice(pathPrefix.length);
      const patternInfo = getPatternInfo(trimmedPath);
      
      if (!patternInfo) {
        continue;
      }

      let schemaRef: Schema | null = null;
      const r: Partial<Resource> = {};

      if (patternInfo.customMethodName && patternInfo.isResourcePattern) {
        const pattern = trimmedPath.split(':')[0].slice(1);
        if (!customMethodsByPattern[pattern]) {
          customMethodsByPattern[pattern] = [];
        }

        if (pathItem.post) {
          const response = pathItem.post.responses['200'];
          if (response) {
            const schema = getSchemaFromResponse(response, openAPI);
            const responseSchema = schema ? await dereferenceSchema(schema, openAPI) : null;
            
            if (!pathItem.post.requestBody) {
              throw new Error(`Custom method ${patternInfo.customMethodName} has a POST response but no request body`);
            }

            const requestSchema = await dereferenceSchema(
              getSchemaFromRequestBody(pathItem.post.requestBody, openAPI),
              openAPI
            );

            customMethodsByPattern[pattern].push({
              name: patternInfo.customMethodName,
              method: 'POST',
              request: requestSchema,
              response: responseSchema
            });
          }
        }

        if (pathItem.get) {
          const response = pathItem.get.responses['200'];
          if (response) {
            const schema = getSchemaFromResponse(response, openAPI);
            const responseSchema = schema ? await dereferenceSchema(schema, openAPI) : null;

            customMethodsByPattern[pattern].push({
              name: patternInfo.customMethodName,
              method: 'GET',
              request: null,
              response: responseSchema
            });
          }
        }
      } else if (patternInfo.isResourcePattern) {
        if (pathItem.delete) {
          r.deleteMethod = {};
        }
        if (pathItem.get) {
          const response = pathItem.get.responses['200'];
          if (response) {
            schemaRef = getSchemaFromResponse(response, openAPI);
            r.getMethod = {};
          }
        }
        if (pathItem.patch) {
          const response = pathItem.patch.responses['200'];
          if (response) {
            schemaRef = getSchemaFromResponse(response, openAPI);
            r.updateMethod = {};
          }
        }
      } else {
        if (pathItem.post) {
          const response = pathItem.post.responses['200'];
          if (response) {
            schemaRef = getSchemaFromResponse(response, openAPI);
            const supportsUserSettableCreate = pathItem.post.parameters?.some(
              param => param.name === 'id'
            ) ?? false;
            r.createMethod = { supportsUserSettableCreate };
          }
        }

        if (pathItem.get) {
          const response = pathItem.get.responses['200'];
          if (response) {
            const respSchema = getSchemaFromResponse(response, openAPI);
            if (!respSchema) {
              console.warn(`Resource ${path} has a LIST method with a response schema, but the response schema is null.`);
            } else {
              const resolvedSchema = await dereferenceSchema(respSchema, openAPI);
              const arrayProperty = Object.entries(resolvedSchema.properties || {}).find(
                ([_, prop]) => prop.type === 'array'
              );

              if (arrayProperty) {
                schemaRef = arrayProperty[1].items || null;
                r.listMethod = {
                  hasUnreachableResources: false,
                  supportsFilter: false,
                  supportsSkip: false
                };

                for (const param of pathItem.get.parameters || []) {
                  if (param.name === 'skip') {
                    r.listMethod.supportsSkip = true;
                  } else if (param.name === 'unreachable') {
                    r.listMethod.hasUnreachableResources = true;
                  } else if (param.name === 'filter') {
                    r.listMethod.supportsFilter = true;
                  }
                }
              } else {
                console.warn(`Resource ${path} has a LIST method with a response schema, but the items field is not present or is not an array.`);
              }
            }
          }
        }
      }

      if (schemaRef) {
        const parts = schemaRef.$ref?.split('/') || [];
        const key = parts[parts.length - 1];
        const singular = pascalCaseToKebabCase(key);
        const pattern = trimmedPath.split('/').slice(1);

        if (!patternInfo.isResourcePattern) {
          let finalSingular = singular;
          if (pattern.length >= 3) {
            const parent = pattern[pattern.length - 3].slice(1, -1); // Remove curly braces
            if (singular.startsWith(parent)) {
              finalSingular = singular.slice(parent.length + 1);
            }
          }
          pattern.push(`{${finalSingular}}`);
        }

        const dereferencedSchema = await dereferenceSchema(schemaRef, openAPI);

        const resource = await getOrPopulateResource(
          singular,
          pattern,
          dereferencedSchema,
          resourceBySingular,
          openAPI
        );

        if (r.getMethod) resource.getMethod = r.getMethod;
        if (r.listMethod) resource.listMethod = r.listMethod;
        if (r.createMethod) resource.createMethod = r.createMethod;
        if (r.updateMethod) resource.updateMethod = r.updateMethod;
        if (r.deleteMethod) resource.deleteMethod = r.deleteMethod;
      }
    }

    // Map custom methods to resources
    for (const [pattern, customMethods] of Object.entries(customMethodsByPattern)) {
      const resource = Object.values(resourceBySingular).find(
        r => r.patternElems.join('/') === pattern
      );
      if (resource) {
        resource.customMethods = customMethods;
      }
    }

    if (!serverURL) {
      serverURL = openAPI.servers[0]?.url + pathPrefix;
    }

    if (serverURL == "" || serverURL == "undefined") {
      throw new Error('No server URL found in openapi, and none was provided');
    }

    // Add non-resource schemas to API's schemas
    const schemas: Record<string, Schema> = {};
    for (const [key, schema] of Object.entries(openAPI.components.schemas)) {
      if (!resourceBySingular[key]) {
        schemas[key] = schema;
      }
    }

    return new APIClient({
      serverURL,
      name: openAPI.info.title,
      contact: getContact(openAPI.info.contact),
      resources: resourceBySingular,
      schemas
    });
  }

  getResource(resource: string): Resource {
    const r = this.api.resources[resource];
    if (!r) {
      throw new Error(`Resource "${resource}" not found`);
    }
    return r;
  }
}

function getPatternInfo(path: string): PatternInfo | null {
  let customMethodName = '';
  if (path.includes(':')) {
    const parts = path.split(':');
    path = parts[0];
    customMethodName = parts[1];
  }

  const pattern = path.split('/').slice(1);
  for (let i = 0; i < pattern.length; i++) {
    const segment = pattern[i];
    const wrapped = segment.startsWith('{') && segment.endsWith('}');
    const wantWrapped = i % 2 === 1;
    if (wrapped !== wantWrapped) {
      return null;
    }
  }

  return {
    isResourcePattern: pattern.length % 2 === 0,
    customMethodName
  };
}

async function getOrPopulateResource(
  singular: string,
  pattern: string[],
  schema: Schema,
  resourceBySingular: Record<string, Resource>,
  openAPI: OpenAPI
): Promise<Resource> {
  if (resourceBySingular[singular]) {
    return resourceBySingular[singular];
  }

  let resource: Resource;

  if(schema.xAEPResource) {
    resource = {
      singular: schema.xAEPResource.singular,
      plural: schema.xAEPResource.plural,
      // Parents will be set later on.
      parents: [],
      children: [],
      patternElems: schema.xAEPResource.patterns[0].slice(1).split('/'),
      schema,
      customMethods: []
    };
  } else {
    resource = {
      singular,
      plural: '',
      parents: [],
      children: [],
      patternElems: pattern,
      schema,
      customMethods: []
    };
  }

  if (schema.xAEPResource) {
    for (const parentSingular of schema.xAEPResource.parents) {
      const parentSchema = openAPI.components.schemas[parentSingular];
      if (!parentSchema) {
        throw new Error(`Resource "${singular}" parent "${parentSingular}" not found`);
      }

      const parentResource = await getOrPopulateResource(
        parentSingular,
        [],
        parentSchema,
        resourceBySingular,
        openAPI
      );

      resource.parents.push(parentResource);
      parentResource.children.push(resource);
    }
  }

  resourceBySingular[singular] = resource;
  return resource;
}

function getContact(contact?: Contact): Contact | null {
  if (!contact || (!contact.name && !contact.email && !contact.url)) {
    return null;
  }
  return contact;
}

function getSchemaFromResponse(response: OpenAPIResponse, openAPI: OpenAPI): Schema | null {
  if (openAPI.openapi === '2.0') {
    return response.schema || null;
  }
  return response.content?.['application/json']?.schema || null;
}

function getSchemaFromRequestBody(requestBody: OpenAPIRequestBody, openAPI: OpenAPI): Schema {
  if (openAPI.openapi === '2.0') {
    return requestBody.schema!;
  }
  return requestBody.content['application/json'].schema!;
}

async function dereferenceSchema(schema: Schema, openAPI: OpenAPI): Promise<Schema> {
  if (!schema.$ref) {
    return schema;
  }

  const parts = schema.$ref.split('/');
  const key = parts[parts.length - 1];
  let childSchema: Schema;

  if (openAPI.openapi === '2.0') {
    childSchema = openAPI.definitions![key];
  } else {
    childSchema = openAPI.components.schemas[key];
  }

  if (!childSchema) {
    throw new Error(`Schema "${schema.$ref}" not found`);
  }

  return dereferenceSchema(childSchema, openAPI);
} 