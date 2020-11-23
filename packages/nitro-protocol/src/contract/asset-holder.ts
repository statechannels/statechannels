import { utils, BigNumber } from 'ethers';

import { parseEventResult } from '../ethers-utils';

export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export interface AssetTransferredEvent {
  channelId: string;
  destination: string;
  amount: BigNumber;
}

export function getDepositedEvent(eventResult: any[]): DepositedEvent {
  const { destination, amountDeposited, destinationHoldings } = parseEventResult(eventResult);
  return {
    destination,
    amountDeposited: BigNumber.from(amountDeposited),
    destinationHoldings: BigNumber.from(destinationHoldings),
  };
}

export function getAssetTransferredEvent(eventResult: any[]): AssetTransferredEvent {
  const { channelId, destination, amount } = parseEventResult(eventResult);
  return {
    channelId,
    destination,
    amount: BigNumber.from(amount),
  };
}

export function convertBytes32ToAddress(bytes32: string): string {
  const normalized = BigNumber.from(bytes32).toHexString();
  return utils.getAddress(`0x${normalized.slice(-40)}`);
}

// e.g.,
// 0x9546E319878D2ca7a21b481F873681DF344E0Df8 becomes
// 0x0000000000000000000000009546E319878D2ca7a21b481F873681DF344E0Df8
export function convertAddressToBytes32(address: string): string {
  const normalizedAddress = BigNumber.from(address).toHexString();
  if (!utils.isAddress(address)) {
    throw new Error(`Input is not a valid Ethereum address.`);
  }

  // We pad to 66 = (32*2) + 2('0x')
  return utils.hexZeroPad(normalizedAddress, 32);
}
