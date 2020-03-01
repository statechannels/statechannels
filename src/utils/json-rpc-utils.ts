import {convertBytes32ToAddress, convertAddressToBytes32} from '@statechannels/nitro-protocol';
import {UpdateChannelParams, Allocations} from '@statechannels/client-api-schema';
import {Outcome, StateVariables, SimpleEthAllocation} from '../store/types';
import {bigNumberify} from 'ethers/utils';

export function createAllocationOutcomeFromParams(params: Allocations): SimpleEthAllocation {
  // TODO: Support all outcomes
  return {
    type: 'SimpleEthAllocation',
    allocationItems: params[0].allocationItems.map(a => {
      return {
        destination: convertAddressToBytes32(a.destination),
        amount: bigNumberify(a.amount)
      };
    })
  };
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
    turnNum: stateVars.turnNum.add(1),
    outcome: createAllocationOutcomeFromParams(allocations),
    appData
  };
}
