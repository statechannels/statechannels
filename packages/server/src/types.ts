import { Address, BaseCommitment, Bytes, Bytes32, CommitmentType, Uint32, Uint8 } from 'fmg-core';

export type CommitmentString = string;

export interface Signature {
  r: Bytes32;
  s: Bytes32;
  v: Uint8;
}

export interface UpdateChannelParams {
  from: Address;
  commitment: CommitmentString;
  signature: Signature;
}

export type AppAttrExtractor = (attrs: Bytes) => any;
export type AppAttrSanitizer = (attrs: any) => Bytes;
export interface AppCommitment extends BaseCommitment {
  appAttributes: any;
  commitmentType: CommitmentType;
}

export { Address, Bytes32, Bytes, Uint8, Uint32 };
