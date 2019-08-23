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
export const clearedChallengeHash = keccak256(
  defaultAbiCoder.encode(
    ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
    [5, 0, HashZero, AddressZero, HashZero], // turnNum = 5
  ),
);

export const ongoinghallengeHash = keccak256(
  defaultAbiCoder.encode(
    ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
    [5, 9999, HashZero, AddressZero, HashZero], // turnNum = 5, not yet finalized
  ),
);
