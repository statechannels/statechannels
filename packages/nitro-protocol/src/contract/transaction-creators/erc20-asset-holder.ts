import {TransactionRequest} from 'ethers/providers';
import {Interface} from 'ethers/utils';

import Erc20AssetHolderArtifact from '../../../build/contracts/ERC20AssetHolder.json';
import {Allocation, Guarantee, Outcome} from '../outcome';
import * as assetHolderTransactionCreator from './asset-holder';

// @ts-ignore
const Erc20AssetHolderContractInterface = new Interface(Erc20AssetHolderArtifact.abi);

export function createTransferAllTransaction(
  channelId: string,
  allocation: Allocation
): TransactionRequest {
  return assetHolderTransactionCreator.createTransferAllTransaction(
    Erc20AssetHolderContractInterface,
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
    Erc20AssetHolderContractInterface,
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
    Erc20AssetHolderContractInterface,
    channelId,
    outcome
  );
}
export function createDepositTransaction(
  destination: string,
  expectedHeld: string,
  amount: string
): TransactionRequest {
  const data = Erc20AssetHolderContractInterface.functions.deposit.encode([
    destination,
    expectedHeld,
    amount,
  ]);
  return {data};
}
