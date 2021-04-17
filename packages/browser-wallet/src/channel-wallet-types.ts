import {DirectFunder, SharedObjective, SignedState} from '@statechannels/wallet-core';
import {Interpreter} from 'xstate';

export type AnyInterpreter = Interpreter<any, any, any>;
export type OnObjectiveEvent = (event: DirectFunder.OpenChannelEvent) => void;
export type OnWorkflowStart = (service: AnyInterpreter, onObjectiveEvent: OnObjectiveEvent) => void;
export type OnObjectiveUpdate = (
  objective: DirectFunder.OpenChannelObjective,
  onObjectiveEvent: OnObjectiveEvent
) => void;

export interface Workflow {
  id: string;
  service: AnyInterpreter;
  domain: string; // TODO: Is this useful?
}

export type Message = {
  objectives: SharedObjective[];
  signedStates: SignedState[];
};
