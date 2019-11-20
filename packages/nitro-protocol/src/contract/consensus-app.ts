import {Buffer} from 'buffer';
import {Interface, defaultAbiCoder} from 'ethers/utils';
import PureEVM from 'pure-evm';

import ConsensusAppArtifact from '../../build/contracts/ConsensusApp.json';
import {ConsensusData, encodeConsensusData} from './consensus-data';
import {encodeOutcome, Outcome} from './outcome';
import {VariablePart} from './state';

const ConsensusAppContractInterface = new Interface(ConsensusAppArtifact.abi);

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
  const fromVariablePart = getVariablePart(fromConsensusData, fromOutcome);
  const toVariablePart = getVariablePart(toConsensusData, toOutcome);
  const turnNumB = 0; // This isn't actually used by the contract so any value works

  
  const iface = new Interface(ConsensusAppContractInterface.abi);

  const txData = iface.functions.validTransition.encode([
    fromVariablePart,
    toVariablePart,
    turnNumB,
    numberOfParticipants
  ]);

  const result = PureEVM.exec(
    Uint8Array.from(Buffer.from(ConsensusAppArtifact.bytecode.substr(2), 'hex')),
    Uint8Array.from(Buffer.from(txData.substr(2), 'hex'))
  );

  return defaultAbiCoder.decode(['bool'], result)[0] as boolean;
}
