import {State, toNitroState} from '@statechannels/wallet-core';
import {createValidTransitionTransaction} from '@statechannels/nitro-protocol';
import * as PureEVM from 'pure-evm';
import {utils} from 'ethers';
import Knex from 'knex';

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
  knex: Knex,
  from: State,
  to: State
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
      (await AppBytecode.getBytecode(knex, defaultConfig.chainNetworkID, from.appDefinition)) ||
      MISSING);
  if (bytecode === MISSING) {
    // logger.warn(
    //   `No bytecode found for appDefinition ${from.appDefinition} and chain id ${config.chainNetworkID}. Skipping valid transition check`
    // );
    return true;
  }

  const {data} = createValidTransitionTransaction(toNitroState(from), toNitroState(to));

  const result = PureEVM.exec(
    Uint8Array.from(Buffer.from(bytecode.substr(2), 'hex')),
    Uint8Array.from(Buffer.from(data ? data.toString().substr(2) : '0x00', 'hex'))
  );

  // We need to ensure the result is the correct length otherwise we might be interpreting a failed assertion
  return result.length === 32 && (utils.defaultAbiCoder.decode(['bool'], result)[0] as boolean);
};
