import * as states from '../states';
import { initialize, reducer } from '../reducer';
import * as scenarios from './scenarios';
import {
  scenarioStepDescription,
  itSendsTheseCommitments,
  itSendsNoMessage,
} from '../../../__tests__/helpers';
import { preFund, postFund } from '../../advance-channel/__tests__';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../../constants';
import { bigNumberify } from 'ethers/utils';
import { asAddress } from '../../../../domain/commitments/__tests__';

const itTransitionsTo = (
  result: states.VirtualFundingState,
  type: states.VirtualFundingStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.type).toEqual(type);
  });
};

const itTransitionsSubstateTo = (result: any, substate: string, type: string) => {
  it(`transitions ${substate} to ${type}`, () => {
    expect(result[substate].type).toEqual(type);
  });
};

const allocation = [
  bigNumberify(2).toHexString(),
  bigNumberify(3).toHexString(),
  bigNumberify(5).toHexString(),
];
describe('happyPath', () => {
  const scenario = scenarios.happyPath;
  const { hubAddress } = scenario;

  describe('Initialization', () => {
    const { sharedData, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForJointChannel');
    itSendsTheseCommitments(result, [{ commitment: { turnNum: 0, allocation } }]);
  });

  describe('openJ', () => {
    const { state, sharedData, action } = scenario.openJ;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForJointChannel');
    itTransitionsSubstateTo(protocolState, 'jointChannel', preFund.preSuccess.state.type);
    // Even though there should only be two commitments in the guarantor channel round,
    // since we're using the preSuccess scenarios from advance-channel, which sets up a joint
    // 3-party channel, three get sent out.
    // TODO: Fix this by constructing appropriate test data
    itSendsTheseCommitments(result, [
      { commitment: { turnNum: 1 } },
      { commitment: { turnNum: 2 } },
      { commitment: { turnNum: 3 } },
    ]);
  });

  describe(scenarioStepDescription(scenario.prepareJ), () => {
    const { targetChannelId, ourAddress } = scenario;
    const { state, sharedData, action } = scenario.prepareJ;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForGuarantorChannel');
    itTransitionsSubstateTo(protocolState, 'guarantorChannel', postFund.preSuccess.state.type);
    itSendsTheseCommitments(result, [
      {
        commitment: {
          turnNum: 0,
          allocation: [],
          destination: [targetChannelId, ourAddress, hubAddress],
        },
      },
    ]);
  });

  describe(scenarioStepDescription(scenario.openG), () => {
    const { state, sharedData, action } = scenario.openG;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForGuarantorChannel');
    itTransitionsSubstateTo(protocolState, 'guarantorChannel', postFund.preSuccess.state.type);
    // Even though there should only be two commitments in the guarantor channel round,
    // since we're using the preSuccess scenarios from advance-channel, which sets up a joint
    // 3-party channel, three get sent out.
    // TODO: Fix this by constructing appropriate test data
    itSendsTheseCommitments(result, [
      { commitment: { turnNum: 1 } },
      { commitment: { turnNum: 2 } },
      { commitment: { turnNum: 3 } },
    ]);
  });

  describe(scenarioStepDescription(scenario.prepareG), () => {
    const { state, sharedData, action } = scenario.prepareG;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForGuarantorFunding');
    itTransitionsSubstateTo(
      protocolState,
      'indirectGuarantorFunding',
      'IndirectFunding.WaitForNewLedgerChannel',
    );

    itSendsTheseCommitments(result, [
      {
        commitment: {
          turnNum: 0,
          channel: {
            participants: [asAddress, hubAddress],
            nonce: expect.any(Number),
            channelType: CONSENSUS_LIBRARY_ADDRESS,
          },
        },
      },
    ]);
  });

  describe(scenarioStepDescription(scenario.fundG), () => {
    const { state, sharedData, action } = scenario.fundG;
    const { protocolState } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForApplicationFunding');
    itTransitionsSubstateTo(
      protocolState,
      'indirectApplicationFunding',
      'ConsensusUpdate.CommitmentSent',
    );
  });

  describe(scenarioStepDescription(scenario.fundApp), () => {
    const { state, sharedData, action } = scenario.fundApp;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.Success');
    itSendsNoMessage(result);
  });
});

describe('app funding commitment received early', () => {
  const scenario = scenarios.appFundingCommitmentReceivedEarly;

  describe(scenarioStepDescription(scenario.appFundingCommitmentReceivedEarly), () => {
    const { state, sharedData, action } = scenario.appFundingCommitmentReceivedEarly;
    const { protocolState } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForGuarantorFunding');
  });

  describe(scenarioStepDescription(scenario.fundingSuccess), () => {
    const { state, sharedData, action } = scenario.fundingSuccess;
    const { protocolState } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForApplicationFunding');
  });
});
