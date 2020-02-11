// TODO: There are several duplicate types in these files, but we don't care for now.
// There is an issue to provide a tool to fix this:
// https://github.com/bcherny/json-schema-to-typescript/issues/16

import {Participant, AllocationItem, AllocationItems, Allocation} from '../types/definitions';

import {CreateChannelResult, CreateChannelParams} from '../types/create-channel';
import {GetAddressResult, GetAddressParams} from '../types/get-address';

import {JoinChannelParams, JoinChannelResult} from '../types/join-channel';
import {PushMessageParams, PushMessageResult} from '../types/push-message';

import {UpdateChannelParams, UpdateChannelResult} from '../types/update-channel';
import {CloseChannelParams, CloseChannelResult} from '../types/close-channel';
import {ChallengeChannelParams, ChallengeChannelResult} from '../types/challenge-channel';

export {
  Participant,
  AllocationItem,
  AllocationItems,
  Allocation,
  CreateChannelResult,
  CreateChannelParams,
  GetAddressResult,
  GetAddressParams,
  JoinChannelParams,
  JoinChannelResult,
  PushMessageParams,
  PushMessageResult,
  UpdateChannelParams,
  UpdateChannelResult,
  CloseChannelParams,
  CloseChannelResult,
  ChallengeChannelParams,
  ChallengeChannelResult
};
