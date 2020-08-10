import matchers from '@pacote/jest-either';
import {left, right} from 'fp-ts/lib/Either';

import {joinChannel} from '../join-channel';
import {joinChannelFixture} from '../fixtures/join-channel';
import {channelStateFixture} from '../../protocols/__test__/fixtures/channel-state';
import {channel} from '../../models/__test__/fixtures/channel';
import {stateSignedBy} from '../../wallet/__test__/fixtures/states';
import {bob, alice} from '../../wallet/__test__/fixtures/signing-wallets';
expect.extend(matchers);

const prefundVars = {turnNum: 0, appData: '0xf00'};
const runningVars = {turnNum: 7, appData: '0xf00'};

test.each`
  input                                                                        | result
  ${channel({vars: [stateSignedBy([bob()])(prefundVars)]}).protocolState}      | ${{type: 'SignState', ...prefundVars}}
  ${channelStateFixture({latest: prefundVars}, {latestSignedByMe: undefined})} | ${{type: 'SignState', ...prefundVars}}
`('happy path', ({input, result}) => {
  expect(joinChannel(joinChannelFixture(), input)).toMatchObject(right(result));
});

test.each`
  row  | input                                                                            | result
  ${1} | ${channelStateFixture({latestSignedByMe: prefundVars})}                          | ${new Error('already signed prefund setup')}
  ${2} | ${channel({vars: [stateSignedBy([alice()])(prefundVars)]}).protocolState}        | ${new Error('already signed prefund setup')}
  ${3} | ${channel({vars: [stateSignedBy([alice(), bob()])(prefundVars)]}).protocolState} | ${new Error('already signed prefund setup')}
  ${4} | ${channelStateFixture({latest: runningVars}, {latestSignedByMe: undefined})}     | ${new Error('latest state must be turn 0')}
`('error cases $row', ({input, result}) => {
  expect(joinChannel(joinChannelFixture(), input)).toMatchObject(left(result));
});
