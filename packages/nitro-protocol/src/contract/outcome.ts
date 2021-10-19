import {defaultAbiCoder} from '@ethersproject/abi';
import * as ExitFormat from '@statechannels/exit-format';
import {BytesLike, constants, utils} from 'ethers';

import {Bytes32} from './types';

//
// CONSTANTS
//

export const MAX_OUTCOME_ITEMS = 600;

//
// Types
//

export type AssetOutcome = ExitFormat.SingleAssetExit;

/**
 * The part of a {@link State} which dictates how assets are redistributed when the channel closes
 */
export type Outcome = ExitFormat.Exit; // == AssetOutcome[]

export type SimpleAllocation = ExitFormat.Allocation & {
  allocationType: ExitFormat.AllocationType.simple;
};

export type GuaranteeAllocation = ExitFormat.Allocation & {
  // this will cause executeExit to revert, which is what we want for a guarantee
  // it should only work with a custom 'claim' operation
  allocationType: ExitFormat.AllocationType.guarantee;
};

export type SingleAssetGuaranteeOutcome = AssetOutcome & {
  allocations: GuaranteeAllocation[];
};

export type GuaranteeOutcome = SingleAssetGuaranteeOutcome[];

//
// Functions
//

export const encodeOutcome = ExitFormat.encodeExit;
export const decodeOutcome = ExitFormat.decodeExit;

/**
 * Encodes and hashes an Outcome
 * @param outcome an Outcome
 * @returns a 32 byte keccak256 hash
 */
export function hashOutcome(outcome: Outcome): Bytes32 {
  const encodedOutcome = encodeOutcome(outcome);
  return utils.keccak256(encodedOutcome);
}

export function encodeGuaranteeData(destinations: string[]): BytesLike {
  return defaultAbiCoder.encode(['bytes32[]'], [destinations]);
}

export function decodeGuaranteeData(data: BytesLike): string[] {
  return defaultAbiCoder.decode(['bytes32[]'], data)[0];
}

//
// Example Construction (unused, non-exported)
//

const A_ADDRESS = '0x00000000000000000000000096f7123E3A80C9813eF50213ADEd0e4511CB820f';
const B_ADDRESS = '0x00000000000000000000000053484E75151D07FfD885159d4CF014B874cd2810';
const exampleGuaranteeOutcome1: GuaranteeOutcome = [
  {
    asset: constants.AddressZero,
    metadata: '0x',
    allocations: [
      {
        destination: '0xjointchannel1',
        amount: '0xa',
        allocationType: ExitFormat.AllocationType.guarantee,
        metadata: encodeGuaranteeData([B_ADDRESS, A_ADDRESS]),
      },
      {
        destination: '0xjointchannel2',
        amount: '0xa',
        allocationType: ExitFormat.AllocationType.guarantee,
        metadata: encodeGuaranteeData([A_ADDRESS, B_ADDRESS]),
      },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exampleGuaranteeOutcome2: Outcome = exampleGuaranteeOutcome1; // GuaranteeOutcome is assignable to Outcome
