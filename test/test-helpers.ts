import {ethers, Wallet} from 'ethers';
import {
  splitSignature,
  arrayify,
  keccak256,
  defaultAbiCoder,
  bigNumberify,
  Signature,
} from 'ethers/utils';
import {AddressZero} from 'ethers/constants';

import {hashChannelStorage} from '../src/channel-storage';
import {
  Outcome,
  encodeAllocation,
  hashOutcomeContent,
  encodeGuarantee,
  Guarantee,
  Allocation,
} from '../src/outcome';
import {State, hashState} from '../src/state';
import {TransactionRequest} from 'ethers/providers';

export async function setupContracts(provider: ethers.providers.JsonRpcProvider, artifact) {
  const networkId = (await provider.getNetwork()).chainId;
  const signer = provider.getSigner(0);
  const contractAddress = artifact.networks[networkId].address;
  const contract = new ethers.Contract(contractAddress, artifact.abi, signer);
  return contract;
}

export async function sign(wallet: ethers.Wallet, msgHash: string | Uint8Array) {
  // msgHash is a hex string
  // returns an object with v, r, and s properties.
  return splitSignature(await wallet.signMessage(arrayify(msgHash)));
}

export const nonParticipant = ethers.Wallet.createRandom();

export const clearedChallengeHash = (turnNumRecord: number = 5) => {
  return hashChannelStorage({
    largestTurnNum: bigNumberify(turnNumRecord).toHexString(),
    finalizesAt: '0x0',
    challengerAddress: AddressZero,
  });
};

export const ongoingChallengeHash = (turnNumRecord: number = 5) => {
  return hashChannelStorage({
    largestTurnNum: bigNumberify(turnNumRecord).toHexString(),
    finalizesAt: bigNumberify(1e12).toHexString(),
    challengerAddress: AddressZero,
  });
};

export const finalizedOutcomeHash = (
  turnNumRecord: number = 5,
  finalizesAt: number = 1,
  challengerAddress: string = AddressZero,
  state?: State,
  outcome?: Outcome,
) => {
  return hashChannelStorage({
    largestTurnNum: bigNumberify(turnNumRecord).toHexString(),
    finalizesAt: bigNumberify(finalizesAt).toHexString(),
    state,
    challengerAddress,
    outcome,
  });
};

export const newForceMoveEvent = (contract: ethers.Contract, channelId: string) => {
  const filter = contract.filters.ForceMove(channelId);
  return new Promise((resolve, reject) => {
    contract.on(
      filter,
      (
        eventChannelIdArg,
        eventTurnNumRecordArg,
        eventFinalizesAtArg,
        eventChallengerArg,
        eventIsFinalArg,
        eventFixedPartArg,
        eventChallengeVariablePartArg,
        event,
      ) => {
        contract.removeAllListeners(filter);
        resolve([
          eventChannelIdArg,
          eventTurnNumRecordArg,
          eventFinalizesAtArg,
          eventChallengerArg,
          eventIsFinalArg,
          eventFixedPartArg,
          eventChallengeVariablePartArg,
        ]);
      },
    );
  });
};

export const newChallengeClearedEvent = (contract: ethers.Contract, channelId: string) => {
  const filter = contract.filters.ChallengeCleared(channelId);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventChannelId, eventTurnNumRecord, event) => {
      // match event for this channel only
      contract.removeAllListeners(filter);
      resolve([eventChannelId, eventTurnNumRecord]);
    });
  });
};

export const newConcludedEvent = (contract: ethers.Contract, channelId: string) => {
  const filter = contract.filters.Concluded(channelId);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventChannelId, event) => {
      // match event for this channel only
      contract.removeAllListeners(filter);
      resolve([channelId]);
    });
  });
};

export const newDepositedEvent = (contract: ethers.Contract, destination: string) => {
  const filter = contract.filters.Deposited(destination);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventDestination, amountDeposited, amountHeld, event) => {
      // match event for this destination only
      contract.removeAllListeners(filter);
      resolve([eventDestination, amountDeposited, amountHeld]);
    });
  });
};

export const newTransferEvent = (contract: ethers.Contract, to: string) => {
  const filter = contract.filters.Transfer(null, to);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventFrom, eventTo, amountTransferred, event) => {
      // match event for this destination only
      contract.removeAllListeners(filter);
      resolve(amountTransferred);
    });
  });
};

export const newAssetTransferredEvent = (contract: ethers.Contract, destination: string) => {
  const filter = contract.filters.AssetTransferred(destination);
  return new Promise((resolve, reject) => {
    contract.on(filter, (eventDestination, amountTransferred, event) => {
      // match event for this destination only
      contract.removeAllListeners(filter);
      resolve(amountTransferred);
    });
  });
};

export function randomChannelId(channelNonce = 0) {
  // populate participants array (every test run targets a unique channel)
  const participants = [];
  for (let i = 0; i < 3; i++) {
    participants[i] = ethers.Wallet.createRandom().address;
  }
  // compute channelId
  const channelId = keccak256(
    defaultAbiCoder.encode(['uint256', 'address[]', 'uint256'], [1234, participants, channelNonce]),
  );
  return channelId;
}

export async function sendTransaction(
  provider: ethers.providers.JsonRpcProvider,
  contractAddress: string,
  transaction: TransactionRequest,
) {
  const signer = provider.getSigner();
  const response = await signer.sendTransaction({to: contractAddress, ...transaction});
  await response.wait();
}

export function allocationToParams(allocation: Allocation) {
  const allocationBytes = encodeAllocation(allocation);

  const outcomeContentHash = hashOutcomeContent(allocation);
  return [allocationBytes, outcomeContentHash];
}

export function guaranteeToParams(guarantee: Guarantee) {
  const guaranteeBytes = encodeGuarantee(guarantee);

  const outcomeContentHash = hashOutcomeContent(guarantee);
  return [guaranteeBytes, outcomeContentHash];
}

export async function signStates(
  states: State[],
  wallets: Wallet[],
  whoSignedWhat: number[],
): Promise<Signature[]> {
  const stateHashes = states.map(s => hashState(s));
  const promises = wallets.map(async (w, i) => await sign(w, stateHashes[whoSignedWhat[i]]));
  return Promise.all(promises);
}
