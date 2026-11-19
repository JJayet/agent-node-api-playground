const errorResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' }
    }
  }
});

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Todo API',
    version: '1.0.0'
  },
  paths: {
    '/health': {
      get: {
        summary: 'Vérifie l’état de l’API',
        responses: {
          200: {
            description: 'L’API est opérationnelle',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', const: 'ok' } },
                  required: ['status']
                }
              }
            }
          }
        }
      }
    },
    '/todos': {
      get: {
        summary: 'Liste les todos',
        parameters: [
          {
            name: 'completed',
            in: 'query',
            required: false,
            schema: { type: 'boolean' }
          }
        ],
        responses: {
          200: {
            description: 'Liste des todos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Todo' }
                    }
                  },
                  required: ['data']
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Crée un todo',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { title: { type: 'string', minLength: 1 } },
                required: ['title']
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Todo créé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/Todo' } },
                  required: ['data']
                }
              }
            }
          },
          400: errorResponse('Requête invalide')
        }
      }
    },
    '/todos/{id}': {
      delete: {
        summary: 'Supprime un todo',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          204: { description: 'Todo supprimé' },
          404: errorResponse('Todo introuvable')
        }
      }
    }
  },
  components: {
    schemas: {
      Todo: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          completed: { type: 'boolean' }
        },
        required: ['id', 'title', 'completed']
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error']
      }
    }
  }
};
