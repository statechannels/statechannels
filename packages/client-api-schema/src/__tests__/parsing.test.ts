import {
  validateRequest,
  parseRequest,
  validateNotification,
  parseNotification
} from '../validation';

import {goodRequests} from './sample_messages/requests/good';
import {badRequests} from './sample_messages/requests/bad';
import {badNotifications} from './sample_messages/notifications/bad';
import {goodNotifications} from './sample_messages/notifications/good';

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
