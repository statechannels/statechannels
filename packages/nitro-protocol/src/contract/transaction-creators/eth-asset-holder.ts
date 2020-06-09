import {providers, utils} from 'ethers';
import EthAssetHolderArtifact from '../../../build/contracts/ETHAssetHolder.json';
import {Allocation, Guarantee, Outcome} from '../outcome';
import * as assetHolderTransactionCreator from './asset-holder';

// @ts-ignore
const EthAssetHolderContractInterface = new utils.Interface(EthAssetHolderArtifact.abi);

export function createTransferAllTransaction(
  channelId: string,
  allocation: Allocation
): providers.TransactionRequest {
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
): providers.TransactionRequest {
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
): providers.TransactionRequest {
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
): providers.TransactionRequest {
  const data = EthAssetHolderContractInterface.functions.deposit.encode([
    destination,
    expectedHeld,
    amount,
  ]);
  return {data};
}
