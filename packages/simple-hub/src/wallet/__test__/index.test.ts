import {respondToMessage} from '../';
import {Message} from '@statechannels/wire-format';
import {serializeMessage} from '@statechannels/xstate-wallet/lib/src/serde/wire-format/serialize';
import {ledgerState1, participants, ledgerState2} from '../test-helpers';

it('Echo message with signature', () => {
  const ledgerMessage = serializeMessage(
    {signedStates: [ledgerState1]},
    participants[1].participantId,
    participants[0].participantId
  );
  // expect(ledgerMessage).toMatchObject(ledgerMessageStatic);
  const response = respondToMessage(ledgerMessage);
  const expectedResponse = serializeMessage(
    {signedStates: [ledgerState2]},
    participants[0].participantId,
    participants[1].participantId
  );
  expect(response).toMatchObject<Message[]>([expectedResponse]);
});
