// import {Weapon} from './weapons';
import {defaultAbiCoder, bigNumberify} from 'ethers/utils';
import {unreachable} from '../utils/unreachable';

export enum PositionType {
  Start, // 0
  XPlaying, // 1
  OPlaying, // 2
  Draw, // 4
  Victory // 5
}

export interface TTTData {
  positionType: PositionType;
  stake: string; // uint256
  Xs: number; // uint16
  Os: number; // uint16
}
export interface Start {
  type: 'start';
}
export interface XPlaying {
  type: 'xPlaying';
  stake: string;
  Xs: number;
  Os: number;
}

export interface OPlaying {
  type: 'oPlaying';
  stake: string;
  Xs: number;
  Os: number;
}

export interface Draw {
  type: 'draw';
  stake: string;
  Xs: number;
  Os: number;
}

export interface Victory {
  type: 'victory';
  stake: string;
  Xs: number;
  Os: number;
}

export type AppData = Start | XPlaying | OPlaying | Draw | Victory;

function toTTTData(appData: AppData): TTTData {
  let positionType;
  switch (appData.type) {
    case 'start':
      positionType = PositionType.Start;
      break;
    case 'xPlaying':
      positionType = PositionType.XPlaying;
      break;
    case 'oPlaying':
      positionType = PositionType.OPlaying;
      break;
    case 'draw':
      positionType = PositionType.Draw;
      break;
    case 'victory':
      positionType = PositionType.Victory;
      break;
  }
  const defaults: TTTData = {
    positionType,
    stake: bigNumberify(0).toString(),
    Xs: 0,
    Os: 0
  };

  return {...defaults, ...appData};
}

export function encodeTTTData(tttData: TTTData): string {
  return defaultAbiCoder.encode(
    ['tuple(uint8 positionType, uint256 stake, uint16 Xs, uint16 Os)'],
    [tttData]
  );
}

export function encodeAppData(appData: AppData): string {
  return encodeTTTData(toTTTData(appData));
}

export function decodeAppData(appDataBytes: string): AppData {
  const parameters = defaultAbiCoder.decode(
    ['tuple(uint8 positionType, uint256 stake, uint16 Xs, uint16 Os)'],
    appDataBytes
  )[0];

  const positionType = parameters[0] as PositionType;
  const stake = parameters[1].toString();
  const Xs = parameters[2];
  const Os = parameters[3];

  let appData: AppData;

  switch (positionType) {
    case PositionType.Start: // TODO replace these with functions that project out the desired fields
      appData = {
        type: 'start'
      } as Start;
      return appData;
    case PositionType.XPlaying:
      appData = {
        type: 'xPlaying',
        stake,
        Xs,
        Os
      } as XPlaying;
      return appData;
    case PositionType.OPlaying:
      appData = {
        type: 'oPlaying',
        stake,
        Xs,
        Os
      } as OPlaying;
      return appData;
    case PositionType.Draw:
      appData = {
        type: 'draw',
        stake,
        Xs,
        Os
      } as Draw;
      return appData;
    case PositionType.Victory:
      appData = {
        type: 'victory',
        stake,
        Xs,
        Os
      } as Victory;
      return appData;
    default:
      return unreachable(positionType);
  }
}
