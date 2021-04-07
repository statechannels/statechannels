import {expectRevert} from '@statechannels/devtools';
import {Contract, BigNumber, utils, Wallet, constants} from 'ethers';

import {getFixedPart, hashAppPart, State} from '../../../../src/contract/state';
import SingleChannelAdjudicatorArtifact from '../../../../artifacts/contracts/ninja-nitro/SingleChannelAdjudicator.sol/SingleChannelAdjudicator.json';
import AdjudicatorFactoryArtifact from '../../../../artifacts/contracts/ninja-nitro/AdjudicatorFactory.sol/AdjudicatorFactory.json';

import {claimAllArgs} from '../../../src/contract/transaction-creators/asset-holder';
import {
  allocationToParams,
  AssetOutcomeShortHand,
  compileEventsFromLogs,
  getRandomNonce,
  getTestProvider,
  guaranteeToParams,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  setupContracts,
  writeGasConsumption,
} from '../../test-helpers';
import {
  Channel,
  channelDataToStatus,
  convertBytes32ToAddress,
  encodeOutcome,
  getChannelId,
  hashOutcome,
  Outcome,
  signState,
} from '../../../../src';

const provider = getTestProvider();
const addresses = {
  // Channels
  t: undefined, // Target
  g: undefined, // Guarantor
  // Externals
  I: randomExternalDestination(),
  A: randomExternalDestination(),
  B: randomExternalDestination(),
};

let AdjudicatorFactory: Contract;
const chainId = process.env.CHAIN_NETWORK_ID;
const participants = ['', ''];
const wallets = new Array<Wallet>(2);
for (let i = 0; i < 2; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  AdjudicatorFactory = await setupContracts(
    provider,
    AdjudicatorFactoryArtifact,
    process.env.TEST_ASSET_HOLDER_ADDRESS
  );
});

const reason5 = 'h(allocation)!=assetOutcomeHash';
const reason6 = 'h(guarantee)!=assetOutcomeHash';

// 1. claim G1 (step 1 of figure 23 of nitro paper)
// 2. claim G2 (step 2 of figure 23 of nitro paper)
// 3. claim G1 (step 1 of alternative in figure 23 of nitro paper)
// 4. claim G2 (step 2 of alternative of figure 23 of nitro paper)

