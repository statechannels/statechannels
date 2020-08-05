import {validateRequest, parseRequest} from '../validation';

import {goodRequests} from './good_sample_messages';
import {badRequests} from './bad_sample_messages';

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
