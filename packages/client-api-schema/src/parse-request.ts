import Ajv from 'ajv';

import apiSchema from './generated-schema.json';
import {Request} from './types.js';

const ajv = new Ajv();
ajv.addSchema(apiSchema, 'api.json');

export const validateRequest = ajv.compile({$ref: 'api.json#/definitions/Request'});

export function parseRequest(jsonBlob: object): Request {
  const valid = validateRequest(jsonBlob);
  if (!valid) {
    const errorMessages = validateRequest.errors?.map(e => e.message);
    throw new Error(`Validation Error: ${errorMessages}`);
  }
  return jsonBlob as Request;
}
