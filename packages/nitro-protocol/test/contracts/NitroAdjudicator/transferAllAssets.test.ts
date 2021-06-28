import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, ethers, constants} from 'ethers';

import {Channel, getChannelId} from '../../../src/contract/channel';
import {
  AllocationAssetOutcome,
  encodeOutcome,
  hashOutcome,
  Outcome,
} from '../../../src/contract/outcome';
import {hashState, State} from '../../../src/contract/state';
import {
  checkMultipleAssetOutcomeHashes,
  checkMultipleHoldings,
  compileEventsFromLogs,
  computeOutcome,
  finalizedFingerprint,
  getRandomNonce,
  getTestProvider,
  MAGIC_ADDRESS_INDICATING_ETH,
  OutcomeShortHand,
  randomChannelId,
  randomExternalDestination,
  replaceAddressesAndBigNumberify,
  resetMultipleHoldings,
  setupContract,
} from '../../test-helpers';
import {TESTNitroAdjudicator} from '../../../typechain/TESTNitroAdjudicator';
import {Token} from '../../../typechain/Token';
import TokenArtifact from '../../../artifacts/contracts/Token.sol/Token.json';

// eslint-disable-next-line import/order
import TESTNitroAdjudicatorArtifact from '../../../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';
import {channelDataToStatus} from '../../../src';

const testNitroAdjudicator = (setupContract(
  getTestProvider(),
  TESTNitroAdjudicatorArtifact,
  process.env.TEST_NITRO_ADJUDICATOR_ADDRESS
) as unknown) as TESTNitroAdjudicator & Contract;

const token = (setupContract(
  getTestProvider(),
  TokenArtifact,
  process.env.TEST_TOKEN_ADDRESS
) as unknown) as Token & Contract;

const addresses = {
  // Channels
  c: undefined,
  C: randomChannelId(),
  X: randomChannelId(),
  // Externals
  A: randomExternalDestination(),
  B: randomExternalDestination(),
  ETH: MAGIC_ADDRESS_INDICATING_ETH,
  ERC20: token.address,
};

// Constants for this test suite

const chainId = process.env.CHAIN_NETWORK_ID;
const participants = ['', '', ''];
const wallets = new Array(3);

// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = Wallet.createRandom();
  participants[i] = wallets[i].address;
}

// Scenarios are synonymous with channelNonce:

// Const description1 =
//   'testNitroAdjudicator accepts a pushOutcomeAndTransferAll tx for a finalized channel, and 1x Asset types transferred';
const description2 =
  'testNitroAdjudicator accepts a transferAllAssets tx for a finalized channel, and 2x Asset types transferred';
const channelNonce = getRandomNonce('transferAllAssets');
const storedTurnNumRecord = 5;
const declaredTurnNumRecord = storedTurnNumRecord;

describe('transferAllAssets', () => {
  it.each`
    description     | setOutcome                      | heldBefore                      | newOutcome                      | heldAfter                       | payouts                         | reasonString
    ${description2} | ${{ETH: {A: 1}, ERC20: {A: 2}}} | ${{ETH: {c: 1}, ERC20: {c: 2}}} | ${{ETH: {A: 0}, ERC20: {A: 0}}} | ${{ETH: {c: 0}, ERC20: {c: 0}}} | ${{ETH: {A: 1}, ERC20: {A: 2}}} | ${undefined}
  `(
    '$description', // For the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      setOutcome,
      heldBefore,
      newOutcome,
      heldAfter,
      payouts,
      reasonString,
    }: {
      setOutcome: OutcomeShortHand;
      heldBefore: OutcomeShortHand;
      newOutcome: OutcomeShortHand;
      heldAfter: OutcomeShortHand;
      payouts: OutcomeShortHand;
      reasonString: string;
    }) => {
      const channel: Channel = {chainId, channelNonce, participants};
      const channelId = getChannelId(channel);
      addresses.c = channelId;

      // Transform input data (unpack addresses and BigNumberify amounts)
      [heldBefore, setOutcome, newOutcome, heldAfter, payouts] = [
        heldBefore,
        setOutcome,
        newOutcome,
        heldAfter,
        payouts,
      ].map(object => replaceAddressesAndBigNumberify(object, addresses) as OutcomeShortHand);

      // Deposit into channels
      await Promise.all(
        // For each asset
        Object.keys(heldBefore).map(async asset => {
          await Promise.all(
            Object.keys(heldBefore[asset]).map(async destination => {
              // for each channel
              const amount = heldBefore[asset][destination];
              if (asset != MAGIC_ADDRESS_INDICATING_ETH) {
                // Increase allowance
                await (await token.increaseAllowance(testNitroAdjudicator.address, amount)).wait(); // Approve enough for setup and main test
              }
              await (
                await testNitroAdjudicator.deposit(asset, destination, 0, amount, {
                  value: asset == MAGIC_ADDRESS_INDICATING_ETH ? amount : 0,
                })
              ).wait();
              expect((await testNitroAdjudicator.holdings(asset, destination)).eq(amount)).toBe(
                true
              );
            })
          );
        })
      );

      // Compute the outcome.
      const outcome: AllocationAssetOutcome[] = computeOutcome(setOutcome);
      const outcomeHash = hashOutcome(outcome);
      // Call public wrapper to set state (only works on test contract)
      const stateHash = constants.HashZero;
      const challengerAddress = constants.AddressZero;
      const finalizesAt = 42;
      const turnNumRecord = 7;
      await (
        await testNitroAdjudicator.setStatusFromChannelData(channelId, {
          turnNumRecord,
          finalizesAt,
          stateHash,
          challengerAddress,
          outcomeHash,
        })
      ).wait();
      const encodedOutcome = encodeOutcome(outcome);

      const tx1 = testNitroAdjudicator.transferAllAssets(
        channelId,
        encodedOutcome,
        stateHash,
        challengerAddress
      );

      // Call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$'
        );
        await expectRevert(() => tx1, regex);
      } else {
        const {events: eventsFromTx} = await (await tx1).wait();

        // Build up event expectations
        const expectedEvents = [];

        // Add an AllocationUpdated event to expectations
        Object.keys(heldBefore).forEach(key => {
          expectedEvents.push({
            event: 'FingerprintUpdated',
            args: [
              channelId,
              expect.any(String), // for each asset, we expect one event. This may change under future gas optimizations.
            ],
          });
        });

        // Check that each expectedEvent is contained as a subset of the properies of each *corresponding* event: i.e. the order matters!
        // TODO decode events // expect(eventsFromTx).toContain(expectedEvents);

        // Check new status
        const outcomeAfter: Outcome = computeOutcome(newOutcome);
        const expectedStatusAfter = channelDataToStatus({
          turnNumRecord,
          finalizesAt,
          // stateHash will be set to HashZero by this helper fn
          // if state property of this object is undefined
          challengerAddress,
          outcome: outcomeAfter,
        });
        expect(await testNitroAdjudicator.statusOf(channelId)).toEqual(expectedStatusAfter);

        // Check new holdings
      }
    }
  );
});
