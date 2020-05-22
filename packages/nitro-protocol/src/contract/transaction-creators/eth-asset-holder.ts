import {TransactionRequest} from 'ethers/providers';
import {Interface} from 'ethers/utils';

import EthAssetHolderArtifact from '../../../build/contracts/ETHAssetHolder.json';
import {Allocation, Guarantee, Outcome} from '../outcome';
import * as assetHolderTransactionCreator from './asset-holder';

// @ts-ignore
const EthAssetHolderContractInterface = new Interface(EthAssetHolderArtifact.abi);

export function createTransferAllTransaction(
  channelId: string,
  allocation: Allocation
): TransactionRequest {
  return assetHolderTransactionCreator.createTransferAllTransaction(
    EthAssetHolderContractInterface,
    channelId,
    allocation
  );
}

export function createClaimAllTransaction(
  channelId: string,
  guarantee: Guarantee,
  allocation: Allocation
): TransactionRequest {
  return assetHolderTransactionCreator.createClaimAllTransaction(
    EthAssetHolderContractInterface,
    channelId,
    guarantee,
    allocation
  );
}
export function createSetOutcomeTransaction(
  channelId: string,
  outcome: Outcome
): TransactionRequest {
  return assetHolderTransactionCreator.createSetOutcomeTransaction(
    EthAssetHolderContractInterface,
    channelId,
    outcome
  );
}

export function createDepositTransaction(
  destination: string,
  expectedHeld: string,
  amount: string
): TransactionRequest {
  const data = EthAssetHolderContractInterface.functions.deposit.encode([
    destination,
    expectedHeld,
    amount,
  ]);
  return {data};
}
