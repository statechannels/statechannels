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

      const signedState = await signState(state, wallet.privateKey);

      expect(signedState).toMatchObject({
        state,
        signature: {
          r: expect.any(String),
          s: expect.any(String),
          v: expect.any(Number),
        },
      });

      expect(getStateSignerAddress(signedState)).toEqual(wallet.address);
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

      await expect(signState(state, wallet.privateKey)).rejects.toThrowError();
    });
  });
  describe('signChallengeMessage', () => {
    it('signs a challenge message', async () => {
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
      expect(await signChallengeMessage([{state, signature}], wallet.privateKey)).toMatchObject({
        r: expect.any(String),
        s: expect.any(String),
        v: expect.any(Number),
      });
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
      await expect(
        signChallengeMessage([{state, signature}], wallet.privateKey),
      ).rejects.toThrowError();
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
