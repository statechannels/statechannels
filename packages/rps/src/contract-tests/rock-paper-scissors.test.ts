import * as scenarios from '../core/test-scenarios';
import * as ethers from 'ethers';
import RockPaperScissorsArtifact from '../../build/contracts/RockPaperScissors.json';
import {asEthersObject} from 'fmg-core';
import {RPSCommitment, asCoreCommitment} from '../core/rps-commitment';
import {bigNumberify} from 'ethers/utils';
jest.setTimeout(20000);
import {expectRevert} from '@statechannels/devtools';
import {Contract} from 'ethers';
import {AddressZero, HashZero} from 'ethers/constants';
import {Allocation, encodeOutcome} from '@statechannels/nitro-protocol/src/contract/outcome';
import {VariablePart} from '@statechannels/nitro-protocol/src/contract/state.js';
import {
  getTestProvider,
  randomExternalDestination,
  replaceAddresses,
  setupContracts,
} from '@statechannels/nitro-protocol/test/test-helpers';


const provider = getTestProvider();

describe.skip('Rock Paper Scissors', () => {
  let networkId;

  let rpsContract;

  let postFundSetupB: RPSCommitment;
  let postFundSetupB2: RPSCommitment;
  let propose: RPSCommitment;
  let propose2: RPSCommitment;
  let propose3: RPSCommitment;

  let accept: RPSCommitment;
  let reveal: RPSCommitment;
  let resting: RPSCommitment;

  beforeAll(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = RockPaperScissorsArtifact
  .networks[networkId].address;

    rpsContract = new ethers.Contract(libraryAddress, RockPaperScissorsArtifact
    .abi, provider);

    const account1 = ethers.Wallet.createRandom();
    const account2 = ethers.Wallet.createRandom();
    const scenario = scenarios.build(libraryAddress, account1.address, account2.address);
    postFundSetupB = scenario.postFundSetupB;
    postFundSetupB2 = scenario.postFundSetupB2;
    propose = scenario.propose;
    propose2 = scenario.propose2;
    propose3 = scenario.propose3;
    accept = scenario.accept;
    reveal = scenario.reveal;
    resting = scenario.resting;
  });

  const validTransition = async (commitment1: RPSCommitment, commitment2: RPSCommitment) => {
    const coreCommitment1 = asCoreCommitment(commitment1);
    const coreCommitment2 = asCoreCommitment(commitment2);

    return await rpsContract.validTransition(
      asEthersObject(coreCommitment1),
      asEthersObject(coreCommitment2)
    );
  };

  // Transition function tests
  // ========================

  it('allows START -> ROUNDPROPOSED', async () => {
    expect(await validTransition(postFundSetupB, propose)).toBe(true);
  });

  it('allows ROUNDPROPOSED -> ROUNDACCEPTED', async () => {
    expect(await validTransition(propose, accept)).toBe(true);
  });

  it('allows ROUNDACCEPTED -> REVEAL', async () => {
    expect(await validTransition(accept, reveal)).toBe(true);
  });

  it('allows REVEAL -> (updated) START', async () => {
    expect(await validTransition(reveal, resting)).toBe(true);
  });

  it('disallows transitions where the stake changes', async () => {
    reveal.stake = bigNumberify(88).toHexString();
    const coreCommitment1 = asCoreCommitment(reveal);
    const coreCommitment2 = asCoreCommitment(resting);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2)
        ),
      'The stake should be the same between commitments'
    );
  });

  it('disallows transitions where the allocations change incorrectly', async () => {
    const coreCommitment1 = asCoreCommitment(postFundSetupB);
    const coreCommitment2 = asCoreCommitment(propose2);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2)
        ),
      'The allocation for player A must be the same between commitments'
    );
  });

  it('disallows transitions where destination changes', async () => {
    const coreCommitment1 = asCoreCommitment({...propose});
    const coreCommitment2 = asCoreCommitment({
      ...accept,
      destination: ['0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb'],
    });
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2)
        ),
      'The destination field must not change'
    );
  });

  it('disallows a stake that the players cannot afford', async () => {
    const coreCommitment1 = asCoreCommitment(postFundSetupB2);
    const coreCommitment2 = asCoreCommitment(propose3);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2)
        ),
      'The allocation for player A must not fall below the stake.'
    );
  });

  // The following scenario is highly notional, since the situation should (and is) prevented from occuring at the Propose stage
  it('Reverts an underflow via SafeMath', async () => {
    reveal.stake = accept.stake = bigNumberify(20).toHexString();
    accept.allocation = [bigNumberify(0).toHexString(), bigNumberify(0).toHexString()] as [
      string,
      string
    ];
    reveal.allocation = [bigNumberify(40).toHexString(), bigNumberify(0).toHexString()] as [
      string,
      string
    ];

    const coreCommitment1 = asCoreCommitment(accept);
    const coreCommitment2 = asCoreCommitment(reveal);
    expect.assertions(1);
    await expectRevert(
      () =>
        rpsContract.validTransition(
          asEthersObject(coreCommitment1),
          asEthersObject(coreCommitment2)
        ),
      'revert'
    ); // Note that SafeMath does not have revert messages
  });
});

