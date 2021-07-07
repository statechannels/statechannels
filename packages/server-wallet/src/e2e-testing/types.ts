import {CreateChannelParams, UpdateChannelParams} from '@statechannels/client-api-schema';

export type CreateChannelStep = {
  type: 'CreateChannel';
  serverId: string;
  jobId: string;
  step: number;
  channelParams: CreateChannelParams;
};

export type CloseChannelStep = {
  serverId: string;
  type: 'CloseChannel';
  jobId: string;
  step: number;
};

export type UpdateChannelStep = {
  serverId: string;
  type: 'UpdateChannel';
  jobId: string;
  step: number;
  updateParams: Omit<UpdateChannelParams, 'channelId'>;
};
export type Step = CreateChannelStep | CloseChannelStep | UpdateChannelStep;
export type Job = Step[];
