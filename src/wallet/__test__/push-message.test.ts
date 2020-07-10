import { Wallet } from '..';
import { message } from './fixtures/messages';

it('works', () => {
  const wallet = new Wallet();

  return expect(wallet.pushMessage(message())).resolves.not.toThrow();
});
