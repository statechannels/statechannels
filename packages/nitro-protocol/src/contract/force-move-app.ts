import {Buffer} from 'buffer';
import {Interface, defaultAbiCoder} from 'ethers/utils';

import ForceMoveAppArtifact from '../../build/contracts/ForceMoveApp.json';
import {State, getVariablePart} from '../contract/state';

let PureEVM;
import(/* WebpackMode: "eager" */ 'pure-evm').then(x => (PureEVM = x));

export const ForceMoveAppContractInterface = new Interface(ForceMoveAppArtifact.abi);

export function validTransition(fromState: State, toState: State, appBytecode: string): boolean {
  const numberOfParticipants = toState.channel.participants.length;
  const fromVariablePart = getVariablePart(fromState);
  const toVariablePart = getVariablePart(toState);
  const turnNumB = toState.turnNum;

  const iface = new Interface(ForceMoveAppContractInterface.abi);

  const txData = iface.functions.validTransition.encode([
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants,
  ]);

  const result = PureEVM.exec(
    Uint8Array.from(Buffer.from(appBytecode.substr(2), 'hex')),
    Uint8Array.from(Buffer.from(txData.substr(2), 'hex'))
  );

  return defaultAbiCoder.decode(['bool'], result)[0] as boolean;
}
