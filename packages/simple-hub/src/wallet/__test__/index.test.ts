import ledgerMessage from './ledger-message.json';
import ledgerResponse from './ledger-response.json';
import {respondToMessage} from '../';
import {Message} from '@statechannels/wire-format';

it('Echo message with signature', () => {
  const response = respondToMessage(ledgerMessage);
  expect(response).toMatchObject<Message>(ledgerResponse);
});
