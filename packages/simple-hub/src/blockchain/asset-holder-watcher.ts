import {ethers} from 'ethers';
import {logger} from '../logger';
import {ethAssetHolder as attachEthAssetHolder} from './asset-holder';
import {fromEvent, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {bigNumberify, BigNumber} from 'ethers/utils';

const log = logger();

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

export async function assetHolderObservable(): Promise<Observable<AssetHolderEvent>> {
  log.info('asset-holder-watcher: listen');
  const ethAssetHolder: ethers.Contract = await attachEthAssetHolder();
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
