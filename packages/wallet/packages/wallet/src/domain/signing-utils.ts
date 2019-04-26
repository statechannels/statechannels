import { splitSignature, getAddress } from 'ethers/utils';
import { recover, sign, Commitment, toHex } from 'fmg-core';
import { ethers } from 'ethers';
import { MessageSignature } from 'web3/eth/accounts';

export const validCommitmentSignature = (
  commitment: Commitment,
  signature: string,
  address: string,
) => {
  return validSignature(toHex(commitment), signature, address);
};

export const validSignature = (data: string, signature: string, address: string) => {
  try {
    const { v: vNum, r, s } = splitSignature(signature);
    const v = '0x' + (vNum as number).toString(16);

    const recovered = recover(data, { v, r, s } as MessageSignature);

    return recovered === getAddress(address);
  } catch (err) {
    return false;
  }
};

export const signCommitment = (commitment: Commitment, privateKey: string) => {
  return signData(toHex(commitment), privateKey);
};

export const signData = (data: string, privateKey: string) => {
  const signature = sign(data, privateKey) as any;
  return signature.signature;
};

export const signVerificationData = (
  playerAddress: string,
  destination: string,
  amount: string,
  sender: string,
  privateKey,
) => {
  const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];
  const abiCoder = new ethers.utils.AbiCoder();
  const authorization = abiCoder.encode(AUTH_TYPES, [playerAddress, destination, amount, sender]);
  const signature = sign(authorization, privateKey) as any;
  return signature.signature;
};
