// need to use this syntax, because ajv uses export= style exports
// otherwise we force all consumers of the package to set esModuleInterop to true
import Ajv = require('ajv');
import {Request, Response, Notification} from './types';

// You need to pass `jsonPointers: true`
const ajv = new Ajv({jsonPointers: true, verbose: true});

// eslint-disable-next-line
const apiSchema = require('./generated-schema.json'); // because https://github.com/TypeStrong/ts-loader/issues/905

ajv.addSchema(apiSchema, 'api.json');

export const validateRequest = ajv.compile({$ref: 'api.json#/definitions/Request'});
export const validateResponse = ajv.compile({$ref: 'api.json#/definitions/Response'});
export const validateNotification = ajv.compile({$ref: 'api.json#/definitions/Notification'});

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

/**
 * Validates a request against the API schema & returns the input cast to the correctly narrowed type.
 *
 * @param jsonBlob - A javascript object that might be a valid {@link Request}
 * @returns The input, but with the correct type, if it is valid.
 */
export function parseRequest(jsonBlob: object): Request {
  const valid = validateRequest(jsonBlob);
  if (!valid) {
    throw new Error(
      `Validation Error: ${validateRequest.errors?.map(e => prettyPrintError(e)).join(`;\n`)}`
    );
  }
  return jsonBlob as Request;
}

/**
 * Validates a response against the API schema & returns the input cast to the correctly narrowed type.
 *
 * @param jsonBlob - A javascript object that might be a valid {@link Response}
 * @returns The input, but with the correct type, if it is valid.
 */
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

/**
 * Validates a notification against the API schema & returns the input cast to the correctly narrowed type.
 *
 * @param jsonBlob - A javascript object that might be a valid {@link Notification}
 * @returns The input, but with the correct type, if it is valid.
 */
export function parseNotification(jsonBlob: object): Notification {
  const valid = validateNotification(jsonBlob);
  if (!valid) {
    throw new Error(
      `
      Validation Error:
        input: ${JSON.stringify(jsonBlob)};\n
        ${validateNotification.errors?.map(e => prettyPrintError(e)).join(`;\n`)}
      `
    );
  }
  return jsonBlob as Notification;
}
