import {Signature, arrayify, splitSignature} from 'ethers/utils';
import {State, hashState} from './contract/state';
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

export async function signChallengeMessage(
  signedStates: SignedState[],
  privateKey: string,
): Promise<Signature> {
  const largestTurnNum = toHex(
    signedStates.reduce(
      (s1, s2) => (s1.state.turnNum >= s2.state.turnNum ? s1 : s2),
      signedStates[0],
    ).state.turnNum,
  );
  const channelId = getChannelId(signedStates[0].state.channel);
  const challengeHash = hashChallengeMessage({largestTurnNum, channelId});
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(arrayify(challengeHash));
  return splitSignature(signature);
}
