import { StateConstructor } from '../../utils';

// -------
// States
// -------
export interface WaitForFirstCommitment {
  type: 'Application.WaitForFirstCommitment';
  channelId: string;
  address: string;
  privateKey: string;
}

export interface Ongoing {
  type: 'Application.Ongoing';
  channelId: string;
  address: string;
  privateKey: string;
}

export interface Success {
  type: 'Application.Success';
}

// -------
// Constructors
// -------
export const waitForFirstCommitment: StateConstructor<WaitForFirstCommitment> = p => {
  return { ...p, type: 'Application.WaitForFirstCommitment' };
};

export const ongoing: StateConstructor<Ongoing> = p => {
  return { ...p, type: 'Application.Ongoing' };
};

export const success: StateConstructor<Success> = p => {
  return { ...p, type: 'Application.Success' };
};

// -------
// Unions and Guards
// -------

export type ApplicationState = WaitForFirstCommitment | Ongoing | Success;
export type NonTerminalApplicationState = WaitForFirstCommitment | Ongoing;
export type ApplicationStateType = ApplicationState['type'];

export function isTerminal(state: ApplicationState): state is Success {
  return state.type === 'Application.Success';
}
