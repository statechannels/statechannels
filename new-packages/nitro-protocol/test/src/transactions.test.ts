import {TransactionRequest} from 'ethers/providers';
import {ethers} from 'ethers';

import {
  createForceMoveTransaction,
  createConcludeTransaction,
  createRespondTransaction,
  createCheckpointTransaction,
} from '../../src/transactions';
import {ChannelStorage} from '../../src';
import {AddressZero} from 'ethers/constants';
import {signChallengeMessage, signState} from '../../src/signatures';
import {Channel} from '../../src/contract/channel';
import {SignedState} from '../../src';
import {Signature} from 'ethers/utils';

const wallet = ethers.Wallet.createRandom();
const channel: Channel = {
  chainId: '0x1',
  channelNonce: '0x1',
  participants: [wallet.address],
};
const channelStorage: ChannelStorage = {
  turnNumRecord: 0,
  finalizesAt: 0x0,
  challengerAddress: AddressZero,
};
const challengeChannelStorage: ChannelStorage = {
  turnNumRecord: 5,
  finalizesAt: 0x9,
  challengerAddress: ethers.Wallet.createRandom().address,
  challengeState: {
    turnNum: 0,
    isFinal: false,
    appDefinition: AddressZero,
    appData: '0x0',
    outcome: [],
    channel,
    challengeDuration: 0x0,
  },
};

let challengeSignature: Signature;
let signedState: SignedState;

beforeAll(async () => {
  signedState = await signState(
    {
      turnNum: 0,
      isFinal: false,
      appDefinition: AddressZero,
      appData: '0x0',
      outcome: [],
      channel,
      challengeDuration: 0x0,
    },
    wallet.privateKey,
  );

  challengeSignature = await signChallengeMessage([signedState], wallet.privateKey);
});
describe('transactions', async () => {
  it('creates a force move transaction', async () => {
    const transactionRequest: TransactionRequest = createForceMoveTransaction(
      channelStorage,
      [signedState],
      challengeSignature,
    );

    expect(transactionRequest.data).toBeDefined();
  });

  it('creates a conclude from open transaction', async () => {
    const transactionRequest: TransactionRequest = createConcludeTransaction(channelStorage, [
      signedState,
    ]);

    expect(transactionRequest.data).toBeDefined();
  });

  it('creates a conclude from challenged transaction', async () => {
    const transactionRequest: TransactionRequest = createConcludeTransaction(channelStorage, [
      signedState,
    ]);

    expect(transactionRequest.data).toBeDefined();
  });

  describe('respond transactions', () => {
    it('creates a transaction', async () => {
      const transactionRequest: TransactionRequest = createRespondTransaction(
        challengeChannelStorage,
        signedState,
      );

      expect(transactionRequest.data).toBeDefined();
    });
    it('throws an error when there is no challenge state', async () => {
      expect(() => {
        createRespondTransaction(channelStorage, signedState);
      }).toThrowError();
    });
  });
  describe('respond with checkpoint transactions', () => {
    it('creates a transaction', async () => {
      const transactionRequest: TransactionRequest = createCheckpointTransaction(
        challengeChannelStorage,
        [signedState],
      );

      expect(transactionRequest.data).toBeDefined();
    });
    it('throws an error when there is no challenge state', async () => {
      expect(() => {
        createCheckpointTransaction(channelStorage, [signedState]);
      }).toThrowError();
    });
  });
});
