import {respondToMessage} from '../respond-to-message';
import {
  ledgerStateIncoming,
  ledgerStateResponse,
  ledgerStateIncoming3,
  ledgerStateResponse3,
  ledgerStateIncoming3_2,
  ledgerStateResponse3_2
} from '../test-helpers';
import {Message} from '../xstate-wallet-internals';

describe('ledger state', () => {
  it('Echo message with signature', () => {
    const response = respondToMessage({signedStates: [ledgerStateIncoming]});
    const expectedResponse = {signedStates: [ledgerStateResponse]};
    expect(response).toMatchObject<Message>(expectedResponse);
  });

  it('Echo message with signature with 3 participants', () => {
    const ledgerMessage = {signedStates: [ledgerStateIncoming3]};
    const response = respondToMessage(ledgerMessage);
    const expectedResponse = {signedStates: [ledgerStateResponse3]};
    expect(response).toMatchObject<Message>(expectedResponse);
  });

  it('Echo message with signature with 3 participants, 2 states', () => {
    const ledgerMessage = {signedStates: [ledgerStateIncoming3, ledgerStateIncoming3_2]};
    const response = respondToMessage(ledgerMessage);
    const expectedResponse = {signedStates: [ledgerStateResponse3, ledgerStateResponse3_2]};
    expect(response).toMatchObject<Message>(expectedResponse);
  });
});
