import {turnNumToNumPayments} from '../torrent-info/channels-list/ChannelsList';

turnNumToNumPayments;

describe('turnNumToNumPayments', () => {
  it.each`
    turnNum | numPayments
    ${0}    | ${0}
    ${1}    | ${0}
    ${2}    | ${0}
    ${3}    | ${0}
    ${4}    | ${0}
    ${5}    | ${1}
    ${6}    | ${1}
    ${7}    | ${2}
    ${8}    | ${2}
    ${9}    | ${3}
    ${10}   | ${3}
  `('computes numPayments correctly', ({turnNum, numPayments}) => {
    expect(turnNumToNumPayments(turnNum)).toEqual(numPayments);
  });
});
