import {respondToMessage} from '../';
import {Message} from '@statechannels/wire-format';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ledgerMessage = require('./ledger-message.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ledgerResponse = require('./ledger-response.json');

it('Echo message with signature', () => {
  const response = respondToMessage(ledgerMessage);
  expect(response).toMatchObject<Message>(ledgerResponse);
});
