import {ethers} from 'ethers';
import {fromEvent, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {bigNumberify, BigNumber} from 'ethers/utils';
import {createEthAssetHolder} from './eth-asset-holder';

type RawAssetHolderEvent = [
  string, //channelId
  string, //amountDeposited
  string, //destinationHoldings
  ethers.Event //event
];

export interface AssetHolderEvent {
  channelId: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
  event: ethers.Event;
}

export async function ethAssetHolderObservable(): Promise<Observable<AssetHolderEvent>> {
  const ethAssetHolder: ethers.Contract = await createEthAssetHolder();
  return fromEvent(ethAssetHolder, 'Deposited').pipe(
    map(
      (event: RawAssetHolderEvent): AssetHolderEvent => ({
        channelId: event[0],
        amountDeposited: bigNumberify(event[1]),
        destinationHoldings: bigNumberify(event[2]),
        event: event[3]
      })
    )
  );
}
