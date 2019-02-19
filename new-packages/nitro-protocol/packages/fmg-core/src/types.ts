export { MessageSignature } from "web3-eth-accounts";

export type Address = string;
export type Uint256 = string; // This needs to be stored as a hex string
export type Bytes32 = string;
export type Bytes = string;

// ethersjs lets you pass, and returns a number, for solidity variables of
// the types uint8, uint16, and uint32
export type Uint32 = number;
export type Uint8 = number;