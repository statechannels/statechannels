import {channelWithVars} from '../../models/__test__/fixtures/channel';
import {protocol} from '../direct-funding';

const c = channelWithVars();
const protocolState = {
  ...c.protocolState,
  targetOutcome: {
    type: 'SimpleAllocation' as 'SimpleAllocation',
    allocationItems: [],
    assetHolderAddress: '0x0',
  },
};
it.skip('resolves', () =>
  expect(protocol(protocolState)).toMatchObject([
    // {type: 'SignState', channelId: c.channelId, hash: c.latest.stateHash},
  ]));

it.skip('rejects', () => expect(protocol(protocolState)).rejects.toThrow('Channel has no state'));
