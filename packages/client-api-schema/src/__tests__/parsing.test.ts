import {
  validateRequest,
  parseRequest,
  validateNotification,
  parseNotification
} from '../validation';

import {goodRequests, goodNotifications} from './good_sample_messages';
import {badRequests, badNotifications} from './bad_sample_messages';

describe('requests', () => {
  it('validates and parses', () => {
    for (const request of goodRequests) {
      expect(validateRequest(request)).toBe(true);
      expect(parseRequest(request)).toEqual(request);
    }
    for (const request of badRequests) {
      expect(validateRequest(request)).toBe(false);
      expect(() => parseRequest(request)).toThrow();
    }
  });
});

describe('notifications', () => {
  it('validates and parses', () => {
    for (const notification of goodNotifications) {
      expect(validateNotification(notification)).toBe(true);
      expect(parseNotification(notification)).toEqual(notification);
    }
    for (const notification of badNotifications) {
      expect(validateNotification(notification)).toBe(false);
      expect(() => parseNotification(notification)).toThrow();
    }
  });
});
