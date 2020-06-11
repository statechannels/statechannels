import {bigNumberify} from 'ethers/utils';
import {prettyPrintWei} from './calculateWei';

describe('Pretty printing wei', () => {
  it.each`
    input         | output
    ${18}         | ${'18.0 wei'}
    ${1001}       | ${'1.0 kwei'}
    ${1599}       | ${'1.6 kwei'}
    ${1234567}    | ${'1.2 Mwei'}
    ${12345678}   | ${'12.3 Mwei'}
    ${123456789}  | ${'123.5 Mwei'}
    ${1234567890} | ${'1.2 Gwei'}
  `('prettyPrintWei(bigNumberify($input)) = $output', ({input, output}) => {
    expect(prettyPrintWei(bigNumberify(input))).toEqual(output);
  });
});
