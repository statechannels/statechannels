import {Message} from '@statechannels/wire-format';
import {
  participants,
  ledgerStateResponse,
  ledgerStateResponse3,
  ledgerStateResponse3_2
} from '../../wallet/test-helpers';
import {messagesToSend} from '../firebase-relay';
import {serializeMessage} from '../../wallet/xstate-wallet-internals';

describe('broadcast to 1 participant', () => {
  it('Echo message with signature', () => {
    const messageToSend = {signedStates: [ledgerStateResponse]};
    const wireMessageToSend = messagesToSend(messageToSend);
    const expectedWireMessageToSend = serializeMessage(
      {signedStates: [ledgerStateResponse]},
      participants[0].participantId,
      participants[1].participantId
    );
    expect(wireMessageToSend).toMatchObject<Message[]>([expectedWireMessageToSend]);
  });

  it('Echo message with signature with 3 participants', () => {
    const messageToSend = {signedStates: [ledgerStateResponse3]};
    const response = messagesToSend(messageToSend);
    const expectedWireMessageToSend = [
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
    expect(response).toMatchObject<Message[]>(expectedWireMessageToSend);
  });

  it('Echo message with signature with 3 participants, 2 states', () => {
    const message = {signedStates: [ledgerStateResponse3, ledgerStateResponse3_2]};
    const wireMessagesToSend = messagesToSend(message);

    const expectedWireMessageToSend = [
      serializeMessage(
        {signedStates: [ledgerStateResponse3, ledgerStateResponse3_2]},
        participants[0].participantId,
        participants[1].participantId
      ),
      serializeMessage(
        {signedStates: [ledgerStateResponse3, ledgerStateResponse3_2]},
        participants[2].participantId,
        participants[1].participantId
      )
    ];
    expect(wireMessagesToSend).toMatchObject<Message[]>(expectedWireMessageToSend);
  });
});
