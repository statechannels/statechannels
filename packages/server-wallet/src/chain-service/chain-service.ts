import {createETHDepositTransaction} from '@statechannels/nitro-protocol';
import {providers, utils, Wallet} from 'ethers';

import {Address, Bytes32, Uint256} from '../type-aliases';

const GAS_PRICE = utils.parseUnits('15', 'gwei');

export type SetFundingArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};

export interface ChainEventListener {
  setFunding(arg: SetFundingArg): void;
}

interface ChainEventEmitterInterface {
  registerChannel(channelId: Bytes32, assetHolders: Address[]): Promise<void>;
  attachChannelWallet(listenter: ChainEventListener): void;
}

interface ChainMofifierInterface {
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse>;
}

//todo: implement ChainEventEmitter
export class ChainService implements ChainMofifierInterface {
  private readonly ethWallet: Wallet;
  constructor(provider: string, pk: string) {
    this.ethWallet = new Wallet(pk, new providers.JsonRpcProvider(provider));
  }

  // todo: only works with eth-asset-holder
  // todo: should this function be async?
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse> {
    //todo: add retries
    const transactionRequest = {
      ...createETHDepositTransaction(arg.channelId, arg.expectedHeld, arg.amount),
      to: arg.assetHolderAddress,
      value: arg.amount,
    };
    return this.ethWallet.sendTransaction({
      ...transactionRequest,
      gasPrice: GAS_PRICE,
    });
  }
}
