import {makeAddress} from '@statechannels/wallet-core';
import {TestContractArtifacts} from '@statechannels/nitro-protocol';

import {fixture} from '../../../wallet/__test__/fixtures/utils';
import {AppBytecode} from '../../app-bytecode';

// This is the bytecode from nitro protocol's counting app
const countingAppBytcode = TestContractArtifacts.CountingAppArtifact.deployedBytecode;

export const COUNTING_APP_DEFINITION = makeAddress('0x00000000000000000000000000000000000000ca');

const defaultValue: AppBytecode = AppBytecode.fromJson({
  appBytecode: countingAppBytcode,
  chainId: '0x00',
  appDefinition: COUNTING_APP_DEFINITION,
});

export const appBytecode = fixture<AppBytecode>(defaultValue);
