// need to use this syntax, because ajv uses export= style exports
// otherwise we force all consumers of the package to set esModuleInterop to true
import Ajv = require('ajv');
import {Request, Response} from './types';

// You need to pass `jsonPointers: true`
const ajv = new Ajv({jsonPointers: true, verbose: true});

// eslint-disable-next-line
const apiSchema = require('./generated-schema.json'); // because https://github.com/TypeStrong/ts-loader/issues/905

ajv.addSchema(apiSchema, 'api.json');

export const validateRequest = ajv.compile({$ref: 'api.json#/definitions/Request'});
export const validateResponse = ajv.compile({$ref: 'api.json#/definitions/Response'});
function prettyPrintError(e: Ajv.ErrorObject): string {
  switch (e.keyword) {
    case 'additionalProperties': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unexpected = (e.params as any).additionalProperty;
      return `Unexpected property '${unexpected}' found at root${e.dataPath} `;
    }
    case 'required': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missing = (e.params as any).missingProperty;
      return `Missing required property '${missing}' at root${e.dataPath}`;
    }
    case 'type':
    case 'pattern': {
      return `Property at root${e.dataPath} ${e.message}`;
    }
  }
  return JSON.stringify(e);
}

export function parseRequest(jsonBlob: object): Request {
  const valid = validateRequest(jsonBlob);
  if (!valid) {
    throw new Error(
      `Validation Error: ${validateRequest.errors?.map(e => prettyPrintError(e)).join(`;\n`)}`
    );
  }
  return jsonBlob as Request;
}
export function parseResponse(jsonBlob: object): Response {
  const valid = validateResponse(jsonBlob);
  if (!valid) {
    throw new Error(
      `
      Validation Error:
        input: ${JSON.stringify(jsonBlob)};\n
        ${validateResponse.errors?.map(e => prettyPrintError(e)).join(`;\n`)}
      `
    );
  }
  return jsonBlob as Response;
}
