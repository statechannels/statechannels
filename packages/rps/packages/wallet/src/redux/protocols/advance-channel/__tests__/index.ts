import * as scenarios from './scenarios';
export const initialStore = scenarios.existingChannelAsA.receiveFromHub.sharedData;
export const preSuccessState = scenarios.existingChannelAsA.receiveFromB.state;
export const successTrigger = scenarios.existingChannelAsA.receiveFromHub.action;
