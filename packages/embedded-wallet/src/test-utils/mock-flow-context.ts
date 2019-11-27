import {JsonRpcRequest} from '@statechannels/channel-provider';
import * as Onboarding from '../flows/onboarding/Onboarding';

export type Flow = 'Onboarding';

/* globals jest */

const MockRequests: {[key in Flow]: JsonRpcRequest} = {
  Onboarding: {
    jsonrpc: '2.0',
    id: 123,
    method: 'chan_allocate',
    params: ['foo', true, 3]
  }
};

export function mockOnboardingFlowContext() {
  return jest
    .spyOn(Onboarding, 'useOnboardingFlowContext')
    .mockImplementation(() => ({request: MockRequests.Onboarding}));
}
