import {ethers, Wallet} from 'ethers';

import {Outcome, randomExternalDestination, SignedState} from '../../src';
import {Channel} from '../../src/contract/channel';
import {MAX_OUTCOME_ITEMS} from '../../src/contract/outcome';
import {signState} from '../../src/signatures';
import {
  createCheckpointTransaction,
  createConcludeTransaction,
  createChallengeTransaction,
  createRespondTransaction,
  createSignatureArguments,
  MAX_TX_DATA_SIZE,
} from '../../src/transactions';
import {largeOutcome} from '../test-helpers';

const wallet = Wallet.createRandom();

const channel: Channel = {
  chainId: '0x1',
  channelNonce: 0x1,
  participants: [wallet.address],
};

const challengeState = {
  channel,
  turnNum: 0,
  isFinal: false,
  appDefinition: ethers.constants.AddressZero,
  appData: '0x00',
  outcome: [],
  challengeDuration: 0x0,
};

let signedState: SignedState;

beforeAll(async () => {
  signedState = await signState(
    {
      turnNum: 0,
      isFinal: false,
      appDefinition: ethers.constants.AddressZero,
      appData: '0x00',
      outcome: [],
      channel,
      challengeDuration: 0x0,
    },
    wallet.privateKey
  );
});

describe('transaction-generators', () => {
  it('creates a challenge transaction with MAX_OUTCOME_ITEMS outcome items that is less than MAX_TX_DATA_SIZE', async () => {
    const transactionRequest: ethers.providers.TransactionRequest = createChallengeTransaction(
      [
        await signState(
          {
            turnNum: 0,
            isFinal: false,
            appDefinition: ethers.constants.AddressZero,
            appData: '0x00',
            outcome: largeOutcome(MAX_OUTCOME_ITEMS),
            channel,
            challengeDuration: 0x0,
          },
          wallet.privateKey
        ),
      ],
      wallet.privateKey
    );

    expect(transactionRequest.data.toString().slice(2).length / 2).toBeLessThan(MAX_TX_DATA_SIZE); // it's a hex string, so divide by 2 for bytes
  });

  it('creates a challenge transaction', async () => {
    const transactionRequest: ethers.providers.TransactionRequest = createChallengeTransaction(
      [signedState],
      wallet.privateKey
    );

    expect(transactionRequest.data).toBeDefined();
  });

  it('creates a conclude from open transaction', async () => {
    const transactionRequest: ethers.providers.TransactionRequest = createConcludeTransaction([
      signedState,
    ]);

    expect(transactionRequest.data).toBeDefined();
  });

  it('creates a conclude from challenged transaction', async () => {
    const transactionRequest: ethers.providers.TransactionRequest = createConcludeTransaction([
      signedState,
    ]);

    expect(transactionRequest.data).toBeDefined();
  });

  it.each`
    turnNum   | expectedWhoSignedWhat
    ${[0, 1]} | ${[0, 1]}
    ${[1, 2]} | ${[1, 0]}
  `(
    'creates a correct signature arguments when handling multiple states',
    async ({turnNum, expectedWhoSignedWhat}) => {
      const wallet2 = Wallet.createRandom();
      const twoPlayerChannel = {...channel, participants: [wallet.address, wallet2.address]};

      const signedStates = [
        await signState(
          {
            turnNum: turnNum[0],
            isFinal: false,
            appDefinition: ethers.constants.AddressZero,
            appData: '0x00',
            outcome: [],
            channel: twoPlayerChannel,
            challengeDuration: 0x0,
          },
          turnNum[0] % 2 === 0 ? wallet.privateKey : wallet2.privateKey
        ),
        await signState(
          {
            turnNum: turnNum[1],
            isFinal: false,
            appDefinition: ethers.constants.AddressZero,
            appData: '0x00',
            outcome: [],
            channel: twoPlayerChannel,
            challengeDuration: 0x0,
          },
          turnNum[1] % 2 === 0 ? wallet.privateKey : wallet2.privateKey
        ),
      ];
      const {states, signatures, whoSignedWhat} = createSignatureArguments(signedStates);

      expect(states).toHaveLength(2);
      expect(signatures).toHaveLength(2);
      expect(whoSignedWhat).toEqual(expectedWhoSignedWhat);
    }
  );

  describe('respond transactions', () => {
    it('creates a transaction', async () => {
      const transactionRequest: ethers.providers.TransactionRequest = createRespondTransaction(
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
      const transactionRequest: ethers.providers.TransactionRequest = createCheckpointTransaction([
        signedState,
      ]);

      expect(transactionRequest.data).toBeDefined();
    });

    it('creates a transaction when the chabbnel is open', async () => {
      const transactionRequest: ethers.providers.TransactionRequest = createCheckpointTransaction([
        signedState,
      ]);

      expect(transactionRequest.data).toBeDefined();
    });
  });
});
