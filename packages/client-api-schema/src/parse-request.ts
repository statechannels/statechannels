// need to use this syntax, because ajv uses export= style exports
// otherwise we force all consumers of the package to set esModuleInterop to true
import Ajv = require('ajv');

// You need to pass `jsonPointers: true`
const ajv = new Ajv({jsonPointers: true, verbose: true});
import betterAjvErrors from 'better-ajv-errors';

// eslint-disable-next-line
const apiSchema = require('./generated-schema.json'); // because https://github.com/TypeStrong/ts-loader/issues/905
import {Request} from './types.js';

ajv.addSchema(apiSchema, 'api.json');

export const validateRequest = ajv.compile({$ref: 'api.json#/definitions/Request'});

export function parseRequest(jsonBlob: object): Request {
  const valid = validateRequest(jsonBlob);
  if (!valid) {
    const output = betterAjvErrors(apiSchema, jsonBlob, validateRequest.errors);
    console.error(output);
    throw new Error(`Validation Error`);
  }
  return jsonBlob as Request;
}
