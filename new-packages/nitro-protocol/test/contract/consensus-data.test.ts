import {
  ConsensusData,
  encodeConsensusData,
  decodeConsensusData,
} from '../../src/contract/consensus-data';
import {AddressZero} from 'ethers/constants';
const consensusData: ConsensusData = {
  furtherVotesRequired: 5,
  proposedOutcome: [{assetHolderAddress: AddressZero, allocation: []}],
};
const emptyConsensusData = {furtherVotesRequired: 0, proposedOutcome: []};

const description0 = 'encodes and decodes a Consensus Data';
const description1 = 'encodes and decodes an empty Consensus Data';

describe('consensus-data', () => {
  describe('encoding and decoding', () => {
    it.each`
      description     | data
      ${description0} | ${consensusData}
      ${description1} | ${emptyConsensusData}
    `('$description', ({data}) => {
      const encodedData = encodeConsensusData(data);
      const decodedData = decodeConsensusData(encodedData);
      expect(decodedData).toEqual(data);
    });
  });
});
