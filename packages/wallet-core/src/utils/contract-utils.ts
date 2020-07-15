
import {ETH_ASSET_HOLDER_ADDRESS, } from '../config';
import {ETH_TOKEN} from '../constants';
import {BigNumber, } from 'ethers';


export function assetHolderAddress(tokenAddress: string): string | undefined {
  if (BigNumber.from(tokenAddress).isZero()) return ETH_ASSET_HOLDER_ADDRESS;
  throw 'AssetHolderAddress not found';
}

export function tokenAddress(assetHolderAddress: string): string | undefined {
  if (assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) return ETH_TOKEN;
  throw 'TokenAddress not found';
}

