import { utils } from 'ethers';
import { toNitroState } from '@statechannels/wallet-core';

import { appBytecode, COUNTING_APP_DEFINITION } from '../models/__test__/fixtures/app-bytecode';
import { createState } from '../wallet/__test__/fixtures/states';
import { validateTransitionWithEVM } from '../evm-validator';

const UNDEFINED_APP_DEFINITION = '0x88c26ec40DC653973C599A1a0762678e795F879F';

it('returns true for a valid transition', () => {
  const fromState = toNitroState(
    createState({
      appDefinition: COUNTING_APP_DEFINITION,
      appData: utils.defaultAbiCoder.encode(['uint256'], [1]),
    })
  );
  const toState = toNitroState(
    createState({
      appDefinition: COUNTING_APP_DEFINITION,
      appData: utils.defaultAbiCoder.encode(['uint256'], [2]),
    })
  );
  expect(validateTransitionWithEVM(fromState, toState, appBytecode().appBytecode)).toBe(true);
});

it('returns false for an invalid transition', () => {
  const fromState = toNitroState(
    createState({
      appDefinition: COUNTING_APP_DEFINITION,
      appData: utils.defaultAbiCoder.encode(['uint256'], [2]),
    })
  );
  const toState = toNitroState(
    createState({
      appDefinition: COUNTING_APP_DEFINITION,
      appData: utils.defaultAbiCoder.encode(['uint256'], [1]),
    })
  );
  expect(validateTransitionWithEVM(fromState, toState, appBytecode().appBytecode)).toBe(false);
});

it('returns false when no byte code exists for the app definition', () => {
  const state = toNitroState(
    createState({
      appDefinition: UNDEFINED_APP_DEFINITION,
    })
  );
  expect(validateTransitionWithEVM(state, state, '0x')).toBe(false);
});
