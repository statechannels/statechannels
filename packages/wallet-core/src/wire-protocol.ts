import {FundingStrategy} from '@statechannels/client-api-schema';

import {SignedState, Participant} from './types';

type _Objective<Name, Data> = {
  participants: Participant[];
  type: Name;
} & Data;
export type CreateChannel = _Objective<
  'CreateChannel',
  {
    signedState: SignedState;
    fundingStrategy: FundingStrategy;
  }
>;
export type OpenChannel = _Objective<'OpenChannel', {targetChannelId: string}>;
export type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {targetChannelId: string; jointChannelId: string}
>;
export type FundGuarantor = _Objective<
  'FundGuarantor',
  {jointChannelId: string; ledgerChannelId: string; guarantorId: string}
>;

export type Objective = CreateChannel | OpenChannel | VirtuallyFund | FundGuarantor;

const guard = <T extends Objective>(name: Objective['type']) => (o: Objective): o is T =>
  o.type === name;
export const isOpenChannel = guard<OpenChannel>('OpenChannel');
export const isVirtuallyFund = guard<VirtuallyFund>('VirtuallyFund');
export const isFundGuarantor = guard<FundGuarantor>('FundGuarantor');

export interface Message {
  signedStates?: SignedState[];
  objectives?: Objective[];
}
