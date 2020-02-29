import {convertBytes32ToAddress, convertAddressToBytes32} from '@statechannels/nitro-protocol';
import {UpdateChannelParams, Allocations} from '@statechannels/client-api-schema';
import {Outcome, StateVariables, SimpleEthAllocation} from '../store/types';
import {toHex, add, toString} from './hex-number-utils';

export function createAllocationOutcomeFromParams(params: Allocations): SimpleEthAllocation {
  // TODO: Support all outcomes
  return {
    type: 'SimpleEthAllocation',
    allocationItems: params[0].allocationItems.map(a => {
      return {
        destination: convertAddressToBytes32(a.destination),
        amount: toHex(a.amount)
      };
    })
  };
}

export function createJsonRpcAllocationsFromOutcome(outcome: Outcome): Allocations {
  if (outcome.type !== 'SimpleEthAllocation') {
    throw new Error('Only SimpleEthAllocation is currently supported');
  }
  return [
    {
      token: '0x0',
      allocationItems: outcome.allocationItems.map(a => ({
        amount: toString(a.amount),
        destination: convertBytes32ToAddress(a.destination)
      }))
    }
  ];
}

// TODO: Error handling
export function createStateVarsFromUpdateChannelParams(
  stateVars: StateVariables,
  params: UpdateChannelParams
): StateVariables {
  const {appData, allocations} = params;

  // TODO: check for valid transition using EVM library

  // TODO: Check if this is a final state... I guess it couldn't be

  return {
    ...stateVars,
    turnNum: add(stateVars.turnNum, 1),
    outcome: createAllocationOutcomeFromParams(allocations),
    appData
  };
}