let RockPaperScissors: Contract;  

const numParticipants = 3;
const addresses = {
  // participants
  A: randomExternalDestination(),
  B: randomExternalDestination(),
  C: randomExternalDestination(),
};
const guarantee = {
  targetChannelId: HashZero,
  destinations: [addresses.A],
};

beforeAll(async () => {
  RockPaperScissors = await setupContracts(provider, RockPaperScissorsArtifact);
});

describe('validTransition', () => {
  it.each`
    isValid  | numAssets | isAllocation      | balancesA             | turnNumB | balancesB             | description
    ${true}  | ${[1, 1]} | ${[true, true]}   | ${{A: 1, B: 1, C: 1}} | ${3}     | ${{A: 0, B: 2, C: 1}} | ${'A pays B 1 wei'}
  `(
    '$description',
    async ({
      isValid,
      isAllocation,
      numAssets,
      balancesA,
      turnNumB,
      balancesB,
    }: {
      isValid: boolean;
      isAllocation: boolean[];
      numAssets: number[];
      balancesA: any;
      turnNumB: number;
      balancesB: any;
    }) => {
      balancesA = replaceAddresses(balancesA, addresses);
      const allocationA: Allocation = [];
      Object.keys(balancesA).forEach(key =>
        allocationA.push({destination: key, amount: balancesA[key]})
      );
      let outcomeA;
      if (isAllocation[0]) {
        outcomeA = [{assetHolderAddress: AddressZero, allocation: allocationA}];
      } else {
        outcomeA = [
          {
            assetHolderAddress: AddressZero,
            guarantee,
          },
        ];
      }

      if (numAssets[0] === 2) {
        outcomeA.push(outcomeA[0]);
      }
      const variablePartA: VariablePart = {
        outcome: encodeOutcome(outcomeA),
        appData: HashZero,
      };

      balancesB = replaceAddresses(balancesB, addresses);
      const allocationB: Allocation = [];

      Object.keys(balancesB).forEach(key =>
        allocationB.push({destination: key, amount: balancesB[key]})
      );

      let outcomeB;
      if (isAllocation[1]) {
        outcomeB = [{assetHolderAddress: AddressZero, allocation: allocationB}];
      } else {
        outcomeB = [{assetHolderAddress: AddressZero, guarantee}];
      }
      if (numAssets[1] === 2) {
        outcomeB.push(outcomeB[0]);
      }
      const variablePartB: VariablePart = {
        outcome: encodeOutcome(outcomeB),
        appData: HashZero,
      };

      if (isValid) {
        const isValidFromCall = await RockPaperScissors.validTransition(
          variablePartA,
          variablePartB,
          turnNumB,
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(() =>
          RockPaperScissors.validTransition(
            variablePartA,
            variablePartB,
            turnNumB,
            numParticipants
          )
        );
      }
    }
  );
});
