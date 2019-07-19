import { ContractFactory, ethers } from 'ethers';
import {
  linkedByteCode,
  expectRevert,
  getNetworkId,
  getGanacheProvider,
  expectEvent,
  increaseTime,
  DURATION,
} from 'magmo-devtools';
import { sign, Channel, CountingApp, toHex, asEthersObject, Address } from 'fmg-core';
import { BigNumber, bigNumberify } from 'ethers/utils';
import CommitmentArtifact from '../build/contracts/Commitment.json';
import RulesArtifact from '../build/contracts/Rules.json';
import NitroVaultArtifact from '../build/contracts/TestNitroVault.json';
import CountingAppArtifact from '../build/contracts/CountingApp.json';
import { channelID as getChannelID } from 'fmg-core/lib/channel';
import { asCoreCommitment } from 'fmg-core/lib/test-app/counting-app';
import { CountingCommitment } from 'fmg-core/src/test-app/counting-app';
import { fromParameters, CommitmentType } from 'fmg-core/lib/commitment';
import { Commitment as CoreCommitment } from 'fmg-core/src/commitment';
import { AddressZero } from 'ethers/constants';

jest.setTimeout(20000);
let nitro: ethers.Contract;
let countingAppAddress;
const abiCoder = new ethers.utils.AbiCoder();
const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

const signer0 = provider.getSigner(0);

const DEPOSIT_AMOUNT = ethers.utils.parseEther('100'); //
const SMALL_WITHDRAW_AMOUNT = ethers.utils.parseEther('10');
const EPSILON = ethers.utils.parseEther('0.01');
const ZERO_ADDRESS = ethers.constants.AddressZero;

let nullOutcome: {} | any[];
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

async function setupContracts() {
  let networkId;

  networkId = (await provider.getNetwork()).chainId;
  const nitroVaultAddress = NitroVaultArtifact.networks[networkId].address;
  nitro = new ethers.Contract(nitroVaultAddress, NitroVaultArtifact.abi, signer0);
  countingAppAddress = CountingAppArtifact.networks[networkId].address;

  const unwrap = ({ challengeCommitment, finalizedAt }) => ({
    challengeCommitment,
    finalizedAt,
    allocation: [],
    destination: [],
    token: [],
  });
  nullOutcome = { ...unwrap(await nitro.outcomes(nitro.address)) };
}

const getHexForCommitment = (commitment: CountingCommitment) => {
  return toHex(asCoreCommitment(commitment));
};
const getEthersObjectForCommitment = (commitment: CountingCommitment) => {
  return asEthersObject(asCoreCommitment(commitment));
};

