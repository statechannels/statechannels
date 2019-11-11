import * as ethers from 'ethers';
// @ts-ignore
import RockPaperScissorsArtifact from '../../build/contracts/RockPaperScissors.json';
jest.setTimeout(20000);
import {expectRevert} from '@statechannels/devtools';
import path from 'path';
import {Contract} from 'ethers';
import {AddressZero, HashZero} from 'ethers/constants';
import {
  Allocation,
  encodeOutcome,
  AssetOutcomeShortHand,
  replaceAddressesAndBigNumberify,
  randomExternalDestination,
} from '@statechannels/nitro-protocol';
import {VariablePart} from '@statechannels/nitro-protocol';

import loadJsonFile from 'load-json-file';

import {defaultAbiCoder, bigNumberify, BigNumber} from 'ethers/utils';

const testProvider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.GANACHE_PORT}`
);

enum PositionType {
  Start,
  RoundProposed,
  RoundAccepted,
  Reveal,
}

enum Weapon {
  Rock,
  Paper,
  Scissors,
}
interface RPSData {
  positionType: PositionType;
  stake: BigNumber; // uint256
  preCommit: string; // bytes32
  playerAWeapon: Weapon;
  playerBWeapon: Weapon;
  salt: string; // bytes32
}

// describe.skip('Rock Paper Scissors', () => {
//   let networkId;

//   let rpsContract;

//   let postFundSetupB: RPSCommitment;
//   let postFundSetupB2: RPSCommitment;
//   let propose: RPSCommitment;
//   let propose2: RPSCommitment;
//   let propose3: RPSCommitment;

//   let accept: RPSCommitment;
//   let reveal: RPSCommitment;
//   let resting: RPSCommitment;

//   beforeAll(async () => {
//     networkId = (await provider.getNetwork()).chainId;
//     const libraryAddress = RockPaperScissorsArtifact.networks[networkId].address;

//     rpsContract = new ethers.Contract(libraryAddress, RockPaperScissorsArtifact.abi, provider);

//     const account1 = ethers.Wallet.createRandom();
//     const account2 = ethers.Wallet.createRandom();
//     const scenario = scenarios.build(libraryAddress, account1.address, account2.address);
//     postFundSetupB = scenario.postFundSetupB;
//     postFundSetupB2 = scenario.postFundSetupB2;
//     propose = scenario.propose;
//     propose2 = scenario.propose2;
//     propose3 = scenario.propose3;
//     accept = scenario.accept;
//     reveal = scenario.reveal;
//     resting = scenario.resting;
//   });

//   const validTransition = async (commitment1: RPSCommitment, commitment2: RPSCommitment) => {
//     const coreCommitment1 = asCoreCommitment(commitment1);
//     const coreCommitment2 = asCoreCommitment(commitment2);

//     return await rpsContract.validTransition(
//       asEthersObject(coreCommitment1),
//       asEthersObject(coreCommitment2)
//     );
//   };

//   // Transition function tests
//   // ========================

//   it('disallows transitions where the stake changes', async () => {
//     reveal.stake = bigNumberify(88).toHexString();
//     const coreCommitment1 = asCoreCommitment(reveal);
//     const coreCommitment2 = asCoreCommitment(resting);
//     expect.assertions(1);
//     await expectRevert(
//       () =>
//         rpsContract.validTransition(
//           asEthersObject(coreCommitment1),
//           asEthersObject(coreCommitment2)
//         ),
//       'The stake should be the same between commitments'
//     );
//   });

//   it('disallows transitions where the allocations change incorrectly', async () => {
//     const coreCommitment1 = asCoreCommitment(postFundSetupB);
//     const coreCommitment2 = asCoreCommitment(propose2);
//     expect.assertions(1);
//     await expectRevert(
//       () =>
//         rpsContract.validTransition(
//           asEthersObject(coreCommitment1),
//           asEthersObject(coreCommitment2)
//         ),
//       'The allocation for player A must be the same between commitments'
//     );
//   });

//   it('disallows transitions where destination changes', async () => {
//     const coreCommitment1 = asCoreCommitment({...propose});
//     const coreCommitment2 = asCoreCommitment({
//       ...accept,
//       destination: ['0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb']
//     });
//     expect.assertions(1);
//     await expectRevert(
//       () =>
//         rpsContract.validTransition(
//           asEthersObject(coreCommitment1),
//           asEthersObject(coreCommitment2)
//         ),
//       'The destination field must not change'
//     );
//   });

//   it('disallows a stake that the players cannot afford', async () => {
//     const coreCommitment1 = asCoreCommitment(postFundSetupB2);
//     const coreCommitment2 = asCoreCommitment(propose3);
//     expect.assertions(1);
//     await expectRevert(
//       () =>
//         rpsContract.validTransition(
//           asEthersObject(coreCommitment1),
//           asEthersObject(coreCommitment2)
//         ),
//       'The allocation for player A must not fall below the stake.'
//     );
//   });

//   // The following scenario is highly notional, since the situation should (and is) prevented from occuring at the Propose stage
//   it('Reverts an underflow via SafeMath', async () => {
//     reveal.stake = accept.stake = bigNumberify(20).toHexString();
//     accept.allocation = [bigNumberify(0).toHexString(), bigNumberify(0).toHexString()] as [
//       string,
//       string
//     ];
//     reveal.allocation = [bigNumberify(40).toHexString(), bigNumberify(0).toHexString()] as [
//       string,
//       string
//     ];

//     const coreCommitment1 = asCoreCommitment(accept);
//     const coreCommitment2 = asCoreCommitment(reveal);
//     expect.assertions(1);
//     await expectRevert(
//       () =>
//         rpsContract.validTransition(
//           asEthersObject(coreCommitment1),
//           asEthersObject(coreCommitment2)
//         ),
//       'revert'
//     ); // Note that SafeMath does not have revert messages
//   });
// });

let RockPaperScissors: Contract;

const numParticipants = 3;
const addresses = {
  // participants
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

beforeAll(async () => {
  RockPaperScissors = await setupContracts(testProvider, RockPaperScissorsArtifact);
});

describe('validTransition', () => {
  it.each`
    isValid | positionType                                                | stake               | AWeapon                       | BWeapon                       | fromBalances    | toBalances      | description
    ${true} | ${[PositionType.Start, PositionType.RoundProposed]}         | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Allows Start -> RoundProposed'}
    ${true} | ${[PositionType.RoundProposed, PositionType.RoundAccepted]} | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Allows RoundProposed -> RoundAccepted'}
    ${true} | ${[PositionType.RoundAccepted, PositionType.Reveal]}        | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Allows RoundAccepted -> Reveal'}
    ${true} | ${[PositionType.Reveal, PositionType.Start]}                | ${{from: 1, to: 1}} | ${[Weapon.Rock, Weapon.Rock]} | ${[Weapon.Rock, Weapon.Rock]} | ${{A: 5, B: 5}} | ${{A: 5, B: 5}} | ${'Allows RoundAccepted -> Reveal'}
  `(
    '$description',
    async ({
      isValid,
      positionType,
      stake,
      AWeapon,
      BWeapon,
      fromBalances,
      toBalances,
    }: {
      isValid: boolean;
      positionType: PositionType[];
      stake;
      AWeapon: Weapon[];
      BWeapon: Weapon[];
      fromBalances: AssetOutcomeShortHand;
      toBalances: AssetOutcomeShortHand;
    }) => {
      fromBalances = replaceAddressesAndBigNumberify(fromBalances, addresses);
      toBalances = replaceAddressesAndBigNumberify(toBalances, addresses);

      const fromAllocation: Allocation = [];
      const toAllocation: Allocation = [];

      Object.keys(fromBalances).forEach(key =>
        fromAllocation.push({destination: key, amount: fromBalances[key] as string})
      );
      Object.keys(toBalances).forEach(key =>
        toAllocation.push({destination: key, amount: toBalances[key] as string})
      );

      const fromOutcome = [{assetHolderAddress: AddressZero, allocation: fromAllocation}];
      const toOutcome = [{assetHolderAddress: AddressZero, allocation: toAllocation}];

      const fromAppData: RPSData = {
        positionType: positionType[0],
        stake: bigNumberify(stake.from),
        preCommit: HashZero,
        playerAWeapon: AWeapon[0],
        playerBWeapon: BWeapon[0],
        salt: HashZero,
      };
      const toAppData: RPSData = {
        positionType: positionType[1],
        stake: bigNumberify(stake.to),
        preCommit: HashZero,
        playerAWeapon: AWeapon[1],
        playerBWeapon: BWeapon[1],
        salt: HashZero,
      };

      const fromAppDataBytes = defaultAbiCoder.encode(
        [
          'tuple(uint8 positionType, uint256 stake, bytes32 preCommit, uint8 playerAWeapon, uint8 playerBWeapon, bytes32 salt)',
        ],
        [fromAppData]
      );
      const toAppDataBytes = defaultAbiCoder.encode(
        [
          'tuple(uint8 positionType, uint256 stake, bytes32 preCommit, uint8 playerAWeapon, uint8 playerBWeapon, bytes32 salt)',
        ],
        [toAppData]
      );

      const fromVariablePart: VariablePart = {
        outcome: encodeOutcome(fromOutcome),
        appData: fromAppDataBytes,
      };
      const toVariablePart: VariablePart = {
        outcome: encodeOutcome(toOutcome),
        appData: toAppDataBytes,
      };

      if (isValid) {
        const isValidFromCall = await RockPaperScissors.validTransition(
          toVariablePart,
          fromVariablePart,
          1, // unused
          numParticipants
        );
        expect(isValidFromCall).toBe(true);
      } else {
        await expectRevert(() =>
          RockPaperScissors.validTransition(
            toVariablePart,
            fromVariablePart,
            1, // unused
            numParticipants
          )
        );
      }
    }
  );
});

export const getNetworkMap = async () => {
  try {
    return await loadJsonFile(path.join(__dirname, '../../deployment/network-map.json'));
  } catch (err) {
    if (!!err.message.match('ENOENT: no such file or directory')) {
      return {};
    } else {
      throw err;
    }
  }
};

export async function setupContracts(provider: ethers.providers.JsonRpcProvider, artifact) {
  const signer = provider.getSigner(0);
  const networkId = (await provider.getNetwork()).chainId;
  const networkMap = await getNetworkMap();

  const contractName = artifact.contractName;
  const contractAddress = networkMap ? networkMap[networkId][contractName] : undefined;
  const contract = new ethers.Contract(contractAddress, artifact.abi, signer);
  return contract;
}
