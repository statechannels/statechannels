import {
  RichObjective,
  RichObjectiveEvent,
  SharedObjective,
  SignedState
} from '@statechannels/wallet-core';
import {Interpreter} from 'xstate';

export type AnyInterpreter = Interpreter<any, any, any>;
export type TriggerObjectiveEvent = (event: RichObjectiveEvent) => void;
/**
 * The channel wallet is not able to update UI. The channel wallet is supplied a callback to invoke
 * when UI should be updated.
 *
 * UI needs a way to communicate objective events to the channel wallet. UI invokes triggerObjectiveEvent
 * when UI triggers an objective event
 */
export type UpdateUI = (update: {service?: AnyInterpreter; objective?: RichObjective}) => void;

export interface Workflow {
  id: string;
  service: AnyInterpreter;
  domain: string; // TODO: Is this useful?
}

export type Message = {
  objectives: SharedObjective[];
  signedStates: SignedState[];
};
