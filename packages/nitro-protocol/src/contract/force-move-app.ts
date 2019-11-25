import {Interface} from 'ethers/utils';

import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {State} from '../contract/state';

export const ForceMoveAppContractInterface = new Interface(ForceMoveAppArtifact.abi);

export function validTransition(fromState: State, toState: State, appBytecode: string): boolean {
  return true;
  // TODO: Enable this once pure-evm can be loaded from the browser
  // see https://github.com/statechannels/monorepo/issues/537
  // const numberOfParticipants = toState.channel.participants.length;
  // const fromVariablePart = getVariablePart(fromState);
  // const toVariablePart = getVariablePart(toState);
  // const turnNumB = toState.turnNum;

  // const iface = new Interface(ForceMoveAppContractInterface.abi);

  // const txData = iface.functions.validTransition.encode([
  //   fromVariablePart,
  //   toVariablePart,
  //   turnNumB,
  //   numberOfParticipants,
  // ]);

  // const result = PureEVM.exec(
  //   Uint8Array.from(Buffer.from(appBytecode.substr(2), 'hex')),
  //   Uint8Array.from(Buffer.from(txData.substr(2), 'hex'))
  // );

  // return defaultAbiCoder.decode(['bool'], result)[0] as boolean;
}
