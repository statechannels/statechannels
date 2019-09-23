import {Signature, splitSignature} from 'ethers/utils';
import {hashState, State} from './contract/state';
import {ethers} from 'ethers';
import {SignedState} from '.';
import {getChannelId} from './contract/channel';
import {hashChallengeMessage} from './contract/challenge';
import {toHex} from './hex-utils';
import Web3EthAccounts from 'web3-eth-accounts';

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

export function signState(state: State, privateKey: string): SignedState {
  const wallet = new ethers.Wallet(privateKey);
  if (state.channel.participants.indexOf(wallet.address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const hashedState = hashState(state);

  const signature = signData(hashedState, privateKey);
  return {state, signature};
}

export function signChallengeMessage(signedStates: SignedState[], privateKey: string): Signature {
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

  return signData(challengeHash, privateKey);
}

function signData(hashedData: string, privateKey: string): Signature {
  // We use `web3.eth.accounts` to sign as all ethers.js signing methods are async
  const flatSignature = new Web3EthAccounts('').sign(hashedData, privateKey);
  return splitSignature(flatSignature);
}
