import { API, Contact, OpenAPI, Resource, Schema, ListMethod } from './types';
import { convertToOpenAPI, generateParentPatternsWithParams } from './openapi';

describe('convertToOpenAPI', () => {
  // Common example API used across tests
  const publisher: Resource = {
    singular: 'publisher',
    plural: 'publishers',
    parents: [],
    children: [],
    patternElems: ['publishers', '{publisher}'],
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        id: { type: 'string' }
      }
    },
    listMethod: {
      hasUnreachableResources: false,
      supportsFilter: false,
      supportsSkip: false
    },
    getMethod: {},
    createMethod: {
      supportsUserSettableCreate: true
    },
    customMethods: []
  };

  const book: Resource = {
    singular: 'book',
    plural: 'books',
    parents: [publisher],
    children: [],
    patternElems: ['books', '{book}'],
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        id: { type: 'string' }
      }
    },
    listMethod: {
      hasUnreachableResources: true,
      supportsFilter: true,
      supportsSkip: true
    },
    getMethod: {},
    createMethod: {
      supportsUserSettableCreate: true
    },
    updateMethod: {},
    deleteMethod: {},
    customMethods: [{
      name: 'archive',
      method: 'POST',
      request: {
        type: 'object',
        properties: {}
      },
      response: {
        type: 'object',
        properties: {
          archived: { type: 'boolean' }
        }
      }
    }]
  };

  publisher.children = [book];

  const bookEdition: Resource = {
    singular: 'book-edition',
    plural: 'book-editions',
    parents: [book],
    children: [],
    patternElems: ['editions', '{book-edition}'],
    schema: {
      type: 'object',
      properties: {
        date: { type: 'string' }
      }
    },
    listMethod: {
      hasUnreachableResources: false,
      supportsFilter: false,
      supportsSkip: false
    },
    getMethod: {},
    customMethods: []
  };

  book.children = [bookEdition];

  const exampleAPI: API = {
    name: 'Test API',
    serverURL: 'https://api.example.com',
    contact: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      url: 'https://example.com'
    },
    schemas: {
      account: {
        type: 'object'
      }
    },
    resources: {
      book: book,
      'book-edition': bookEdition,
      publisher: publisher
    }
  };

  describe('Basic resource paths', () => {
    it('should convert API to OpenAPI format', async () => {
      const openAPI = convertToOpenAPI(exampleAPI);

      // Verify basic OpenAPI structure
      expect(openAPI.openapi).toBe('3.1.0');
      expect(openAPI.info.title).toBe(exampleAPI.name);
      expect(openAPI.servers[0].url).toBe(exampleAPI.serverURL);

      // Verify Contact information
      if(exampleAPI.contact == null){
        throw new Error('Contact information is missing');
      }
      const { name, email, url } = exampleAPI.contact;
      expect(openAPI.info.contact).toEqual({ name, email, url });

      // Verify paths exist
      const expectedPaths = [
        '/publishers',
        '/publishers/{publisher}',
        '/publishers/{publisher}/books',
        '/publishers/{publisher}/books/{book}',
        '/publishers/{publisher}/books/{book}/editions',
        '/publishers/{publisher}/books/{book}/editions/{book-edition}'
      ];

      for (const path of expectedPaths) {
        expect(openAPI.paths[path]).toBeDefined();
      }

      // Verify schemas exist
      for (const [key, resource] of Object.entries(exampleAPI.resources)) {
        const schema = openAPI.components.schemas[resource.singular];
        expect(schema).toBeDefined();
        expect(schema.type).toBe(resource.schema.type);
        expect(schema.xAEPResource?.singular).toBe(resource.singular);
      }

      // Verify operations exist and have correct operationIds
      const expectedOperations = {
        '/publishers': {
          get: {
            operationId: 'ListPublisher'
          },
          post: {
            operationId: 'CreatePublisher'
          }
        },
        '/publishers/{publisher}': {
          get: {
            operationId: 'GetPublisher'
          }
        },
        '/publishers/{publisher}/books': {
          get: {
            operationId: 'ListBook',
            parameters: [
              {
                name: 'skip',
                in: 'query',
                required: false,
                schema: { type: 'integer' }
              },
              {
                name: 'filter',
                in: 'query',
                required: false,
                schema: { type: 'string' }
              }
            ]
          },
          post: {
            operationId: 'CreateBook',
            parameters: [
              {
                name: 'id',
                in: 'query',
                required: false,
                schema: { type: 'string' }
              }
            ]
          }
        },
        '/publishers/{publisher}/books/{book}': {
          get: {
            operationId: 'GetBook'
          },
          patch: {
            operationId: 'UpdateBook',
            requestBody: {
              required: true,
              content: {
                'application/merge-patch+json': {
                  schema: { $ref: '#/components/schemas/book' }
                }
              }
            }
          },
          delete: {
            operationId: 'DeleteBook'
          }
        },
        '/publishers/{publisher}/books/{book}:archive': {
          post: {
            operationId: ':ArchiveBook',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {}
                  }
                }
              }
            }
          }
        }
      };

      for (const [path, operations] of Object.entries(expectedOperations)) {
        const pathItem = openAPI.paths[path];
        expect(pathItem).toBeDefined();

        for (const [method, expectedOp] of Object.entries(operations)) {
          const actualOp = pathItem[method as keyof typeof pathItem];
          expect(actualOp).toBeDefined();
          expect(actualOp.operationId).toBe(expectedOp.operationId);

          if ('parameters' in expectedOp) {
            expect(actualOp.parameters).toEqual(expectedOp.parameters);
          }

          if ('requestBody' in expectedOp) {
            expect(actualOp.requestBody).toEqual(expectedOp.requestBody);
          }
        }
      }
    });
  });

  describe('generateParentPatternsWithParams', () => {
    it('should handle pattern elements', () => {
      const resource: Resource = {
        singular: 'table',
        plural: 'tables',
        parents: [],
        children: [],
        patternElems: ['databases', '{database}', 'tables', '{table}'],
        schema: { type: 'object' },
        customMethods: []
      };

      const [collection, pathParams] = generateParentPatternsWithParams(resource);

      expect(collection).toBe('/tables');
      expect(pathParams).toEqual([{
        pattern: '/databases/{database}',
        params: [{
          in: 'path',
          name: 'database',
          required: true,
          schema: { type: 'string' },
          xAEPResourceRef: { resource: 'database' }
        }]
      }]);
    });

    it('should handle pattern elements without nesting', () => {
      const resource: Resource = {
        singular: 'database',
        plural: 'databases',
        parents: [],
        children: [],
        patternElems: ['databases', '{database}'],
        schema: { type: 'object' },
        customMethods: []
      };

      const [collection, pathParams] = generateParentPatternsWithParams(resource);

      expect(collection).toBe('/databases');
      expect(pathParams).toEqual([{
        pattern: '',
        params: []
      }]);
    });

    it('should handle resources without pattern elements', () => {
      const resource: Resource = {
        singular: 'table',
        plural: 'tables',
        parents: [{
          singular: 'database',
          plural: 'databases',
          parents: [],
          children: [],
          patternElems: [],
          schema: { type: 'object' },
          customMethods: []
        }],
        children: [],
        patternElems: [],
        schema: { type: 'object' },
        customMethods: []
      };

      const [collection, pathParams] = generateParentPatternsWithParams(resource);

      expect(collection).toBe('/tables');
      expect(pathParams).toEqual([{
        pattern: '/databases/{database}',
        params: [{
          in: 'path',
          name: 'database',
          required: true,
          schema: { type: 'string' },
          xAEPResourceRef: { resource: 'database' }
        }]
      }]);
    });

    it('should handle nested parent resources', () => {
      const resource: Resource = {
        singular: 'table',
        plural: 'tables',
        parents: [{
          singular: 'database',
          plural: 'databases',
          parents: [{
            singular: 'account',
            plural: 'accounts',
            parents: [],
            children: [],
            patternElems: [],
            schema: { type: 'object' },
            customMethods: []
          }],
          children: [],
          patternElems: [],
          schema: { type: 'object' },
          customMethods: []
        }],
        children: [],
        patternElems: [],
        schema: { type: 'object' },
        customMethods: []
      };

      const [collection, pathParams] = generateParentPatternsWithParams(resource);

      expect(collection).toBe('/tables');
      expect(pathParams).toEqual([{
        pattern: '/accounts/{account}/databases/{database}',
        params: [
          {
            in: 'path',
            name: 'account',
            required: true,
            schema: { type: 'string' },
            xAEPResourceRef: { resource: 'account' }
          },
          {
            in: 'path',
            name: 'database',
            required: true,
            schema: { type: 'string' },
            xAEPResourceRef: { resource: 'database' }
          }
        ]
      }]);
    });
  });
}); 