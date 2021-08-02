import {utils, Wallet} from 'ethers';

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

const destination = '0x14bcc435f49d130d189737f9762feb25c44ef5b886bef833e31a702af6be4748';
const targetChannelId = '0xcac1bb71f0a97c8ac94ca9546b43178a9ad254c7b757ac07433aa6df35cd8089';
const destinations = [destination];
const asset = Wallet.createRandom().address;

const guarantee: Guarantee = {
  targetChannelId,
  destinations,
};
const allocationItems: AllocationItem[] = [{destination, amount: '0x05'}];

const outcome = [
  {asset, allocationItems},
  {asset, guarantee},
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
