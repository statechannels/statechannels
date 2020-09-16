import {utils, Wallet} from 'ethers';

import {Destination, Uint256} from '../../../src';
import {
  decodeAllocation,
  decodeGuarantee,
  decodeOutcome,
  encodeAllocation,
  encodeGuarantee,
  encodeOutcome,
  Guarantee,
  AllocationItem,
} from '../../../src/contract/outcome';

const destination = utils.id('d') as Destination;
const targetChannelId = utils.id('t');
const destinations = [destination];
const assetHolderAddress = Wallet.createRandom().address;

const guarantee: Guarantee = {
  targetChannelId,
  destinations,
};
const allocationItems: AllocationItem[] = [{destination, amount: '0x05' as Uint256}];

const outcome = [
  {assetHolderAddress, allocationItems},
  {assetHolderAddress, guarantee},
];
const emptyOutcome = [];

const description0 = 'Encodes and decodes guarantee';
const description1 = 'Encodes and decodes allocation';
const description2 = 'Encodes and decodes outcome';
const description3 = 'Encodes and decodes empty outcome';

describe('outcome', () => {
  describe('encoding and decoding', () => {
    it.each`
      description     | encodeFunction      | decodeFunction      | data
      ${description0} | ${encodeGuarantee}  | ${decodeGuarantee}  | ${guarantee}
      ${description1} | ${encodeAllocation} | ${decodeAllocation} | ${allocationItems}
      ${description2} | ${encodeOutcome}    | ${decodeOutcome}    | ${outcome}
      ${description3} | ${encodeOutcome}    | ${decodeOutcome}    | ${emptyOutcome}
    `('$description', ({encodeFunction, decodeFunction, data}) => {
      const encodedData = encodeFunction(data);
      const decodedData = decodeFunction(encodedData);
      expect(decodedData).toEqual(data);
    });
  });
});
