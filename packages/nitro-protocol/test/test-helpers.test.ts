import {bigNumberify} from 'ethers/utils';

import {replaceAddressesAndBigNumberify} from './test-helpers';

const addresses = {
  // Channels
  C: '0xCHANNEL',
  X: '0xANOTHERCHANNEL',
  // Externals
  A: '0x000EXTERNAL',
  B: '0x000ANOTHEREXTERNAL',
  ETH: '0xETH',
  TOK: '0xTOK',
};

const singleAsset = {C: 1, X: 2};
const singleAssetReplaced = {'0xCHANNEL': bigNumberify(1), '0xANOTHERCHANNEL': bigNumberify(2)};

const multiAsset = {ETH: {C: 3}, TOK: {X: 4}};
const multiAssetReplaced = {
  '0xETH': {'0xCHANNEL': bigNumberify(3)},
  '0xTOK': {'0xANOTHERCHANNEL': bigNumberify(4)},
};

describe('replaceAddressesAndBigNumberify', () => {
  it('replaces without recursion', () => {
    expect(replaceAddressesAndBigNumberify(singleAsset, addresses)).toStrictEqual(
      singleAssetReplaced
    );
  });
  it('replaces with one level of recursion', () => {
    expect(replaceAddressesAndBigNumberify(multiAsset, addresses)).toStrictEqual(
      multiAssetReplaced
    );
  });
});
