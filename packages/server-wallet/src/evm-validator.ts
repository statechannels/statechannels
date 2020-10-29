import {createValidTransitionTransaction, State as NitroState} from '@statechannels/nitro-protocol';
import * as PureEVM from '@connext/pure-evm-wasm';
import {utils} from 'ethers';
import {Transaction} from 'objection';

import {AppBytecode} from './models/app-bytecode';
import {logger} from './logger';
import {defaultConfig} from './config';

const MISSING = '0x';
const bytecodeCache: Record<string, string | undefined> = {};

/**
 * Takes two states and runs the validateTransition in an evm (pureevm) if the bytecode exists in the DB.
 * Returns a promise that resolves to true if the validateTransition returns true false otherwise
 */
export const validateTransitionWithEVM = async (
  from: NitroState,
  to: NitroState,
  tx: Transaction // Insist on running inside a transaction
  // Tests may pass "knex as any" or ("undefined as any" if knex is globally bound) to sidestep the TS error
): Promise<boolean | undefined> => {
  if (from.appDefinition !== to.appDefinition) {
    logger.error('Invalid transition', {
      error: new Error('States are using different appDefinitions'),
    });
    return false;
  }
  const bytecode =
    bytecodeCache[from.appDefinition] ??
    (bytecodeCache[from.appDefinition] =
      (await AppBytecode.getBytecode(defaultConfig.chainNetworkID, from.appDefinition, tx)) ||
      MISSING);
  if (bytecode === MISSING) {
    logger.error('Missing bytecode', {
      error: new Error(`No byte code for ${from.appDefinition}`),
    });
    return false;
  }

  const {data} = createValidTransitionTransaction(from, to);

  const result = PureEVM.exec(
    Uint8Array.from(Buffer.from(bytecode.substr(2), 'hex')),
    Uint8Array.from(Buffer.from(data ? data.toString().substr(2) : '0x00', 'hex'))
  );
  // We need to ensure the result is the correct length otherwise we might be interpreting a failed assertion
  const transitionPassed =
    result.length === 32 && (utils.defaultAbiCoder.decode(['bool'], result)[0] as boolean);

  if (!transitionPassed) {
    logger.error(`Call to ValidTransition failed in the EVM ${parseRevertReason(result)}`, {
      result: parseRevertReason(result),
    });
    return false;
  }

  return true;
};

function parseRevertReason(result: Uint8Array) {
  // TODO: Figure out the proper encoding.
  // Right now the revert reason is readable but slightly garbled
  return new TextDecoder().decode(result.filter(r => r !== 0));
}
