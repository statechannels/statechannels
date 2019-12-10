import { SignedState } from '.';

export type HubChoice = {
  type: 'HubChoice';
  targetChannelId: string;
  hubAddress: string;
};

export type FundingStrategy = 'Direct' | 'Indirect' | 'Virtual';
export type FundingStrategyProposed = {
  type: 'FUNDING_STRATEGY_PROPOSED';
  targetChannelId: string;
  choice: FundingStrategy;
  // signature: string // TODO
  // from: string; // TODO will we ever get strategy proposed by multiple clients?
};

export type OpenChannel = {
  type: 'OPEN_CHANNEL';
  signedState: SignedState;
};

export type CloseChannel = {
  type: 'CLOSE_CHANNEL';
  channelId: string;
};

export type ProposeIntent = HubChoice | FundingStrategyProposed | OpenChannel;

export type SendStates = {
  type: 'SendStates';
  signedStates: SignedState[];
};

export const sendStates = (signedStates: SignedState[]): SendStates => ({
  signedStates,
  type: 'SendStates',
});

export type Message = SendStates | ProposeIntent;
export type AddressableMessage = Message & { to: string };
