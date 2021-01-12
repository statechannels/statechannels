import {createValidTransitionTransaction, State as NitroState} from '@statechannels/nitro-protocol';
import * as PureEVM from '@connext/pure-evm-wasm';
import {utils} from 'ethers';

import {Bytes} from './type-aliases';

type EVMExecutionResult =
  | {success: true; revertReason: undefined}
  | {success: false; revertReason: string};

/**
 * Takes two states and runs the validateTransition in an evm (pureevm).
 */
export const validateAppTransitionWithEVM = (
  from: NitroState,
  to: NitroState,
  bytecode: Bytes
): EVMExecutionResult => {
  if (bytecode === '0x')
    return {
      success: false,
      revertReason: 'empty bytecode',
    };

  const {data} = createValidTransitionTransaction(from, to);

  const result = PureEVM.exec(
    Uint8Array.from(Buffer.from(bytecode.substr(2), 'hex')),
    Uint8Array.from(Buffer.from(data ? data.toString().substr(2) : '0x00', 'hex'))
  );

  const transitionPassed =
    // We need to ensure the result is the correct length otherwise
    // we might be interpreting a failed assertion
    result.length === 32 && (utils.defaultAbiCoder.decode(['bool'], result)[0] as boolean);

  if (!transitionPassed) {
    return {
      success: false,
      revertReason: parseRevertReason(result),
    };
  }

  return {success: true, revertReason: undefined};
};

function parseRevertReason(result: Uint8Array) {
  // TODO: Figure out the proper encoding.
  // Right now the revert reason is readable but slightly garbled
  return new TextDecoder().decode(result.filter(r => r !== 0));
}
