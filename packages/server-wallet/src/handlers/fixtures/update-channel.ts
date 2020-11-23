import { UpdateChannelHandlerParams } from '../update-channel';
import { fixture } from '../../wallet/__test__/fixtures/utils';
import { stateVars } from '../../wallet/__test__/fixtures/state-vars';

export const lastPostFundTurnNum = 3;
const channelId = '0x1234';

const defaultVars: UpdateChannelHandlerParams = {
  ...stateVars(),
  channelId,
};

export const updateChannelFixture = fixture(defaultVars);
