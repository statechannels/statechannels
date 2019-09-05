import {ethers} from 'ethers';
import {splitSignature, arrayify, keccak256, defaultAbiCoder} from 'ethers/utils';
import {HashZero, AddressZero} from 'ethers/constants';

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
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
      [turnNumRecord, 0, HashZero, AddressZero, HashZero], // turnNum = 5
    ),
  );
};

export const ongoingChallengeHash = (turnNumRecord: number = 5) => {
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
      [turnNumRecord, 1e12, HashZero, AddressZero, HashZero], // turnNum = 5, not yet finalized (31000 years after genesis block)
    ),
  );
};

export const finalizedOutcomeHash = (
  turnNumRecord: number = 5,
  finalizesAt: number = 1,
  stateHash: string = HashZero,
  challengerAddress: string = AddressZero,
  outcomeHash: string = HashZero,
) => {
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
      [turnNumRecord, finalizesAt, stateHash, AddressZero, outcomeHash], // finalizes at 1 second after genesis block (by default)
      // the final two fields should also not be zero
    ),
  );
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
export const computeChannelId = (
  chainId: number,
  participants: string[],
  channelNonce: number,
): string => {
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'address[]', 'uint256'],
      [chainId, participants, channelNonce],
    ),
  );
};
