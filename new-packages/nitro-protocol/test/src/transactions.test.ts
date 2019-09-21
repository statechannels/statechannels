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
import {signState} from '../../src/signatures';
import {Channel} from '../../src/contract/channel';
import {SignedState} from '../../src';

const wallet = ethers.Wallet.createRandom();
const channel: Channel = {
  chainId: '0x1',
  channelNonce: '0x1',
  participants: [wallet.address],
};
const openChannelStorage: ChannelStorage = {
  turnNumRecord: 0,
  finalizesAt: 0x0,
};
const challengeChannelStorage: ChannelStorage = {
  turnNumRecord: 0,
  finalizesAt: 1e12,
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
});
describe('transactions', async () => {
  it('creates a force move transaction', async () => {
    const transactionRequest: TransactionRequest = createForceMoveTransaction(
      [signedState],
      wallet.privateKey,
    );

    expect(transactionRequest.data).toBeDefined();
  });

  it('creates a conclude from open transaction', async () => {
    const transactionRequest: TransactionRequest = createConcludeTransaction([signedState]);

    expect(transactionRequest.data).toBeDefined();
  });

  it('creates a conclude from challenged transaction', async () => {
    const transactionRequest: TransactionRequest = createConcludeTransaction([signedState]);

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
        createRespondTransaction(openChannelStorage, signedState);
      }).toThrowError();
    });
  });

  describe('respond with checkpoint transactions', () => {
    it('creates a transaction when there is a challenge state', async () => {
      const transactionRequest: TransactionRequest = createCheckpointTransaction([signedState]);

      expect(transactionRequest.data).toBeDefined();
    });

    it('creates a transaction when the chabbnel is open', async () => {
      const transactionRequest: TransactionRequest = createCheckpointTransaction([signedState]);

      expect(transactionRequest.data).toBeDefined();
    });
  });
});
