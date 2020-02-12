import {SignedState, Participant} from './types';

type _Objective<Name, Data> = {
  participants: Participant[];
  name: Name;
  data: Data;
};
export type OpenChannel = _Objective<
  'OpenChannel',
  {
    targetChannelId: string;
  }
>;
export type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {
    targetChannelId: string;
    jointChannelId: string;
  }
>;
export type FundGuarantor = _Objective<
  'FundGuarantor',
  {
    jointChannelId: string;
    ledgerId: string;
    guarantorId: string;
  }
>;

export type Objective = OpenChannel | VirtuallyFund | FundGuarantor;

const guard = <T extends Objective>(name: Objective['name']) => (o: Objective): o is T =>
  o.name === name;
export const isOpenChannel = guard<OpenChannel>('OpenChannel');
export const isVirtuallyFund = guard<VirtuallyFund>('VirtuallyFund');
export const isFundGuarantor = guard<FundGuarantor>('FundGuarantor');

export interface Message {
  signedStates?: SignedState[];
  objectives?: Objective[];
}
