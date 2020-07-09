import { Model } from 'objection';
import { allocationOutcome2, DUMMY_RULES_ADDRESS } from '../../test/test-constants';
import {
  BEGINNING_APP_CHANNEL_ID,
  beginningAppPhaseChannel,
  ONGOING_APP_CHANNEL_ID,
  ongoingAppPhaseChannel,
} from '../../test/test-data';
import Channel, { ChannelColumns } from '../../models/channel';
import knex from '../../db-admin/db-admin-connection';
import { SignedStateVarsWithHash } from '@statechannels/wallet-core';
import { extractVariables } from '../../state-utils';

Model.knex(knex);

const base = {
  appDefinition: DUMMY_RULES_ADDRESS,
  challengeDuration: 1000,
  chainId: '0x01',
  channelNonce: 1,
  participants: [],
  isFinal: false,
  appData: '',
  signatures: [],
  stateHash: '0x123',
};

// ***************
// Ledger channels
// ***************

function postfundSetupState(turnNum: number): SignedStateVarsWithHash {
  return { ...base, turnNum, outcome: allocationOutcome2 };
}

function appState(turnNum: number): SignedStateVarsWithHash {
  return extractVariables({ ...base, turnNum, outcome: allocationOutcome2 });
}

const beginningAppPhaseChannelWithStates: ChannelColumns = {
  ...beginningAppPhaseChannel,
  channelId: BEGINNING_APP_CHANNEL_ID,
  vars: [postfundSetupState(2), postfundSetupState(3)],
};

const ongoingAppPhaseChannelWithStates: ChannelColumns = {
  ...ongoingAppPhaseChannel,
  channelId: ONGOING_APP_CHANNEL_ID,
  vars: [appState(4), appState(5)],
};

const seeds = [beginningAppPhaseChannelWithStates, ongoingAppPhaseChannelWithStates];

// *******
// Exports
// *******

export function seed() {
  return knex('channels')
    .del()
    .then(() => Channel.query().insert(seeds.map(Channel.prepareJsonBColumns)));
}

export const stateConstructors = {
  postfundSetupState,
};
