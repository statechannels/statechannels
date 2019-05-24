import { StateConstructor } from '../../utils';

// -------
// States
// -------
export interface AddressKnown {
  type: 'Application.AddressKnown';
  address: string;
  privateKey: string;
}

export interface Ongoing {
  type: 'Application.Ongoing';
  channelId: string;
}

export interface Success {
  type: 'Application.Success';
}

// -------
// Constructors
// -------

export const addressKnown: StateConstructor<AddressKnown> = p => {
  return { ...p, type: 'Application.AddressKnown' };
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

export type ApplicationState = AddressKnown | Ongoing | Success;
export type NonTerminalApplicationState = AddressKnown | Ongoing;
export type ApplicationStateType = ApplicationState['type'];

export function isTerminal(state: ApplicationState): state is Success {
  return state.type === 'Application.Success';
}
