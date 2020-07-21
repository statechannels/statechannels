import {channel, channelWithVars} from '../../models/__test__/fixtures/channel';
import {protocol} from '../direct-funding';

const c = channelWithVars();

it('resolves', () =>
  expect(protocol(c.protocolState)).toMatchObject([
    // {type: 'SignState', channelId: c.channelId, hash: c.latest.stateHash},
  ]));

it.skip('rejects', () =>
  expect(protocol(channel().protocolState)).rejects.toThrow('Channel has no state'));
