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

export const outcomeSolidity = 'tuple(address token, bytes typedOutcome)[]';
export const typedOutcomeSolidity = 'tuple(uint8 outcomeType, bytes data)';

export function encodeAllocation(allocation: AllocationOutcome): string {
  return defaultAbiCoder.encode(
    [outcomeSolidity],
    [
      allocation.tokenAllocations.reduce((out, { token, proposedTransfers }) => {
        return out.concat({
          token,
          typedOutcome: defaultAbiCoder.encode(
            [typedOutcomeSolidity],
            [[ALLOCATION, encodeTransfers(proposedTransfers)]],
          ),
        });
      }, []),
    ],
  );
}

export function encodeTransfers(transfers: Transfer[]): string {
  const allocationDataSolidity = 'tuple(address destination, uint256 amount)[]';
  return defaultAbiCoder.encode([allocationDataSolidity], [transfers]);
}
