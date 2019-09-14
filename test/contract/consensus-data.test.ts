import {
  ConsensusData,
  encodeConsensusData,
  decodeConsensusData,
  propose,
  vote,
  veto,
} from '../../src/contract/consensus-data';
import {AddressZero} from 'ethers/constants';
import {Outcome} from '../../src/contract/outcome';
import {ethers} from 'ethers';

describe('consensus-data', () => {
  describe('voting', () => {
    const assetHolderAddress = ethers.Wallet.createRandom().address;

    const numberOfParticipants = 3;

    const destinations = [ethers.utils.id('a'), ethers.utils.id('b'), ethers.utils.id('c')];

    const proposedOutcome: Outcome = [
      {
        assetHolderAddress,
        allocation: destinations.map((d, i) => {
          return {amount: '0x1', destination: d};
        }),
      },
    ];

    const currentOutcome: Outcome = [
      {
        assetHolderAddress,
        allocation: destinations.map((d, i) => {
          return {amount: '0x0', destination: d};
        }),
      },
    ];

    const description0 = 'propose works';
    const description1 = 'first vote works';
    const description2 = 'final vote works';
    const description3 = 'veto works';

    it.each`
      description     | fromArgs                                                                              | voteFunction | expectedResult
      ${description0} | ${[proposedOutcome, numberOfParticipants]}                                            | ${propose}   | ${{proposedOutcome, furtherVotesRequired: numberOfParticipants - 1}}
      ${description1} | ${[{proposedOutcome, furtherVotesRequired: 2}, numberOfParticipants, currentOutcome]} | ${vote}      | ${{consensusData: {proposedOutcome, furtherVotesRequired: 1}, currentOutcome}}
      ${description2} | ${[{proposedOutcome, furtherVotesRequired: 1}, numberOfParticipants, currentOutcome]} | ${vote}      | ${{consensusData: {proposedOutcome: [], furtherVotesRequired: 2}, currentOutcome: proposedOutcome}}
      ${description3} | ${[numberOfParticipants]}                                                             | ${veto}      | ${{proposedOutcome: [], furtherVotesRequired: 2}}
    `('$description', ({fromArgs, voteFunction, expectedResult}) => {
      expect(voteFunction(...fromArgs)).toEqual(expectedResult);
    });
  });

  describe('encoding and decoding', () => {
    const consensusData: ConsensusData = {
      furtherVotesRequired: 5,
      proposedOutcome: [{assetHolderAddress: AddressZero, allocation: []}],
    };
    const emptyConsensusData = {furtherVotesRequired: 0, proposedOutcome: []};

    const description0 = 'encodes and decodes a Consensus Data';
    const description1 = 'encodes and decodes an empty Consensus Data';
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
