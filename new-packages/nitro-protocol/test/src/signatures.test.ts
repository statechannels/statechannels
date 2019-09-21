import {ethers} from 'ethers';
import {hashState, State} from '../../src/contract/state';
import {AddressZero} from 'ethers/constants';
import {arrayify, splitSignature} from 'ethers/utils';
import {getStateSignerAddress, signChallengeMessage, signState} from '../../src/signatures';

describe('signatures', () => {
  describe('signState', () => {
    it('signs a state', async () => {
      const wallet = ethers.Wallet.createRandom();
      const state: State = {
        channel: {chainId: '0x1', channelNonce: '0x1', participants: [wallet.address]},
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
      const wallet = ethers.Wallet.createRandom();
      const state: State = {
        channel: {
          chainId: '0x1',
          channelNonce: '0x1',
          participants: [ethers.Wallet.createRandom().address],
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
      }).toThrowError();
    });
  });
  describe('signChallengeMessage', () => {
    it('signs a challenge message', async () => {
      const wallet = ethers.Wallet.createRandom();
      const channel = {chainId: '0x1', channelNonce: '0x1', participants: [wallet.address]};
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
        [{state, signature: {v: 0, r: '', s: ''}}],
        wallet.privateKey,
      );

      expect(getStateSignerAddress({state, signature})).toEqual(wallet.address);
    });

    it('throws an exception if signing with non-participant private key', async () => {
      const wallet = ethers.Wallet.createRandom();
      const state: State = {
        channel: {
          chainId: '0x1',
          channelNonce: '0x1',
          participants: [ethers.Wallet.createRandom().address],
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
      }).toThrowError();
    });
  });
  describe('getStateSignerAddress', () => {
    it('correctly recovers a state signer address', async () => {
      const wallet = ethers.Wallet.createRandom();
      const state: State = {
        channel: {chainId: '0x1', channelNonce: '0x1', participants: [wallet.address]},
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
      const wallet = ethers.Wallet.createRandom();
      const state: State = {
        channel: {
          chainId: '0x1',
          channelNonce: '0x1',
          participants: [ethers.Wallet.createRandom().address],
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

      expect(() => getStateSignerAddress({state, signature})).toThrowError();
    });
  });
});
