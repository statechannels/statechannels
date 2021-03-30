import {ethers} from 'ethers';
import * as _ from 'lodash';

import {addHash} from '../state-utils';
import {BN} from '../bignumber';
import {openChannelCranker, OpenChannelObjective} from '../protocols/direct-funder';
import {Address, makeAddress, SimpleAllocation, State} from '../types';

import {ONE_DAY, participants, signStateHelper} from './test-helpers';
const {A: participantA, B: participantB} = participants;

const {AddressZero} = ethers.constants;
jest.setTimeout(10_000);

let channelId: string;

test('pure objective cranker', () => {
  const outcome: SimpleAllocation = {
    type: 'SimpleAllocation',
    allocationItems: [
      {destination: participantA.destination, amount: BN.from(1)},
      {destination: participantB.destination, amount: BN.from(1)}
    ],
    assetHolderAddress: makeAddress(AddressZero) // must be even length
  };

  const openingState: State = {
    participants: [participantA, participantB],
    chainId: '0x01',
    challengeDuration: ONE_DAY,
    channelNonce: 0,
    appDefinition: ethers.constants.AddressZero as Address,
    appData: makeAddress(AddressZero), // must be even length
    turnNum: 0,
    outcome,
    isFinal: false
  };

  const richPreFS = addHash(openingState);
  const richPostFS = addHash({...openingState, turnNum: 3});

  const objective: OpenChannelObjective = {
    channelId,
    openingState,
    preFS: {hash: richPreFS.stateHash, signatures: []},
    funding: {amount: BN.from(0), finalized: true},
    fundingRequests: [],
    postFS: {hash: richPostFS.stateHash, signatures: []}
  };

  expect(
    openChannelCranker(
      objective,
      {signedStates: [signStateHelper(richPreFS, 'A')]},
      participantA.privateKey
    )
  ).toMatchObject({
    actions: [],
    objective: {
      preFS: {hash: richPreFS.stateHash, signatures: [{signer: participants.A.signingAddress}]}
    }
  });

  expect(() =>
    openChannelCranker(
      objective,
      {signedStates: [signStateHelper(richPreFS, 'B')]},
      participantA.privateKey
    )
  ).toThrow('funding milestone unimplemented');
});
