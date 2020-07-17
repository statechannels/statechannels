import {channelWithVars, channel} from '../../models/__test__/fixtures/channel';
import {executionLoop} from '../direct-funding';

const c = channelWithVars();

it('resolves', () =>
  expect(executionLoop(c)).resolves.toMatchObject([
    {type: 'SignState', channelId: c.channelId, hash: c.latest.stateHash},
  ]));

it('rejects', () => expect(executionLoop(channel())).rejects.toThrow('Channel has no state'));
