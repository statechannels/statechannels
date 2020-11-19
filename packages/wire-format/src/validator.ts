// need to use this syntax, because ajv uses export= style exports
// otherwise we force all consumers of the package to set esModuleInterop to true
import Ajv = require('ajv');

import {Message, SignedState} from './types';

// eslint-disable-next-line
const apiSchema = require('./generated-schema.json'); // because https://github.com/TypeStrong/ts-loader/issues/905

const ajv = new Ajv();
ajv.addSchema(apiSchema, 'api.json');

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

export const messageIsValid = ajv.compile({$ref: 'api.json#/definitions/Message'});
// eslint-disable-next-line @typescript-eslint/ban-types
export function validateMessage(jsonBlob: object): Message {
  if (!messageIsValid(jsonBlob)) {
    throw new WireFormatValidationError(
      'Invalid message',
      jsonBlob,
      messageIsValid.errors?.map(e => prettyPrintError(e))
    );
  }
  return jsonBlob as Message;
}

export const stateIsValid = ajv.compile({$ref: 'api.json#/definitions/SignedState'});
// eslint-disable-next-line @typescript-eslint/ban-types
export function validateState(jsonBlob: object): SignedState {
  const valid = stateIsValid(jsonBlob);
  if (!valid) {
    throw new WireFormatValidationError(
      'Invalid state',
      jsonBlob,
      stateIsValid.errors?.map(e => prettyPrintError(e))
    );
  }
  return jsonBlob as SignedState;
}

class WireFormatValidationError extends Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(reason: string, public jsonBlob: any, public errorMessages?: string[]) {
    super(reason);
  }
}
