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
