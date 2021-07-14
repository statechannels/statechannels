import {CreateChannelParams, UpdateChannelParams} from '@statechannels/client-api-schema';

export type CreateChannelStep = {
  type: 'CreateChannel';
  serverId: string;
  jobId: string;
  timestamp: number;
  channelParams: CreateChannelParams;
};

export type CloseChannelStep = {
  serverId: string;
  type: 'CloseChannel';
  jobId: string;
  timestamp: number;
};

export type UpdateChannelStep = {
  serverId: string;
  type: 'UpdateChannel';
  jobId: string;
  timestamp: number;
  updateParams: Omit<UpdateChannelParams, 'channelId'>;
};

export type Step = CreateChannelStep | CloseChannelStep | UpdateChannelStep;

/**
 * A job is just a collection of steps all with the same job id
 */
export type Job = Step[];

export type Peer = {serverId: string; messagePort: number; loadServerPort: number};
export type Peers = Peer[];

/**
 *  These are the basic options the load node needs to start running
 */
export type LoadNodeConfig = {messagePort: number; loadServerPort: number; serverId: string};

/**
 * A simple object that represents a link between a jobId and a channelId
 */
export type JobChannelLink = {jobId: string; channelId: string};

/**
 * This is the data expected to be defined for a role.
 * Each role represents a different wallet.
 */
export type RoleConfig = {
  databaseName: string;
  messagePort: number;
  loadServerPort: number;
  ganachePort: number;
  chainId: number;
  artifactFile: string;
  privateKey: string;
  chainPrivateKey: string;
};
