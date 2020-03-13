import {bigNumberify} from 'ethers/utils';
import {prettyPrintWei} from './calculateWei';

describe('Pretty printing wei', () => {
  it('can pretty print a kwei', () => {
    expect(prettyPrintWei(bigNumberify(1e3))).toEqual('1.0 kwei');
  });

  it('can pretty print 10 kwei', () => {
    expect(prettyPrintWei(bigNumberify(1e4))).toEqual('10.0 kwei');
  });

  it('can pretty print 18 kwei', () => {
    expect(prettyPrintWei(bigNumberify(18e3))).toEqual('18.0 kwei');
  });
});
