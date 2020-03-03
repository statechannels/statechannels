import {respondToMessage} from '../';
import {Message} from '@statechannels/wire-format';

import ledgerMessage from './ledger-message.json';
import ledgerResponse from './ledger-response.json';

it('Echo message with signature', () => {
  const response = respondToMessage(ledgerMessage);
  expect(response).toMatchObject<Message[]>(ledgerResponse);
});
