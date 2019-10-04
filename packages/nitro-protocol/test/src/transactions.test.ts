import {TransactionRequest} from 'ethers/providers';

import {Wallet} from 'ethers';
import {AddressZero} from 'ethers/constants';
import {SignedState} from '../../src';
import {Channel} from '../../src/contract/channel';
import {signState} from '../../src/signatures';
import {
  createCheckpointTransaction,
  createConcludeTransaction,
  createForceMoveTransaction,
  createRespondTransaction,
} from '../../src/transactions';

const wallet = Wallet.createRandom();
const channel: Channel = {
  chainId: '0x1',
  channelNonce: '0x1',
  participants: [wallet.address],
};

const challengeState = {
  channel,
  turnNum: 0,
  isFinal: false,
  appDefinition: AddressZero,
  appData: '0x0',
  outcome: [],
  challengeDuration: 0x0,
};
// const challengeChannelStorage: ChannelStorage = {
//   turnNumRecord: 0,
//   finalizesAt: 1e12,
//   stateHash: HashZero,
//   challengerAddress: AddressZero,
//   outcomeHash: HashZero,
// };

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
    wallet.privateKey
  );
});

describe('transaction-generators', () => {
  it('creates a force move transaction', async () => {
    const transactionRequest: TransactionRequest = createForceMoveTransaction(
      [signedState],
      wallet.privateKey
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
        challengeState,
        signedState
      );

      expect(transactionRequest.data).toBeDefined();
    });

    it('throws an error when there is no challenge state', async () => {
      expect(() => {
        createRespondTransaction(null, signedState);
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
