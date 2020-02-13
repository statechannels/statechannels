import {validateRequest, parseRequest} from '../parse-request';
import {
  getAddress,
  pushMessage,
  getEthSelectedAddress,
  createChannel,
  pushMessage2
} from './good_sample_requests';
import * as bad from './bad_sample_requests';

describe('validateRequest', () => {
  it('works', () => {
    expect(validateRequest({hello: 'true'})).toBe(false);
    expect(validateRequest(getAddress)).toBe(true);
    expect(validateRequest(getEthSelectedAddress)).toBe(true);
    expect(validateRequest(pushMessage)).toBe(true);
    expect(validateRequest(createChannel)).toBe(true);
    expect(validateRequest(pushMessage2)).toBe(true);
    expect(validateRequest(bad.createChannel)).toBe(false);
  });
});

describe('parseRequest', () => {
  it('returns valid requests', () => {
    expect(parseRequest(getAddress)).toEqual(getAddress);
    expect(parseRequest(getEthSelectedAddress)).toEqual(getEthSelectedAddress);
    expect(parseRequest(pushMessage)).toEqual(pushMessage);
    expect(parseRequest(pushMessage2)).toEqual(pushMessage2);
    expect(parseRequest(createChannel)).toEqual(createChannel);
  });
});
