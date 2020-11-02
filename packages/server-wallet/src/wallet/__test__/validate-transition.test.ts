import {SimpleAllocation} from '@statechannels/wallet-core';

import {validateTransition} from '../../utilities/validate-transition';

import {alice, bob} from './fixtures/signing-wallets';
import {stateWithHashSignedBy} from './fixtures/states';

const outcome1: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: '0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf',
  allocationItems: [],
};
const outcome2: SimpleAllocation = {
  type: 'SimpleAllocation',
  assetHolderAddress: '0x2222E21c8019b14dA16235319D34b5Dd83E644A9',
  allocationItems: [],
};
describe('validate transition', () => {
  test.each`
    fromState                                                                           | toState                                                                           | expectedResult | description
    ${stateWithHashSignedBy([alice()])({turnNum: 0})}                                   | ${stateWithHashSignedBy([bob()])({turnNum: 1})}                                   | ${true}        | ${'valid prefund state transition'}
    ${stateWithHashSignedBy([alice()])({turnNum: 0, appData: '0x00'})}                  | ${stateWithHashSignedBy([bob()])({turnNum: 1, appData: '0x11'})}                  | ${false}       | ${'prefund whereappdata changes'}
    ${stateWithHashSignedBy([alice()])({turnNum: 0})}                                   | ${stateWithHashSignedBy([alice()])({turnNum: 1})}                                 | ${false}       | ${'incorrect signer'}
    ${stateWithHashSignedBy([alice()])({turnNum: 0, challengeDuration: 1})}             | ${stateWithHashSignedBy([bob()])({turnNum: 1, challengeDuration: 2})}             | ${false}       | ${'constants change'}
    ${stateWithHashSignedBy([alice()])({turnNum: 0, outcome: outcome1})}                | ${stateWithHashSignedBy([bob()])({turnNum: 1, outcome: outcome2})}                | ${false}       | ${'outcome changes'}
    ${stateWithHashSignedBy([alice()])({turnNum: 4})}                                   | ${stateWithHashSignedBy([bob()])({turnNum: 5})}                                   | ${true}        | ${'valid regular transition'}
    ${stateWithHashSignedBy([alice()])({turnNum: 4})}                                   | ${stateWithHashSignedBy([bob()])({turnNum: 6})}                                   | ${false}       | ${'invalid turn number'}
    ${stateWithHashSignedBy([alice()])({turnNum: 4})}                                   | ${stateWithHashSignedBy([alice()])({turnNum: 5})}                                 | ${false}       | ${'invalid signer'}
    ${stateWithHashSignedBy([alice()])({turnNum: 4, isFinal: true, outcome: outcome1})} | ${stateWithHashSignedBy([bob()])({turnNum: 5, isFinal: true, outcome: outcome2})} | ${false}       | ${'final state and outcome changed'}
  `('$description', async ({fromState, toState, expectedResult}) => {
    expect(await validateTransition(fromState, toState, undefined, true)).toEqual(expectedResult);
  });
});
