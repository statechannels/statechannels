export type Address = string;

export type Byte = string; // should be 4 long: 0x + val
export type Bytes32 = string; // should be 64 long: 0x + val
export type Bytes = string;

// ethersjs lets you pass, and returns a number, for solidity variables of
// the types uint8, uint16, and uint32
export type Uint8 = number;
export type Uint32 = number;
// these can only be safely stored as a hex string, which is the type that ethers returns
export type Uint64 = string; 
export type Uint128 = string; 
export type Uint256 = string; 

// the type declarations for the web3.eth.accounts.sign method is MessageSignature,
// which is a bit wrong.
// We record the actual interface here, which is correct up to v1.0.0-beta.44, at least
// https://github.com/ethereum/web3.js/blob/v1.0.0-beta.44/packages/web3-eth-accounts/src/Accounts.js#L303-L310
type SigString = string; // should be 132 characters, 0x + r.slice(2) + s.slice(2) + v.slice(2)
export interface MessageSignature { 
  message: Bytes;
  messageHash: Bytes32;
  v: Byte;
  r: Bytes32;
  s: Bytes32;
  signature: SigString;
}
export interface Signature {
  v: Byte;
  r: Bytes32;
  s: Bytes32;
}