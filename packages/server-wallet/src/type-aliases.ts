import {Message as _WireMessage} from '@statechannels/wire-format';

export declare type ParticipantId = string;
export declare type Uint256 = string;
export declare type Uint48 = number;
export declare type Bytes32 = string;
export declare type Bytes = string;

export type WireMessage = _WireMessage;
export type WirePayload = WireMessage['data'];
