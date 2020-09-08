import {Wallet, ethers} from 'ethers';
import {id} from 'ethers/utils';

import {
  ConsensusData,
  decodeConsensusData,
  encodeConsensusData,
  propose,
  veto,
  vote,
} from '../../../src/contract/consensus-data';
import {Outcome} from '../../../src/contract/outcome';

describe('consensus-data', () => {
  describe('voting', () => {
    const assetHolderAddress = Wallet.createRandom().address;

    const numberOfParticipants = 3;

    const destinations = [id('a'), id('b'), id('c')];

    const proposedOutcome: Outcome = [
      {
        assetHolderAddress,
        allocationItems: destinations.map((d, i) => ({amount: '0x1', destination: d})),
      },
    ];

    const currentOutcome: Outcome = [
      {
        assetHolderAddress,
        allocationItems: destinations.map((d, i) => ({amount: '0x0', destination: d})),
      },
    ];

    const description0 = 'propose works';
    const description1 = 'first vote works';
    const description2 = 'final vote works';
    const description3 = 'veto works';

    it.each`
      description     | fromArgs                                                                              | voteFunction | expectedConsensusData                                                | expectedCurrentOutcome
      ${description0} | ${[proposedOutcome, currentOutcome, numberOfParticipants]}                            | ${propose}   | ${{proposedOutcome, furtherVotesRequired: numberOfParticipants - 1}} | ${currentOutcome}
      ${description1} | ${[{proposedOutcome, furtherVotesRequired: 2}, numberOfParticipants, currentOutcome]} | ${vote}      | ${{proposedOutcome, furtherVotesRequired: 1}}                        | ${currentOutcome}
      ${description2} | ${[{proposedOutcome, furtherVotesRequired: 1}, numberOfParticipants, currentOutcome]} | ${vote}      | ${{proposedOutcome: [], furtherVotesRequired: 2}}                    | ${proposedOutcome}
      ${description3} | ${[currentOutcome, numberOfParticipants]}                                             | ${veto}      | ${{proposedOutcome: [], furtherVotesRequired: 2}}                    | ${currentOutcome}
    `('$description', ({fromArgs, voteFunction, expectedConsensusData, expectedCurrentOutcome}) => {
      const voteResults = voteFunction(...fromArgs);
      expect(voteResults.consensusData).toEqual(expectedConsensusData);
      expect(voteResults.currentOutcome).toEqual(expectedCurrentOutcome);
    });
  });

  describe('encoding and decoding', () => {
    const consensusData: ConsensusData = {
      furtherVotesRequired: 5,
      proposedOutcome: [{assetHolderAddress: ethers.constants.AddressZero, allocationItems: []}],
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
