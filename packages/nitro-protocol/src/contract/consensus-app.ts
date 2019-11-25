import {ConsensusData, encodeConsensusData} from './consensus-data';
import {encodeOutcome, Outcome} from './outcome';
import {VariablePart} from './state';

// Const ConsensusAppContractInterface = new Interface(ConsensusAppArtifact.abi);

export function getVariablePart(consensusData: ConsensusData, outcome: Outcome): VariablePart {
  const appData = encodeConsensusData(consensusData);
  return {appData, outcome: encodeOutcome(outcome)};
}

// ValidTransition is a pure function so using this method will not use gas
// This should be used over createValidTransitionTransaction
export function validTransition(
  fromConsensusData: ConsensusData,
  fromOutcome: Outcome,
  toConsensusData: ConsensusData,
  toOutcome: Outcome,
  numberOfParticipants: number
): boolean {
  return true;
  // TODO: Enable this once pure-evm can be loaded from the browser
  // See https://github.com/statechannels/monorepo/issues/537
  // Const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  // Const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  // Const turnNumB = 0; // This isn't actually used by the contract so any value works

  // Const iface = new Interface(ConsensusAppContractInterface.abi);

  // Const txData = iface.functions.validTransition.encode([
  //   FromVariablePart,
  //   ToVariablePart,
  //   TurnNumB,
  //   NumberOfParticipants,
  // ]);

  // Const result = PureEVM.exec(
  //   Uint8Array.from(Buffer.from(ConsensusAppArtifact.bytecode.substr(2), 'hex')),
  //   Uint8Array.from(Buffer.from(txData.substr(2), 'hex'))
  // );

  // Return defaultAbiCoder.decode(['bool'], result)[0] as boolean;
}
