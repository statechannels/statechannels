import {UpdateChannelHandlerParams} from '../update-channel';
import {fixture} from '../../wallet/__test__/fixtures/utils';
import {Uint256} from '../../type-aliases';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import {ChannelState} from '../../protocols/state';
import {signState} from '../../protocols/actions';
import {stateVars} from '../../wallet/__test__/fixtures/state-vars';

const lastPostFundTurnNum = 3;
const channelId = '0x1234';

const defaultVars: UpdateChannelHandlerParams = {
  ...stateVars(),
  channelId,
};

export const updateChannelFixture = fixture(defaultVars);

export const signStateFixture = fixture(
  signState({channelId, ...stateVars({turnNum: lastPostFundTurnNum + 1})})
);

const defaultChannelState: ChannelState = {
  channelId,
  myIndex: 0,
  supported: stateWithHashSignedBy()({turnNum: lastPostFundTurnNum}),
  latest: stateWithHashSignedBy()({turnNum: lastPostFundTurnNum}),
  funding: (): Uint256 => '0x0',
};

export const channelStateFixture = fixture(defaultChannelState);
