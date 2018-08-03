import makeEnum from '../lib/make_enum';

export const types = makeEnum([
  'SYNC_MESSAGES',
  'SUBSCRIBE_MESSAGES',
]);

export const syncMessages = messages => ({
  type: types.SYNC_MESSAGES,
  messages,
});

export const subscribeMessages = () => ({
  types: types.SUBSCRIBE_MESSAGES,
});
