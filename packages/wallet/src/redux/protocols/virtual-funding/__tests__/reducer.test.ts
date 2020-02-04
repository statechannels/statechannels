import {convertAddressToBytes32} from "@statechannels/nitro-protocol";

import {bigNumberify} from "ethers/utils";

import * as states from "../states";
import {initialize, reducer} from "../reducer";

import {
  scenarioStepDescription,
  itSendsNoMessage,
  itSendsTheseStates
} from "../../../__tests__/helpers";
import {preFund, postFund} from "../../advance-channel/__tests__";
import {
  asAddress,
  hubAddress,
  bsAddress,
  convertBalanceToOutcome
} from "../../../__tests__/state-helpers";
import {ETH_ASSET_HOLDER_ADDRESS} from "../../../../constants";

import * as scenarios from "./scenarios";

const itTransitionsTo = (
  result: states.VirtualFundingState,
  type: states.VirtualFundingStateType
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

const twoThreeFive = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()},
  {address: hubAddress, wei: bigNumberify(5).toHexString()}
];

describe("happyPath", () => {
  const scenario = scenarios.happyPath;

  describe("Initialization", () => {
    const {sharedData, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForJointChannel");
    itSendsTheseStates(result, [
      {state: {turnNum: 0, outcome: convertBalanceToOutcome(twoThreeFive)}}
    ]);
  });

  describe("openJ", () => {
    const {state, sharedData, action} = scenario.openJ;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForJointChannel");
    itTransitionsSubstateTo(protocolState, "jointChannel", preFund.preSuccess.state.type);
    // Even though there should only be two states in the guarantor channel round,
    // since we're using the preSuccess scenarios from advance-channel, which sets up a joint
    // 3-party channel, three get sent out.
    // TODO: Fix this by constructing appropriate test data
    itSendsTheseStates(result, [
      {state: {turnNum: 1}},
      {state: {turnNum: 2}},
      {state: {turnNum: 3}}
    ]);
  });

  describe(scenarioStepDescription(scenario.prepareJ), () => {
    const {targetChannelId, ourAddress} = scenario;
    const {state, sharedData, action} = scenario.prepareJ;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForGuarantorChannel");
    itTransitionsSubstateTo(protocolState, "guarantorChannel", postFund.preSuccess.state.type);

    itSendsTheseStates(result, [
      {
        state: {
          turnNum: 0,
          outcome: [
            {
              assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
              guarantee: {
                targetChannelId: expect.any(String),
                destinations: [
                  targetChannelId,
                  convertAddressToBytes32(ourAddress),
                  convertAddressToBytes32(hubAddress)
                ]
              }
            }
          ]
        }
      }
    ]);
  });

  describe(scenarioStepDescription(scenario.openG), () => {
    const {state, sharedData, action} = scenario.openG;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForGuarantorChannel");
    itTransitionsSubstateTo(protocolState, "guarantorChannel", postFund.preSuccess.state.type);
    // Even though there should only be two states in the guarantor channel round,
    // since we're using the preSuccess scenarios from advance-channel, which sets up a joint
    // 3-party channel, three get sent out.
    // TODO: Fix this by constructing appropriate test data
    itSendsTheseStates(result, [
      {state: {turnNum: 1}},
      {state: {turnNum: 2}},
      {state: {turnNum: 3}}
    ]);
  });

  describe(scenarioStepDescription(scenario.prepareG), () => {
    const {state, sharedData, action} = scenario.prepareG;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForGuarantorFunding");
    itTransitionsSubstateTo(
      protocolState,
      "indirectGuarantorFunding",
      "LedgerFunding.WaitForNewLedgerChannel"
    );

    itSendsTheseStates(result, [
      {
        state: {
          turnNum: 0,
          channel: {
            participants: [asAddress, hubAddress],
            channelNonce: expect.any(String),
            chainId: expect.any(String)
          }
        }
      }
    ]);
  });

  describe(scenarioStepDescription(scenario.fundG), () => {
    const {state, sharedData, action} = scenario.fundG;
    const {protocolState} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForApplicationFunding");
    itTransitionsSubstateTo(
      protocolState,
      "indirectApplicationFunding",
      "ConsensusUpdate.StateSent"
    );
  });

  describe(scenarioStepDescription(scenario.fundApp), () => {
    const {state, sharedData, action} = scenario.fundApp;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.Success");
    itSendsNoMessage(result);
  });
});

describe("app funding state received early", () => {
  const scenario = scenarios.appFundingStateReceivedEarly;

  describe(scenarioStepDescription(scenario.appFundingStateReceivedEarly), () => {
    const {state, sharedData, action} = scenario.appFundingStateReceivedEarly;
    const {protocolState} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForGuarantorFunding");
  });

  describe(scenarioStepDescription(scenario.fundingSuccess), () => {
    const {state, sharedData, action} = scenario.fundingSuccess;
    const {protocolState} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "VirtualFunding.WaitForApplicationFunding");
  });
});
