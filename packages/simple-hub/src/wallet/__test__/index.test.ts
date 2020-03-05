import {respondToMessage} from '../';
import {Message} from '@statechannels/wire-format';
import {serializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/serialize';
import {
  ledgerStateMessage,
  participants,
  ledgerStateResponse,
  ledgerStateMessage3,
  ledgerStateResponse3
} from '../test-helpers';

describe('ledger state', () => {
  it('Echo message with signature', () => {
    const ledgerMessage = serializeMessage(
      {signedStates: [ledgerStateMessage]},
      participants[1].participantId,
      participants[0].participantId
    );
    const response = respondToMessage(ledgerMessage);
    const expectedResponse = serializeMessage(
      {signedStates: [ledgerStateResponse]},
      participants[0].participantId,
      participants[1].participantId
    );
    expect(response).toMatchObject<Message[]>([expectedResponse]);
  });

  it('Echo message with signature with 3 participants', () => {
    const ledgerMessage = serializeMessage(
      {signedStates: [ledgerStateMessage3]},
      participants[1].participantId,
      participants[0].participantId
    );
    const response = respondToMessage(ledgerMessage);
    const expectedResponses = [
      serializeMessage(
        {signedStates: [ledgerStateResponse3]},
        participants[0].participantId,
        participants[1].participantId
      ),
      serializeMessage(
        {signedStates: [ledgerStateResponse3]},
        participants[2].participantId,
        participants[1].participantId
      )
    ];
    expect(response).toMatchObject<Message[]>(expectedResponses);
  });
});
