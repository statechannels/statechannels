import {ethers} from 'ethers';
import {splitSignature, arrayify} from 'ethers/utils';

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
