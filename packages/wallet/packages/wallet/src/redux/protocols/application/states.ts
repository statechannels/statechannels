export const ADDRESS_KNOWN = 'AddressKnown';
export interface AddressKnown {
  type: typeof ADDRESS_KNOWN;
  address: string;
  privateKey: string;
}
export function addressKnown(address: string, privateKey: string): AddressKnown {
  return { type: ADDRESS_KNOWN, address, privateKey };
}

export const ONGOING = 'Ongoing';
export interface Ongoing {
  type: typeof ONGOING;
  channelId: string;
}
export function ongoing(channelId: string): Ongoing {
  return { type: ONGOING, channelId };
}
export const SUCCESS = 'Success';
export interface Success {
  type: typeof SUCCESS;
}

export function success(): Success {
  return { type: SUCCESS };
}

export function isTerminal(state: ApplicationState): state is Success {
  return state.type === SUCCESS;
}

export type ApplicationState = AddressKnown | Ongoing | Success;
export type NonTerminalApplicationState = AddressKnown | Ongoing;
