// NOTE: These were copy and pasted from fmg-core to remove the fmg-core
// dependency. It would be better if we imported these types from nitro-protocol
export declare type Byte = string;
export declare type Bytes32 = string;
export declare type Bytes = string;
export declare type Uint8 = number;
export declare type Uint32 = number;
export declare type Uint64 = string;
export declare type Uint128 = string;
export declare type Uint256 = string;
export type Address = string;
export interface Channel {
  channelType: Address;
  nonce: Uint32;
  participants: Address[];
  guaranteedChannel?: Address;
}
export interface BaseCommitment {
  channel: Channel;
  turnNum: Uint32;
  allocation: Uint256[];
  destination: Address[];
  commitmentCount: Uint32;
}
export declare enum CommitmentType {
  PreFundSetup = 0,
  PostFundSetup = 1,
  App = 2,
  Conclude = 3
}
// END COMMENT

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
