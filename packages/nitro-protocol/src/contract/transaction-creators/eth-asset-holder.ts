// @ts-ignore
import {TransactionRequest} from 'ethers/providers';
import {utils} from 'ethers';
import EthAssetHolderArtifact from '../../../build/contracts/ETHAssetHolder.json';
import {Allocation, Guarantee, Outcome} from '../outcome';
import * as assetHolderTransactionCreator from './asset-holder';

// TODO: Currently we are setting some arbitrary gas limit
// To avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

const EthAssetHolderContractInterface = new utils.Interface(EthAssetHolderArtifact.abi);

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
  return {data, gasLimit: GAS_LIMIT};
}
