import {ethers} from 'ethers';
import {splitSignature, arrayify} from 'ethers/utils';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
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

export const ongoinghallengeHash = (turnNumRecord: number = 5) => {
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
      [turnNumRecord, 1e9, HashZero, AddressZero, HashZero], // turnNum = 5, not yet finalized
    ),
  );
};

export const newChallengeClearedEvent = (contract: ethers.Contract, channelId: string) => {
  return new Promise((resolve, reject) => {
    contract.on('ChallengeCleared', (eventChannelId, eventTurnNumRecord, event) => {
      if (eventChannelId === channelId) {
        // match event for this channel only
        // event.removeListener();
        resolve([eventChannelId, eventTurnNumRecord]);
      }
    });
    setTimeout(() => {
      reject(new Error('timeout'));
    }, 60000);
  });
};
