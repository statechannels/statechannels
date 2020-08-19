import {Wallet, utils} from 'ethers';
import {AddressZero} from 'ethers/constants';
import {arrayify, splitSignature, verifyMessage} from 'ethers/utils';

import {hashChallengeMessage} from '../../src/contract/challenge';
import {hashState, State} from '../../src/contract/state';
import {
  getStateSignerAddress,
  signChallengeMessage,
  signState,
  fastSignState,
} from '../../src/signatures';

describe('signatures', () => {
  describe('signState', () => {
    it.only('sign vs fastSign', async () => {
      const wallet = Wallet.createRandom();
      const state: State = {
        channel: {chainId: '0x1', channelNonce: 0x01, participants: [wallet.address]},
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };

      const signedState = signState(state, wallet.privateKey);
      const fastSignedState = fastSignState(state, wallet.privateKey);
      console.log(utils.joinSignature(signedState.signature));
      console.log(`The private key is ${wallet.privateKey}`);
      expect(utils.joinSignature(signedState.signature)).toEqual((await fastSignedState).signature);
    });

    it('signs a state', async () => {
      const wallet = Wallet.createRandom();
      const state: State = {
        channel: {chainId: '0x1', channelNonce: 0x01, participants: [wallet.address]},
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };

      const signedState = signState(state, wallet.privateKey);

      const hashedState = hashState(state);
      const signature = splitSignature(await wallet.signMessage(arrayify(hashedState)));

      expect(signedState).toMatchObject({
        state,
        signature,
      });

      expect(getStateSignerAddress(signedState)).toEqual(wallet.address);
    });

    it('throws an exception if signing with non-participant private key', () => {
      const wallet = Wallet.createRandom();
      const state: State = {
        channel: {
          chainId: '0x1',
          channelNonce: 0x01,
          participants: [Wallet.createRandom().address],
        },
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };

      expect(() => {
        signState(state, wallet.privateKey);
      }).toThrow();
    });
  });
  describe('signChallengeMessage', () => {
    it('signs a challenge message', async () => {
      const wallet = Wallet.createRandom();
      const channel = {chainId: '0x1', channelNonce: 0x01, participants: [wallet.address]};
      const state: State = {
        channel,
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };

      const signature = signChallengeMessage(
        [signState(state, wallet.privateKey)],
        wallet.privateKey
      );

      const challenger = verifyMessage(arrayify(hashChallengeMessage(state)), signature);
      expect(challenger).toEqual(wallet.address);
    });

    it('throws an exception if signing with non-participant private key', async () => {
      const wallet = Wallet.createRandom();
      const state: State = {
        channel: {
          chainId: '0x1',
          channelNonce: 0x01,
          participants: [Wallet.createRandom().address],
        },
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };
      const hashedState = hashState(state);
      const signature = splitSignature(await wallet.signMessage(arrayify(hashedState)));
      expect(() => {
        signChallengeMessage([{state, signature}], wallet.privateKey);
      }).toThrow();
    });
  });
  describe('getStateSignerAddress', () => {
    it('correctly recovers a state signer address', async () => {
      const wallet = Wallet.createRandom();
      const state: State = {
        channel: {chainId: '0x1', channelNonce: 0x1, participants: [wallet.address]},
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };
      const hashedState = hashState(state);
      const signature = splitSignature(await wallet.signMessage(arrayify(hashedState)));

      expect(getStateSignerAddress({state, signature})).toEqual(wallet.address);
    });

    it('throws an exception when the signer is not a participant', async () => {
      const wallet = Wallet.createRandom();
      const state: State = {
        channel: {
          chainId: '0x1',
          channelNonce: 0x1,
          participants: [Wallet.createRandom().address],
        },
        outcome: [],
        turnNum: 1,
        isFinal: false,
        appData: '0x0',
        appDefinition: AddressZero,
        challengeDuration: 0x5,
      };
      const hashedState = hashState(state);
      const signature = splitSignature(await wallet.signMessage(arrayify(hashedState)));

      expect(() => getStateSignerAddress({state, signature})).toThrow();
    });
  });
});
