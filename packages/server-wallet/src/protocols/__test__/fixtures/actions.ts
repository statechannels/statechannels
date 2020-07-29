import {fixture} from '../../../wallet/__test__/fixtures/utils';
import {signState} from '../../actions';
import {stateVars} from '../../../wallet/__test__/fixtures/state-vars';
import {lastPostFundTurnNum} from '../../../handlers/fixtures/update-channel';

export const signStateFixture = fixture(
  signState({channelId: '0x1234', ...stateVars({turnNum: lastPostFundTurnNum + 1})})
);
