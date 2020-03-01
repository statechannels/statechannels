import {UpdateChannelParams} from '@statechannels/client-api-schema';
import {StateVariables} from '../store/types';
import {deserializeAllocations} from '../app-messages/deserialize';

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
    outcome: deserializeAllocations(allocations),
    appData
  };
}
