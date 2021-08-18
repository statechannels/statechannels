import {CreateChannelParams, UpdateChannelParams} from '@statechannels/client-api-schema';
import {Uint256} from '@statechannels/nitro-protocol';
import {BigNumberish} from 'ethers';

import {CreateLedgerChannelParams} from '../src/wallet';

export type CreateChannelStep = {
  type: 'CreateChannel';
  serverId: string;
  jobId: string;
  timestamp: number;
  channelParams: Omit<CreateChannelParams, 'fundingLedgerChannelId' | 'fundingStrategy'>;
  fundingInfo: FundingInfo;
};

export type FundingInfo = {type: 'Direct'} | {type: 'Ledger'; fundingLedgerJob: string};

export type CreateLedgerChannelStep = {
  serverId: string;
  type: 'CreateLedgerChannel';
  jobId: string;
  timestamp: number;
  ledgerChannelParams: Omit<CreateLedgerChannelParams, 'fundingStrategy'>;
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

export type Step =
  | CreateLedgerChannelStep
  | CreateChannelStep
  | CloseChannelStep
  | UpdateChannelStep;

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
  destination: string;
};

export type ChainState = {
  accounts: Record<string, Uint256>;
  contracts: Record<'NITRO_ADJUDICATOR_ADDRESS', {balance: Uint256; address: string}>;
};

export type Assertion = {expected: BigNumberish; actual: BigNumberish; description: string};
