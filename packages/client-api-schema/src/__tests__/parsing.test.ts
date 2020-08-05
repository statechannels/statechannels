import {
  validateRequest,
  parseRequest,
  validateNotification,
  parseNotification,
  validateErrorResponse,
  parseErrorResponse
} from '../validation';
import {parseResponse} from '../../lib/src';
import {validateResponse} from '../../lib/src/validation';

import {goodRequests} from './sample_messages/requests/good';
import {badRequests} from './sample_messages/requests/bad';
import {badNotifications} from './sample_messages/notifications/bad';
import {goodNotifications} from './sample_messages/notifications/good';
import {goodResponses} from './sample_messages/responses/good';
import {badResponses} from './sample_messages/responses/bad';
import {goodErrorResponses} from './sample_messages/error-responses/good';
import {badErrorResponses} from './sample_messages/error-responses/bad';

describe('requests', () => {
  for (const request of goodRequests) {
    it(`validates and parses ${request.method}`, () => {
      expect(parseRequest(request)).toEqual(request);
      expect(validateRequest(request)).toBe(true);
    });
  }
  for (const request of badRequests) {
    it(`detects a dodgy      ${request.method} and throws`, () => {
      expect(() => parseRequest(request)).toThrow();
      expect(validateRequest(request)).toBe(false);
    });
  }
});

describe('notifications', () => {
  for (const notification of goodNotifications) {
    it(`validates and parses ${notification.method}`, () => {
      expect(parseNotification(notification)).toEqual(notification);
      expect(validateNotification(notification)).toBe(true);
    });
  }
  for (const notification of badNotifications) {
    it(`detects a dodgy      ${notification.method} and throws`, () => {
      expect(() => parseNotification(notification)).toThrow();
      expect(validateNotification(notification)).toBe(false);
    });
  }
});

describe('responses', () => {
  for (const response of goodResponses) {
    it(`validates and parses ${response.id}`, () => {
      expect(parseResponse(response)).toEqual(response);
      expect(validateResponse(response)).toBe(true);
    });
  }
  for (const response of badResponses) {
    it(`detects a dodgy      response and throws`, () => {
      expect(() => parseResponse(response)).toThrow();
      expect(validateResponse(response)).toBe(false);
    });
  }
});

describe('error responses', () => {
  for (const response of goodErrorResponses) {
    it(`validates and parses ${response.error.code}: ${response.error.message}`, () => {
      expect(parseErrorResponse(response)).toEqual(response);
      expect(validateErrorResponse(response)).toBe(true);
    });
  }
  for (const response of badErrorResponses) {
    it(`detects a dodgy      ${response.error.code} error response and throws`, () => {
      expect(() => parseErrorResponse(response)).toThrow();
      expect(validateErrorResponse(response)).toBe(false);
    });
  }
});
