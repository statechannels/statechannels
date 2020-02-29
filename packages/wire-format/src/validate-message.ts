// need to use this syntax, because ajv uses export= style exports
// otherwise we force all consumers of the package to set esModuleInterop to true
import Ajv = require('ajv');

// eslint-disable-next-line
const apiSchema = require('./generated-schema.json'); // because https://github.com/TypeStrong/ts-loader/issues/905
import {Message} from './types.js';

const ajv = new Ajv();
ajv.addSchema(apiSchema, 'api.json');

export const messageIsValid = ajv.compile({$ref: 'api.json#/definitions/Message'});

const prettyPrintError = (e: Ajv.ErrorObject): string => {
  switch (e.keyword) {
    case 'additionalProperties': {
      const unexpected = (e.params as any).additionalProperty;
      return `Unexpected property '${unexpected}' found at root${e.dataPath} `;
    }
    case 'required': {
      const missing = (e.params as any).missingProperty;
      return `Missing required property '${missing}' at root${e.dataPath}`;
    }
    case 'type':
    case 'pattern': {
      return `Property at root${e.dataPath} ${e.message}`;
    }
  }
  return JSON.stringify(e);
};

export function validateMessage(jsonBlob: object): Message {
  const valid = messageIsValid(jsonBlob);
  if (!valid) {
    const errorMessages = messageIsValid.errors?.map(e => prettyPrintError(e)).join('/n');
    throw new Error(`Validation Error: ${errorMessages}`);
  }
  return jsonBlob as Message;
}
