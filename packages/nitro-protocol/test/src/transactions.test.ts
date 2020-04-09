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
  createSignatureArguments,
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
// Const challengeChannelStorage: ChannelStorage = {
//   TurnNumRecord: 0,
//   FinalizesAt: 1e12,
//   StateHash: HashZero,
//   ChallengerAddress: AddressZero,
//   OutcomeHash: HashZero,
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

  it('creates a correct signature arguments when handling a state with multiple signatures', async () => {
    const wallet2 = Wallet.createRandom();
    const twoPlayerChannel = {...channel, participants: [wallet.address, wallet2.address]};
    const state = {
      turnNum: 0,
      isFinal: false,
      appDefinition: AddressZero,
      appData: '0x0',
      outcome: [],
      channel: twoPlayerChannel,
      challengeDuration: 0x0,
    };
    const signedStates = [
      await signState(state, wallet.privateKey),
      await signState(state, wallet2.privateKey),
    ];
    const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);

    expect(states).toHaveLength(1);
    expect(signatures).toHaveLength(2);
    expect(whoSignedWhat).toEqual([0, 0]);
  });

  it('creates a correct signature arguments when handling multiple states', async () => {
    const wallet2 = Wallet.createRandom();
    const twoPlayerChannel = {...channel, participants: [wallet.address, wallet2.address]};
    const state = {
      turnNum: 0,
      isFinal: false,
      appDefinition: AddressZero,
      appData: '0x0',
      outcome: [],
      channel: twoPlayerChannel,
      challengeDuration: 0x0,
    };
    const signedStates = [
      await signState(
        {
          turnNum: 0,
          isFinal: false,
          appDefinition: AddressZero,
          appData: '0x0',
          outcome: [],
          channel: twoPlayerChannel,
          challengeDuration: 0x0,
        },
        wallet.privateKey
      ),
      await signState(
        {
          turnNum: 1,
          isFinal: false,
          appDefinition: AddressZero,
          appData: '0x0',
          outcome: [],
          channel: twoPlayerChannel,
          challengeDuration: 0x0,
        },
        wallet2.privateKey
      ),
    ];
    const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);

    expect(states).toHaveLength(2);
    expect(signatures).toHaveLength(2);
    expect(whoSignedWhat).toEqual([0, 1]);
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
      }).toThrow();
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
