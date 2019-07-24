import { Commitment } from 'fmg-core';

export interface AppMessage {
  commitment: Commitment;
  signature: string; // TODO we should use one kind of signature across the app/server
}
