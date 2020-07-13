export const protocolEngine = {
  run: _args => ({ outbox: [{ to: 'bob', from: 'alice' }] }),
};
