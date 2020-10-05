import {ethers} from 'ethers';

import Erc20AssetHolderArtifact from '../../../build/contracts/ERC20AssetHolder.json';
import {Allocation, Guarantee, Outcome} from '../outcome';

import * as assetHolderTransactionCreator from './asset-holder';

const Erc20AssetHolderContractInterface = new ethers.utils.Interface(Erc20AssetHolderArtifact.abi);

export function createTransferAllTransaction(
  channelId: string,
  allocation: Allocation
): ethers.providers.TransactionRequest {
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
): ethers.providers.TransactionRequest {
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
): ethers.providers.TransactionRequest {
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
): ethers.providers.TransactionRequest {
  const data = Erc20AssetHolderContractInterface.encodeFunctionData('deposit', [
    destination,
    expectedHeld,
    amount,
  ]);
  return {data};
}
