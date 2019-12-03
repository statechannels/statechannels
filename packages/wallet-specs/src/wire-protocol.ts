import { SignedState } from '.';

export type Propose = HubChoice | FundingStrategy;

export interface HubChoice {
  type: 'HubChoice';
  hubAddress: string;
}

export interface FundingStrategy {
  type: 'FundingStrategy';
  choice: 'Direct' | 'Indirect' | 'Virtual';
}

export interface RequestToOpenChannel {
  type: 'RequestToOpenChannel';
  state: SignedState;
}
