import Web3 from 'web3';
import { Signature, Uint256 } from './types';
import { bigNumberify } from 'ethers/utils';

export function toUint256(num: number): Uint256 {
  return bigNumberify(num).toHexString();
}

export enum SolidityType {
  // For now, we only allow the types that we'd use.
  bool = 'bool',
  uint8 = 'uint8',
  uint256 = 'uint256',
  address = 'address',
  bytes = 'bytes',
  bytes32 = 'bytes32',
}

export class SolidityParameter {
  type: SolidityType;
  value: string;

  constructor({ type, value }) {
    this.type = type;
    this.value = value;
  }
}

export type SignableData = string | SolidityParameter | SolidityParameter[];

export function sign(data: SignableData, privateKey): Signature {
  const localWeb3 = new Web3('');
  return localWeb3.eth.accounts.sign(hash(data), privateKey);
}

export function recover(data: SignableData, signature: Signature): string {
  const web3 = new Web3('');
  const { v, r, s } = signature;
  return web3.eth.accounts.recover(hash(data), v, r, s);
}

function hash(data: SignableData): string {
  if (typeof data === 'string' || data instanceof SolidityParameter) {
    return Web3.utils.soliditySha3(data);
  } else {
    return Web3.utils.soliditySha3(...data);
  }
}

export function decodeSignature(signature: string): { v; r; s } {
  const r = '0x' + signature.slice(2, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = '0x' + signature.slice(130, 132);

  return { v, r, s };
}
