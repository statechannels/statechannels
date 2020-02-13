import {validateRequest, parseRequest} from '../parse-request';
import * as good from './good_sample_requests';
import * as bad from './bad_sample_requests';

describe('validateRequest', () => {
  it('works', () => {
    expect(validateRequest(good.getAddress)).toBe(true);
    expect(validateRequest(good.getEthSelectedAddress)).toBe(true);
    expect(validateRequest(good.pushMessage)).toBe(true);
    expect(validateRequest(good.createChannel)).toBe(true);
    expect(validateRequest(good.pushMessage2)).toBe(true);
    expect(validateRequest(good.closeChannel)).toBe(true);
    expect(validateRequest({hello: 'true'})).toBe(false);
    expect(validateRequest(bad.createChannel)).toBe(false);
    expect(validateRequest(bad.closeChannel)).toBe(false);
  });
});

describe('parseRequest', () => {
  it('returns valid requests', () => {
    expect(parseRequest(good.getAddress)).toEqual(good.getAddress);
    expect(parseRequest(good.getEthSelectedAddress)).toEqual(good.getEthSelectedAddress);
    expect(parseRequest(good.pushMessage)).toEqual(good.pushMessage);
    expect(parseRequest(good.pushMessage2)).toEqual(good.pushMessage2);
    expect(parseRequest(good.createChannel)).toEqual(good.createChannel);
  });
});
