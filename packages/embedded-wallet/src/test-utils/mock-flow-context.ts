import {JsonRPCRequest} from 'web3/providers';
import * as Onboarding from '../flows/onboarding/Onboarding';

export type Flow = 'Onboarding';

const MockRequests: {[key in Flow]: JsonRPCRequest} = {
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