describe('ForceMove methods', () => {
  const aBal = ethers.utils.parseUnits('6', 'wei').toHexString();
  const bBal = ethers.utils.parseUnits('4', 'wei').toHexString();
  const allocation = [aBal, bBal];
  const differentAllocation = [bBal, aBal];

  let ledgerChannel: Channel;
  let guarantorChannel: Channel;
  let alice: ethers.Wallet;
  let aliceDest: ethers.Wallet;
  let bob: ethers.Wallet;
  let guarantor: ethers.Wallet;
  let commitment0;
  let commitment1;
  let commitment2;
  let commitment3;
  let commitment4;
  let commitment4alt: CoreCommitment;
  let commitment5;
  let commitment5alt: CoreCommitment;
  let guarantorCommitment;

  let commitment1alt;
  let commitment2alt;
  let conclusionProof;

  beforeAll(async () => {
    await setupContracts();

    // alice and bob are both funded by startGanache in magmo devtools.
    alice = new ethers.Wallet('0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72');
    bob = new ethers.Wallet('0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1');
    guarantor = ethers.Wallet.createRandom();
    aliceDest = ethers.Wallet.createRandom();

    const participants = [alice.address, bob.address];
    const destination = [alice.address, bob.address];

    ledgerChannel = {
      channelType: countingAppAddress,
      nonce: 0,
      participants,
    };

    guarantorChannel = {
      ...ledgerChannel,
      guaranteedChannel: getChannelID(ledgerChannel),
    };

    const defaults = {
      channel: ledgerChannel,
      appCounter: new BigNumber(0).toHexString(),
      destination,
      allocation,
      token: [AddressZero, AddressZero],
      commitmentCount: 1,
    };

    const guarantorDefaults = {
      ...defaults,
      channel: guarantorChannel,
    };

    commitment0 = CountingApp.createCommitment.app({
      ...defaults,
      appCounter: new BigNumber(1).toHexString(),
      turnNum: 6,
    });
    commitment1 = CountingApp.createCommitment.app({
      ...defaults,
      turnNum: 7,
      appCounter: new BigNumber(2).toHexString(),
    });
    commitment2 = CountingApp.createCommitment.app({
      ...defaults,
      turnNum: 8,
      appCounter: new BigNumber(3).toHexString(),
    });
    commitment3 = CountingApp.createCommitment.app({
      ...defaults,
      turnNum: 9,
      appCounter: new BigNumber(4).toHexString(),
    });
    commitment4 = CountingApp.createCommitment.conclude({
      ...defaults,
      turnNum: 10,
      appCounter: new BigNumber(5).toHexString(),
    });
    commitment5 = CountingApp.createCommitment.conclude({
      ...defaults,
      turnNum: 11,
      appCounter: new BigNumber(6).toHexString(),
    });
    commitment1alt = CountingApp.createCommitment.app({
      ...defaults,
      channel: ledgerChannel,
      allocation: differentAllocation,
      turnNum: 7,
      appCounter: new BigNumber(2).toHexString(),
    });
    commitment2alt = CountingApp.createCommitment.app({
      ...defaults,
      channel: ledgerChannel,
      allocation: differentAllocation,
      turnNum: 8,
      appCounter: new BigNumber(3).toHexString(),
    });
    guarantorCommitment = CountingApp.createCommitment.app({
      ...guarantorDefaults,
      appCounter: new BigNumber(1).toHexString(),
      turnNum: 6,
    });
  });

  let expectedAssertions;

  beforeEach(() => {
    expectedAssertions = 1;
    ledgerChannel.nonce += 1;
    guarantorChannel.guaranteedChannel = getChannelID(ledgerChannel);
  });

  describe('ForceMove Protocol', () => {
    let challengee;
    let challenger;

    beforeAll(async () => {
      challengee = alice;
      challenger = bob;

      await setupContracts();
    });

    beforeEach(async () => {
      await (await nitro.setOutcome(getChannelID(ledgerChannel), nullOutcome)).wait();
      // challenge doesn't exist at start of app
      expectedAssertions += 1;
      expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(false);
    });

    describe.only('conclude', () => {
      beforeEach(() => {
        const { r: r0, s: s0, v: v0 } = sign(getHexForCommitment(commitment4), alice.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(getHexForCommitment(commitment5), bob.privateKey);
        conclusionProof = {
          penultimateCommitment: getEthersObjectForCommitment(commitment4),
          ultimateCommitment: getEthersObjectForCommitment(commitment5),
          penultimateSignature: { v: v0, r: r0, s: s0 },
          ultimateSignature: { v: v1, r: r1, s: s1 },
        };
      });

      it('works when the conclusion proof is valid', async () => {
        const {
          destination: startDestination,
          allocation: startAllocation,
          challengeCommitment: startCommitment,
          finalizedAt,
          token,
        } = await nitro.getOutcome(getChannelID(ledgerChannel));
        expect({
          destination: startDestination,
          allocation: startAllocation,
          challengeCommitment: startCommitment,
          finalizedAt,
          token,
        }).toMatchObject(nullOutcome);

        const tx = await nitro.conclude(conclusionProof);
        await tx.wait();

        const {
          destination: endDestination,
          allocation: endAllocation,
          challengeCommitment,
        } = await nitro.getOutcome(getChannelID(ledgerChannel));

        expect(endDestination).toEqual(conclusionProof.penultimateCommitment.destination);
        expect(endAllocation.map(a => a.toHexString())).toEqual(allocation);
        expect(asEthersObject(fromParameters(challengeCommitment))).toMatchObject(
          conclusionProof.penultimateCommitment,
        );
        // TODO: figure out how to test finalizedAt
      });

      it('works when destination =/= participants', async () => {
        const channelAlt = {
          ...ledgerChannel,
        };
        commitment4alt = {
          channel: channelAlt,
          turnNum: 10,
          allocation: [ethers.utils.parseUnits('10', 'wei').toHexString()],
          destination: ['0xcC8Ddb252cd77F1e67f82C50dBD268eaDC9ECE68'], // an application channel
          token: [AddressZero, AddressZero],
          commitmentCount: 0,
          commitmentType: CommitmentType.App,
          appAttributes: '0x00',
        };
        commitment5alt = { ...commitment4alt, turnNum: 11 };
        const { r: r2, s: s2, v: v2 } = sign(toHex(commitment4alt), alice.privateKey);
        const { r: r3, s: s3, v: v3 } = sign(toHex(commitment5alt), bob.privateKey);
        const conclusionProofAlt = {
          penultimateCommitment: asEthersObject(commitment4alt),
          ultimateCommitment: asEthersObject(commitment5alt),
          penultimateSignature: { v: v2, r: r2, s: s2 },
          ultimateSignature: { v: v3, r: r3, s: s3 },
        };
        const {
          destination: startDestination,
          allocation: startAllocation,
          challengeCommitment: startCommitment,
          finalizedAt,
          token,
        } = await nitro.getOutcome(getChannelID(ledgerChannel));
        expect({
          destination: startDestination,
          allocation: startAllocation,
          challengeCommitment: startCommitment,
          finalizedAt,
          token,
        }).toMatchObject(nullOutcome);

        const tx = await nitro.conclude(conclusionProofAlt);
        await tx.wait();

        const {
          destination: endDestination,
          allocation: endAllocation,
          challengeCommitment,
        } = await nitro.getOutcome(getChannelID(ledgerChannel));
        expect(endDestination).toEqual(conclusionProofAlt.penultimateCommitment.destination);
        expect(endAllocation.map(a => a.toHexString())).toEqual(commitment4alt.allocation);
        expect(asEthersObject(fromParameters(challengeCommitment))).toMatchObject(
          conclusionProofAlt.penultimateCommitment,
        );
      });

      it('reverts if it has already been concluded', async () => {
        const tx = await nitro.conclude(conclusionProof);
        await tx.wait();

        expect.assertions(expectedAssertions);
        await expectRevert(
          () => nitro.conclude(conclusionProof),
          'Conclude: channel must not be finalized',
        );
      });
    });

    describe('forceMove', () => {
      it('emits ForceMove', async () => {
        const agreedCommitment = commitment0;
        const challengeCommitment = commitment1;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(challengeCommitment),
          challenger.privateKey,
        );
        const signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        expectedAssertions += 1;
        expect(await nitro.outcomeFinal(getChannelID(ledgerChannel))).toBe(false);
        const tx = await nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        const { events } = await tx.wait();

        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(true);

        // The challenge expiry should be in the future
        const blockNumber = await provider.getBlockNumber();
        const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
        expect(events[0].args.finalizedAt.gt(blockTimestamp)).toBe(true);
      });

      it('reverts when the move is not valid', async () => {
        const agreedCommitment = commitment0;
        const challengeCommitment = commitment3;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(challengeCommitment),
          challenger.privateKey,
        );
        const signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        expectedAssertions += 1;
        expect(await nitro.outcomeFinal(getChannelID(ledgerChannel))).toBe(false);

        const tx = nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        expect.assertions(expectedAssertions);
        await expectRevert(() => tx, 'Invalid transition: turnNum must increase by 1');
      });

      it('reverts when the commitments are not signed', async () => {
        const agreedCommitment = commitment0;
        const challengeCommitment = commitment1;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(commitment3),
          challenger.privateKey,
        );
        const signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        expectedAssertions += 1;
        expect(await nitro.outcomeFinal(getChannelID(ledgerChannel))).toBe(false);

        const tx = nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        expect.assertions(expectedAssertions);
        await expectRevert(() => tx, 'ForceMove: challengeCommitment not authorized');
      });

      it('reverts when the channel is closed', async () => {
        const agreedCommitment = commitment0;
        const challengeCommitment = commitment1;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(challengeCommitment),
          challenger.privateKey,
        );
        const signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeCommitment: getEthersObjectForCommitment(commitment0),
        };
        await (await nitro.setOutcome(getChannelID(ledgerChannel), allocationOutcome)).wait();
        expectedAssertions += 1;
        expect(await nitro.outcomeFinal(getChannelID(ledgerChannel))).toBe(true);

        const tx = nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        expect.assertions(expectedAssertions);
        await expectRevert(() => tx, 'ForceMove: channel must be open');
      });
    });

    describe('refute', () => {
      let agreedCommitment;
      let challengeCommitment;
      let refutationCommitment;
      let refutationSignature;
      let signatures;

      async function runBeforeRefute() {
        await (await nitro.setOutcome(getChannelID(ledgerChannel), nullOutcome)).wait();
        // challenge doesn't exist at start of app
        expectedAssertions += 1;
        expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(false);

        await nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        // challenge should be created
        expectedAssertions += 1;
        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(true);
      }

      beforeEach(() => {
        agreedCommitment = commitment0;
        challengeCommitment = commitment1;
        refutationCommitment = commitment3;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(challengeCommitment),
          challenger.privateKey,
        );
        signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        const { r: r2, s: s2, v: v2 } = sign(
          getHexForCommitment(refutationCommitment),
          challenger.privateKey,
        );
        refutationSignature = { r: r2, s: s2, v: v2 };
      });

      it('works', async () => {
        await runBeforeRefute();

        await expectEvent(
          await nitro.refute(
            getEthersObjectForCommitment(refutationCommitment),
            refutationSignature,
          ),
          'Refuted',
        );

        // "challenge should be cancelled
        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeRefute();

        // expired challenge exists at start of app
        await increaseTime(DURATION.days(2), provider);
        expectedAssertions += 1;
        expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(true);

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.refute(getEthersObjectForCommitment(refutationCommitment), refutationSignature),
          'Refute: channel must be open',
        );
      });

      it('reverts when the refutationCommitment is not signed', async () => {
        await runBeforeRefute();

        expect.assertions(expectedAssertions);
        await expectRevert(
          () => nitro.refute(getEthersObjectForCommitment(refutationCommitment), signatures[0]),
          'Refute: move must be authorized',
        );
      });

      it('reverts when the refutationCommitment is invalid', async () => {
        await runBeforeRefute();

        const invalidRefutationCommitment = commitment3;
        invalidRefutationCommitment.turnNum = agreedCommitment.turnNum - 1;

        const { r: r3, s: s3, v: v3 } = sign(
          getHexForCommitment(invalidRefutationCommitment),
          challenger.privateKey,
        );
        const invalidRefutationSignature = { r: r3, s: s3, v: v3 };

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.refute(
              getEthersObjectForCommitment(invalidRefutationCommitment),
              invalidRefutationSignature,
            ),
          'the refutationCommitment must have a higher nonce',
        );
      });
    });

    describe('respondWithMove', () => {
      let agreedCommitment;
      let challengeCommitment;
      let responseCommitment;

      let signatures;
      let responseSignature;

      beforeEach(() => {
        agreedCommitment = commitment0;
        challengeCommitment = commitment1;
        responseCommitment = commitment2;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(challengeCommitment),
          challenger.privateKey,
        );
        signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        const { r: r2, s: s2, v: v2 } = sign(
          getHexForCommitment(responseCommitment),
          challengee.privateKey,
        );
        responseSignature = { r: r2, s: s2, v: v2 };
      });

      async function runBeforeRespond() {
        await (await nitro.setOutcome(getChannelID(ledgerChannel), nullOutcome)).wait();
        // challenge doesn't exist at start of app
        expectedAssertions += 1;
        expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(false);

        await nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        // challenge should be created
        expectedAssertions += 1;
        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(true);
      }

      it('works', async () => {
        await runBeforeRespond();

        await expectEvent(
          await nitro.respondWithMove(
            getEthersObjectForCommitment(responseCommitment),
            responseSignature,
          ),
          'RespondedWithMove',
        );

        // "challenge should be cancelled
        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeRespond();

        // expired challenge exists at start of app
        await increaseTime(DURATION.days(2), provider);
        expectedAssertions += 1;
        expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(true);

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.respondWithMove(
              getEthersObjectForCommitment(responseCommitment),
              responseSignature,
            ),
          'RespondWithMove: channel must be open',
        );
      });

      it('reverts when the responseCommitment is not signed', async () => {
        await runBeforeRespond();

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.respondWithMove(getEthersObjectForCommitment(responseCommitment), signatures[0]),
          'RespondWithMove: move must be authorized',
        );
      });

      it('reverts when the responseCommitment is invalid', async () => {
        await runBeforeRespond();

        const invalidResponseCommitment = commitment3;

        const { r: r3, s: s3, v: v3 } = sign(
          getHexForCommitment(invalidResponseCommitment),
          challenger.privateKey,
        );
        const invalidResponseSignature = { r: r3, s: s3, v: v3 };

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.respondWithMove(
              getEthersObjectForCommitment(invalidResponseCommitment),
              invalidResponseSignature,
            ),
          'Invalid transition: turnNum must increase by 1',
        );
      });
    });

    describe('alternativeRespondWithMove', () => {
      let agreedCommitment;
      let challengeCommitment;
      let alternativeCommitment;
      let responseCommitment;

      let signatures;
      let alternativeSignature;
      let responseSignature;

      beforeEach(() => {
        agreedCommitment = commitment0;
        challengeCommitment = commitment1;
        alternativeCommitment = commitment1alt;
        responseCommitment = commitment2alt;

        const { r: r0, s: s0, v: v0 } = sign(
          getHexForCommitment(agreedCommitment),
          challengee.privateKey,
        );
        const { r: r1, s: s1, v: v1 } = sign(
          getHexForCommitment(challengeCommitment),
          challenger.privateKey,
        );
        signatures = [{ r: r0, s: s0, v: v0 }, { r: r1, s: s1, v: v1 }];

        const { r: r2, s: s2, v: v2 } = sign(
          getHexForCommitment(alternativeCommitment),
          challenger.privateKey,
        );
        const { r: r3, s: s3, v: v3 } = sign(
          getHexForCommitment(responseCommitment),
          challengee.privateKey,
        );

        alternativeSignature = { r: r2, s: s2, v: v2 };
        responseSignature = { r: r3, s: s3, v: v3 };
      });

      async function runBeforeAlternativeRespond() {
        await (await nitro.setOutcome(getChannelID(ledgerChannel), nullOutcome)).wait();
        // challenge doesn't exist at start of app
        expectedAssertions += 1;
        expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(false);

        await nitro.forceMove(
          getEthersObjectForCommitment(agreedCommitment),
          getEthersObjectForCommitment(challengeCommitment),
          signatures,
        );
        // challenge should be created
        expectedAssertions += 1;
        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(true);
      }

      it('works', async () => {
        await runBeforeAlternativeRespond();

        await expectEvent(
          await nitro.alternativeRespondWithMove(
            getEthersObjectForCommitment(alternativeCommitment),
            getEthersObjectForCommitment(responseCommitment),
            alternativeSignature,
            responseSignature,
          ),
          'RespondedWithAlternativeMove',
        );

        // "challenge should be cancelled
        expect(await nitro.isChallengeOngoing(getChannelID(ledgerChannel))).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeAlternativeRespond();

        // expired challenge exists at start of app
        await increaseTime(DURATION.days(2), provider);
        expectedAssertions += 1;
        expect(await nitro.isChannelClosedPub(getChannelID(ledgerChannel))).toBe(true);

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.alternativeRespondWithMove(
              getEthersObjectForCommitment(alternativeCommitment),
              getEthersObjectForCommitment(responseCommitment),
              alternativeSignature,
              responseSignature,
            ),
          'AlternativeRespondWithMove: channel must be open',
        );
      });

      it('reverts when the responseCommitment is not authorized', async () => {
        await runBeforeAlternativeRespond();

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.alternativeRespondWithMove(
              getEthersObjectForCommitment(alternativeCommitment),
              getEthersObjectForCommitment(responseCommitment),
              alternativeSignature,
              alternativeSignature,
            ),
          'AlternativeRespondWithMove: move must be authorized',
        );
      });

      it('reverts when the responseCommitment is invalid', async () => {
        await runBeforeAlternativeRespond();

        const invalidResponseCommitment = commitment3;

        const { r: r3, s: s3, v: v3 } = sign(
          getHexForCommitment(invalidResponseCommitment),
          challenger.privateKey,
        );
        const invalidResponseSignature = { r: r3, s: s3, v: v3 };

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.alternativeRespondWithMove(
              getEthersObjectForCommitment(alternativeCommitment),
              getEthersObjectForCommitment(invalidResponseCommitment),
              alternativeSignature,
              invalidResponseSignature,
            ),
          'Invalid transition: turnNum must increase by 1',
        );
      });

      it('reverts when the alternativeCommitment has the wrong turnNum', async () => {
        await runBeforeAlternativeRespond();

        const invalidAlternativeCommitment = commitment0;
        const invalidResponseCommitment = commitment1;

        const { r: r3, s: s3, v: v3 } = sign(
          getHexForCommitment(invalidAlternativeCommitment),
          challenger.privateKey,
        );
        const invalidAlternativeSignature = { r: r3, s: s3, v: v3 };
        const { r: r4, s: s4, v: v4 } = sign(
          getHexForCommitment(invalidResponseCommitment),
          challenger.privateKey,
        );
        const invalidResponseSignature = { r: r4, s: s4, v: v4 };

        expect.assertions(expectedAssertions);
        await expectRevert(
          () =>
            nitro.alternativeRespondWithMove(
              getEthersObjectForCommitment(invalidAlternativeCommitment),
              getEthersObjectForCommitment(invalidResponseCommitment),
              invalidAlternativeSignature,
              invalidResponseSignature,
            ),
          'alternativeCommitment must have the same nonce as the challenge commitment',
        );
      });
    });
  });
});
