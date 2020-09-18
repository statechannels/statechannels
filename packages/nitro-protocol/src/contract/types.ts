import {BigNumber, BigNumberish, utils} from 'ethers';

//https: medium.com/@KevinBGreene/surviving-the-typescript-ecosystem-branding-and-type-tagging-6cf6e516523d
type Brand<T, B> = T & {_brand: B};

export type Address = string;
export type Destination = Brand<Bytes32, 'Destination'>;

export type Byte = string; // 0x + val(length 4)
export type Bytes32 = string; // 0x + val(length 64)
export type Bytes = string;

// Ethersjs lets you pass, and returns a number, for solidity variables of
// The types uint8, uint16, and uint32
export type Uint8 = number;
export type Uint16 = number;
export type Uint24 = number;
export type Uint32 = number;
export type Uint40 = number;
export type Uint48 = number;
// These can only be safely stored as a hex string, which is the type that ethers returns
// const a: Uint256 = '0xa' as Uint256;
// const b: Uint256 = '0xb' as Uint256;
// const s: Uint256 = a + b; // Type error: Type 'string' is not assignable to type 'Uint256'
export type Uint56 = Brand<string, 'Uint56'>;
export type Uint64 = Brand<string, 'Uint64'>;
export type Uint128 = Brand<string, 'Uint128'>;
export type Uint256 = Brand<string, 'Uint256'>;

export function toUint256(bigNumberish: BigNumberish): Uint256 {
  return utils.hexZeroPad(BigNumber.from(bigNumberish).toHexString(), 32) as Uint256;
}

export function makeDestination(addressOrDestination: string): Destination {
  if (addressOrDestination.length === 42) {
    return utils.hexZeroPad(utils.getAddress(addressOrDestination), 32) as Destination;
  } else if (addressOrDestination.length === 66) {
    return addressOrDestination as Destination;
  } else {
    throw new Error('Invalid input');
  }
}