// Amounts are valueString representations of wei
describe('claim', () => {
  it.each`
    name                                               | heldBefore | guaranteeDestinations | tOutcomeBefore        | indices | tOutcomeAfter         | heldAfter | payouts   | reason
    ${'1. straight-through guarantee, 3 destinations'} | ${{g: 5}}  | ${['I', 'A', 'B']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}} | ${undefined}
    ${'2. swap guarantee,             2 destinations'} | ${{g: 5}}  | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 0}} | ${{B: 5}} | ${undefined}
    ${'3. swap guarantee,             3 destinations'} | ${{g: 5}}  | ${['I', 'B', 'A']}    | ${{I: 5, A: 5, B: 5}} | ${[0]}  | ${{I: 0, A: 5, B: 5}} | ${{g: 0}} | ${{I: 5}} | ${undefined}
    ${'4. straight-through guarantee, 2 destinations'} | ${{g: 5}}  | ${['A', 'B']}         | ${{A: 5, B: 5}}       | ${[0]}  | ${{A: 0, B: 5}}       | ${{g: 0}} | ${{A: 5}} | ${undefined}
    ${'5. allocation not on chain'}                    | ${{g: 5}}  | ${['B', 'A']}         | ${{}}                 | ${[0]}  | ${{A: 5}}             | ${{g: 0}} | ${{B: 5}} | ${reason5}
    ${'6. guarantee not on chain'}                     | ${{g: 5}}  | ${[]}                 | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5}}             | ${{g: 0}} | ${{B: 5}} | ${reason6}
    ${'7. swap guarantee, overfunded, 2 destinations'} | ${{g: 12}} | ${['B', 'A']}         | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{B: 5}} | ${undefined}
    ${'8. underspecified guarantee, overfunded      '} | ${{g: 12}} | ${['B']}              | ${{A: 5, B: 5}}       | ${[1]}  | ${{A: 5, B: 0}}       | ${{g: 7}} | ${{B: 5}} | ${undefined}
  `(
    '$name',
    async ({
      name,
      heldBefore,
      guaranteeDestinations,
      tOutcomeBefore,
      indices,
      tOutcomeAfter,
      heldAfter,
      payouts,
      reason,
    }: {
      name;
      heldBefore: AssetOutcomeShortHand;
      guaranteeDestinations;
      tOutcomeBefore: AssetOutcomeShortHand;
      indices: number[];
      tOutcomeAfter: AssetOutcomeShortHand;
      heldAfter: AssetOutcomeShortHand;
      payouts: AssetOutcomeShortHand;
      reason;
    }) => {
      // Compute channelIds
 
      const tNonce = getRandomNonce(name);
      const gNonce = getRandomNonce(name + 'g');
      const targetId = randomChannelId(tNonce);
      const gChannel: Channel = {chainId, participants, channelNonce: gNonce};
      const guarantorId = getChannelId(gChannel);

      addresses.t = targetId;
      addresses.g = guarantorId;

      const adjudicatorAddress = await AdjudicatorFactory.getChannelAddress(channelId);
      const SingleChannelAdjudicator = await setupContracts(
        provider,
        SingleChannelAdjudicatorArtifact,
        adjudicatorAddress
      );

      // Transform input data (unpack addresses and BigNumber amounts)
      [heldBefore, tOutcomeBefore, tOutcomeAfter, heldAfter, payouts] = [
        heldBefore,
        tOutcomeBefore,
        tOutcomeAfter,
        heldAfter,
        payouts,
      ].map(object => replaceAddressesAndBigNumberify(object, addresses) as AssetOutcomeShortHand);
      guaranteeDestinations = guaranteeDestinations.map(x => addresses[x]);

      // Fund the channel
      new Set([...Object.keys(heldAfter), ...Object.keys(heldBefore)]).forEach(async key => {
        // Key must be either in heldBefore or heldAfter or both
        const amount = heldBefore[key] ? heldBefore[key] : BigNumber.from(0);
        await (
          await provider.getSigner().sendTransaction({
            to: SingleChannelAdjudicator.address,
            value: amount,
          })
        ).wait();
      });


      // Compute an appropriate allocation.
      const allocation = [];
      Object.keys(tOutcomeBefore).forEach(key =>
        allocation.push({destination: key, amount: tOutcomeBefore[key]})
      );
      const [, outcomeHash] = allocationToParams(allocation);


      // Compute an appropriate guarantee

      const guarantee = {
        destinations: guaranteeDestinations,
        targetChannelId: targetId,
      };

      if (guaranteeDestinations.length > 0) {
        const [, gOutcomeContentHash] = guaranteeToParams(guarantee);

        const outcome: Outcome = [
          {assetHolderAddress: constants.AddressZero, allocationItems: allocation},
        ];

      // DEPLOY GUARANTOR CHANNEL

      await (await AdjudicatorFactory.createChannel(guarantorId)).wait();

      const turnNumRecord = 5;

      // CONCLUDE GUARANTOR CHANNEL
            const states: State[] = [
              {
                isFinal: true,
                channel: gChannel,
                outcome,
                appDefinition: constants.AddressZero,
                appData: '0x',
                challengeDuration: 0x1000,
                turnNum: turnNumRecord,
              },
            ];
      
            const sigs = [
              signState(states[0], wallets[0].privateKey).signature,
              signState(states[0], wallets[1].privateKey).signature,
            ];
      
            let blockNumber = 0;

              ({blockNumber} = await (
                await SingleChannelAdjudicator.conclude(
                  turnNumRecord,
                  getFixedPart(states[0]),
                  hashAppPart(states[0]),
                  hashOutcome(outcome),
                  1,
                  [0, 0],
                  sigs
                )
              ).wait());
            
      
            const finalizesAt = (await provider.getBlock(blockNumber)).timestamp;
      
            const balancesBefore: Record<string, BigNumber> = {};
            Object.keys(payouts).forEach(async key => {
              balancesBefore[key] = await provider.getBalance(convertBytes32ToAddress(key));
            });


      const tx = SingleChannelAdjudicator.claim(...claimAllArgs(guarantorId, guarantee, allocation), indices);

      // Call method in a slightly different way if expecting a revert
      if (reason) {
        await expectRevert(() => tx, reason);
      } else {
        // Compile event expectations

        const expectedEvents = [
          {
            event: 'AllocationUpdated',
            args: {channelId: guarantorId, initialHoldings: heldBefore[guarantorId]},
          },
        ];

        // Extract logs
        const {events: eventsFromTx, gasUsed} = await (await tx).wait();
        await writeGasConsumption('claim.gas.md', name, gasUsed);

        // Check that each expectedEvent is contained as a subset of the properies of each *corresponding* event: i.e. the order matters!
        expect(eventsFromTx).toMatchObject(expectedEvents);

        // Check new holdings // TODO check ETH balance of target
        // Object.keys(heldAfter).forEach(async key =>
        //   expect(await AssetHolder.holdings(key)).toEqual(heldAfter[key])
        // );

                // Check new outcomeHash
                const newAllocation = [];
                Object.keys(newOutcome).forEach(key =>
                  newAllocation.push({destination: key, amount: newOutcome[key]})
                );
                const outcome: Outcome = [
                  {assetHolderAddress: constants.AddressZero, allocationItems: newAllocation},
                ];
        
                const expectedFingerprint = channelDataToStatus({
                  turnNumRecord: 0,
                  finalizesAt,
                  outcome,
                });
        
                // Check fingerprint against the expected value
                // NOTE that allocations for zero amounts are left in place
                expect(await SingleChannelAdjudicator.statusOf(guarantorId)).toEqual(expectedFingerprint);
              }
    }
  );
});
