import {Interface} from 'ethers/utils';

import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {State} from '../contract/state';

export const ForceMoveAppContractInterface = new Interface(ForceMoveAppArtifact.abi);

export function validTransition(fromState: State, toState: State, appBytecode: string): boolean {
  return true;
  // TODO: Enable this once pure-evm can be loaded from the browser
  // See https://github.com/statechannels/monorepo/issues/537
  // Const numberOfParticipants = toState.channel.participants.length;
  // Const fromVariablePart = getVariablePart(fromState);
  // Const toVariablePart = getVariablePart(toState);
  // Const turnNumB = toState.turnNum;

  // Const iface = new Interface(ForceMoveAppContractInterface.abi);

  // Const txData = iface.functions.validTransition.encode([
  //   FromVariablePart,
  //   ToVariablePart,
  //   TurnNumB,
  //   NumberOfParticipants,
  // ]);

  // Const result = PureEVM.exec(
  //   Uint8Array.from(Buffer.from(appBytecode.substr(2), 'hex')),
  //   Uint8Array.from(Buffer.from(txData.substr(2), 'hex'))
  // );

  // Return defaultAbiCoder.decode(['bool'], result)[0] as boolean;
}
