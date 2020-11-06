import {makeAddress, SimpleAllocation} from '@statechannels/wallet-core';

import {validateTransition} from '../../utilities/validate-transition';

import {alice, bob} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';

const outcome1: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: makeAddress('0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'),
  allocationItems: [],
};
const outcome2: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: makeAddress('0x2222E21c8019b14dA16235319D34b5Dd83E644A9'),
  allocationItems: [],
};
describe('validate transition', () => {
  test.each`
    fromSigner | fromState                                         | toSigner   | toState                                           | expectedResult | description
    ${alice()} | ${{turnNum: 0}}                                   | ${bob()}   | ${{turnNum: 1}}                                   | ${true}        | ${'valid prefund state transition'}
    ${alice()} | ${{turnNum: 0, appData: '0x00'}}                  | ${bob()}   | ${{turnNum: 1, appData: '0x11'}}                  | ${false}       | ${'prefund whereappdata changes'}
    ${alice()} | ${{turnNum: 0}}                                   | ${alice()} | ${{turnNum: 1}}                                   | ${false}       | ${'incorrect signer'}
    ${alice()} | ${{turnNum: 0, challengeDuration: 1}}             | ${bob()}   | ${{turnNum: 1, challengeDuration: 2}}             | ${false}       | ${'constants change'}
    ${alice()} | ${{turnNum: 0, outcome: outcome1}}                | ${bob()}   | ${{turnNum: 1, outcome: outcome2}}                | ${false}       | ${'outcome changes'}
    ${alice()} | ${{turnNum: 4}}                                   | ${bob()}   | ${{turnNum: 5}}                                   | ${true}        | ${'valid regular transition'}
    ${alice()} | ${{turnNum: 4}}                                   | ${bob()}   | ${{turnNum: 6}}                                   | ${false}       | ${'invalid turn number'}
    ${alice()} | ${{turnNum: 4}}                                   | ${alice()} | ${{turnNum: 5}}                                   | ${false}       | ${'invalid signer'}
    ${alice()} | ${{turnNum: 4, isFinal: true, outcome: outcome1}} | ${bob()}   | ${{turnNum: 5, isFinal: true, outcome: outcome2}} | ${false}       | ${'final state and outcome changed'}
  `('$description', async ({fromSigner, fromState, toSigner, toState, expectedResult}) => {
    expect(
      await validateTransition(
        stateWithHashSignedBy([fromSigner])(fromState),
        stateWithHashSignedBy([toSigner])(toState),
        undefined,
        true
      )
    ).toEqual(expectedResult);
  });
});
