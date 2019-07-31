import { Address, Uint256 } from './types';
import { ADDRESS_ZERO } from '.';
import { defaultAbiCoder, BigNumberish, bigNumberify } from 'ethers/utils';

const ALLOCATION = 0;
const GUARANTEE = 1;

export type Outcome = AllocationOutcome | GuaranteeOutcome;

interface AllocationOutcome {
  type: typeof ALLOCATION;
  tokenAllocations: TokenAllocation[];
}

interface GuaranteeOutcome {
  type: typeof GUARANTEE;
  guaranteedChannelAddress: Address;
  tokenGuarantees: TokenGuarantee[];
}

interface TokenAllocation {
  token: Address;
  proposedTransfers: Transfer[];
}

interface Transfer {
  destination: Address;
  amount: Uint256;
}

interface TokenGuarantee {
  token: Address;
  prioritizedAddresses: Address[];
}

export const ETH = ADDRESS_ZERO;

// -------
// Helpers
// -------

export function isAllocation(outcome: Outcome): outcome is AllocationOutcome {
  return outcome.type === ALLOCATION;
}

export function isGuarantee(outcome: Outcome): outcome is GuaranteeOutcome {
  return outcome.type === GUARANTEE;
}

type TokenTransfer = [Address, BigNumberish, Address]; // destination, amount, token

export function makeAllocation(transfers: TokenTransfer[]): AllocationOutcome {
  // group by token
  const allocationsByToken = transfers.reduce((grouped, transfer) => {
    const [destination, amount, token] = transfer;
    const tokenAllocation = grouped[token] || { token, proposedTransfers: [] };
    tokenAllocation.proposedTransfers = tokenAllocation.proposedTransfers.concat({
      destination,
      amount: bigNumberify(amount),
    });
    grouped[token] = tokenAllocation;
    return grouped;
  }, {});

  return {
    type: ALLOCATION,
    tokenAllocations: Object.values(allocationsByToken),
  };
}

const tokenOutcomeSolidity = 'tuple(address token, bytes typedOutcome)[]';
const typedOutcomeSolidity = 'tuple(uint8 outcomeType, bytes data)';

export function encodeAllocation(allocation: AllocationOutcome): string {
  return defaultAbiCoder.encode(
    [tokenOutcomeSolidity],
    [
      allocation.tokenAllocations.map(({ token, proposedTransfers }) => {
        return {
          token,
          typedOutcome: defaultAbiCoder.encode(
            [typedOutcomeSolidity],
            [[ALLOCATION, encodeTransfers(proposedTransfers)]],
          ),
        };
      }),
    ],
  );
}

function encodeTransfers(transfers: Transfer[]): string {
  const allocationDataSolidity = 'tuple(address destination, uint256 amount)[]';
  return defaultAbiCoder.encode([allocationDataSolidity], [transfers]);
}

type TokenGuaranteeParam = [Address, Address[]]; // token address, priorities

export function makeGuarantee(
  guaranteedChannelAddress: Address,
  guarantees: TokenGuaranteeParam[],
): GuaranteeOutcome {
  return {
    type: GUARANTEE,
    guaranteedChannelAddress,
    tokenGuarantees: guarantees.map(([token, prioritizedAddresses]) => ({
      token,
      prioritizedAddresses,
    })),
  };
}

const guaranteeDataSolidity = 'tuple(address guaranteedChannelId, address[] destinations)';
export function encodeGuarantee(guarantee: GuaranteeOutcome): string {
  return defaultAbiCoder.encode(
    [tokenOutcomeSolidity],
    [
      guarantee.tokenGuarantees.map(({ token, prioritizedAddresses }) => {
        return {
          token,
          typedOutcome: defaultAbiCoder.encode(
            [typedOutcomeSolidity],
            [
              [
                GUARANTEE,
                encodePriorities(guarantee.guaranteedChannelAddress, prioritizedAddresses),
              ],
            ],
          ),
        };
        //
      }),
    ],
  );
}

function encodePriorities(
  guaranteedChannelAddress: Address,
  prioritizedAddresses: Address[],
): string {
  return defaultAbiCoder.encode(
    [guaranteeDataSolidity],
    [[guaranteedChannelAddress, prioritizedAddresses]],
  );
}
