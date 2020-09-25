import {
  ContractArtifacts,
  createETHDepositTransaction,
  DepositedEvent,
} from '@statechannels/nitro-protocol';
import {BigNumber, Contract, providers, Wallet} from 'ethers';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {Address, Bytes32, Uint256} from '../type-aliases';

export type SetFundingArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: BigNumber;
};

type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};

export interface ChainEventSubscriber {
  setFunding(arg: SetFundingArg): void;
}

interface ChainEventEmitterInterface {
  registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    listener: ChainEventSubscriber
  ): Promise<void>;
}

interface ChainMofifierInterface {
  fundChannel(arg: FundChannelArg): Promise<providers.TransactionResponse>;
}

interface FundingEvent {
  transactionHash: string;
  type: 'Deposited';
  blockNumber: number;
  final: boolean;
  channelId: Bytes32;
  amount: string;
  destinationHoldings: string;
}

export class ChainService implements ChainMofifierInterface, ChainEventEmitterInterface {
  private readonly ethWallet: Wallet;
  private provider: providers.JsonRpcProvider;
  private addressToObservables: Map<string, Observable<SetFundingArg>> = new Map();
  constructor(provider: string, pk: string) {
    this.provider = new providers.JsonRpcProvider(provider);
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
    });
  }

  //todo: add channelId filtering
  async registerChannel(
    channelId: Bytes32,
    assetHolders: Address[],
    subscriber: ChainEventSubscriber
  ): Promise<void> {
    assetHolders.map(assetHolder => {
      let obs = this.addressToObservables.get(assetHolder);
      if (!obs) {
        const contract: Contract = new Contract(
          assetHolder,
          ContractArtifacts.EthAssetHolderArtifact.abi
        ).connect(this.provider);
        obs = new Observable<DepositedEvent>(subscriber => {
          contract.on('Deposited', subscriber.next);
        }).pipe(
          map(event => ({
            channelId: event.destination,
            assetHolderAddress: assetHolder,
            amount: event.destinationHoldings,
          }))
        );
      }
      obs.subscribe({next: subscriber.setFunding});
      this.addressToObservables.set(assetHolder, obs);
    });
  }
}
