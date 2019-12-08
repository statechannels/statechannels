import { SignedState } from '.';

export type HubChoice = {
  type: 'HubChoice';
  hubAddress: string;
};

export type FundingStrategy = 'Direct' | 'Indirect' | 'Virtual';
export type FundingStrategyProposed = {
  type: 'FundingStrategyProposed';
  choice: FundingStrategy;
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
