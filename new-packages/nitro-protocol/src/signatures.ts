import {Signature, arrayify, splitSignature} from 'ethers/utils';
import {hashState, State} from './contract/state';
import {ethers} from 'ethers';
import {SignedState} from '.';
import {getChannelId} from './contract/channel';
import {hashChallengeMessage} from './contract/challenge';
import {toHex} from './hex-utils';

export function getStateSignerAddress(signedState: SignedState): string {
  const stateHash = hashState(signedState.state);
  const recoveredAddress = ethers.utils.verifyMessage(
    ethers.utils.arrayify(stateHash),
    signedState.signature,
  );
  const {channel} = signedState.state;
  const {participants} = channel;

  if (participants.indexOf(recoveredAddress) < 0) {
    throw new Error(
      `Recovered address ${recoveredAddress} is not a participant in channel ${getChannelId(
        channel,
      )}`,
    );
  }
  return recoveredAddress;
}

export async function signState(state: State, privateKey: string): Promise<SignedState> {
  const wallet = new ethers.Wallet(privateKey);
  if (state.channel.participants.indexOf(wallet.address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }
  const hashedState = hashState(state);
  const signature = splitSignature(await wallet.signMessage(arrayify(hashedState)));
  return {state, signature};
}

export async function signChallengeMessage(
  signedStates: SignedState[],
  privateKey: string,
): Promise<Signature> {
  if (signedStates.length === 0) {
    throw new Error('At least one signed state must be provided');
  }
  const wallet = new ethers.Wallet(privateKey);
  if (signedStates[0].state.channel.participants.indexOf(wallet.address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }
  const largestTurnNum = toHex(Math.max(...signedStates.map(s => s.state.turnNum)));
  const channelId = getChannelId(signedStates[0].state.channel);
  const challengeHash = hashChallengeMessage({largestTurnNum, channelId});

  const signature = await wallet.signMessage(arrayify(challengeHash));
  return splitSignature(signature);
}
