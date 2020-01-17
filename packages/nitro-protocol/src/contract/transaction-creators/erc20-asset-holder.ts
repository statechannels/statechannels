// @ts-ignore
import {TransactionRequest} from 'ethers/providers';
import {utils} from 'ethers';
import Erc20AssetHolderArtifact from '../../../build/contracts/ERC20AssetHolder.json';
import {Allocation, Guarantee, Outcome} from '../outcome';
import * as assetHolderTransactionCreator from './asset-holder';

const Erc20AssetHolderContractInterface = new utils.Interface(Erc20AssetHolderArtifact.abi);

// TODO: Currently we are setting some arbitrary gas limit
// To avoid issues with Ganache sendTransaction and parsing BN.js
// If we don't set a gas limit some transactions will fail
const GAS_LIMIT = 3000000;

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
  return {data, gasLimit: GAS_LIMIT};
}
