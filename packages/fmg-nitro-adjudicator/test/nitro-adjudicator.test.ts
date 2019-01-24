import { ContractFactory, ethers } from 'ethers';
import {
  linkedByteCode,
  assertRevert,
  getNetworkId,
  getGanacheProvider,
  expectEvent,
  increaseTime,
  DURATION,
  delay,
} from 'magmo-devtools';
import { sign, Channel, CountingGame } from 'fmg-core';

import StateArtifact from '../build/contracts/State.json';
import RulesArtifact from '../build/contracts/Rules.json';
import testNitroAdjudicatorArtifact from '../build/contracts/testNitroAdjudicator.json';
import { getCountingGame } from './CountingGame';

jest.setTimeout(20000);
let nitro: ethers.Contract;
const abiCoder = new ethers.utils.AbiCoder();
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

const DEPOSIT_AMOUNT = 255; //
const SMALL_WITHDRAW_AMOUNT = 10;
const ZERO_ADDRESS = "0x" + "0".repeat(40);

let nullOutcome: {} | any[];
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

function depositTo(destination: any, value = DEPOSIT_AMOUNT): Promise<any> {
  return nitro.deposit(destination, { value });
}

async function withdraw(
  participant,
  destination: string,
  signer = participant,
  amount = DEPOSIT_AMOUNT,
  senderAddr = null
): Promise<any> {
  senderAddr = senderAddr || await nitro.signer.getAddress();
  const authorization = abiCoder.encode(AUTH_TYPES, [participant.address, destination, amount, senderAddr]);

  const sig = sign(authorization, signer.privateKey);
  return nitro.withdraw(
    participant.address,
    destination,
    amount,
    sig.v,
    sig.r,
    sig.s,
    { gasLimit: 3000000 },
  );
}

async function setupContracts() {
  const networkId = await getNetworkId();

  testNitroAdjudicatorArtifact.bytecode = linkedByteCode(
    testNitroAdjudicatorArtifact,
    StateArtifact,
    networkId,
  );
  testNitroAdjudicatorArtifact.bytecode = linkedByteCode(
    testNitroAdjudicatorArtifact,
    RulesArtifact,
    networkId,
  );

  nitro = await ContractFactory.fromSolidity(testNitroAdjudicatorArtifact, providerSigner).deploy();
  await nitro.deployed();

  const unwrap = ({ challengeState, finalizedAt, guaranteedChannel }) => ({challengeState, finalizedAt, guaranteedChannel, allocation: [], destination: [],  });
  nullOutcome = { ...unwrap(await nitro.outcomes(nitro.address))};
}

describe('nitroAdjudicator', () => {
  const aBal = ethers.utils.parseUnits('6', 'wei');
  const bBal = ethers.utils.parseUnits('4', 'wei');
  const allocation = [aBal, bBal];
  const differentAllocation = [bBal, aBal];

  let channel: Channel;
  let alice: ethers.Wallet;
  let aliceDest: ethers.Wallet;
  let bob: ethers.Wallet;
  let guarantor: ethers.Wallet;
  let state0;
  let state1;
  let state2;
  let state3;
  let state4;
  let state5;

  let state1alt;
  let state2alt;
  let conclusionProof;

  let CountingGameContract;

  beforeAll(async () => {
    await setupContracts(); 

    // alice and bob are both funded by startGanache in magmo devtools.
    alice = new ethers.Wallet("0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72");
    bob = new ethers.Wallet("0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1");
    guarantor = ethers.Wallet.createRandom();
    aliceDest = ethers.Wallet.createRandom();
    CountingGameContract = await getCountingGame();

    const participants = [alice.address, bob.address];
    const destination = [alice.address, bob.address];

    channel = new Channel(
        CountingGameContract.address,
        0,
        participants
    );

    const defaults = { channel, gameCounter: 0, destination, allocation };

    state0 = CountingGame.gameState({
        ...defaults,
        gameCounter: 1,
        turnNum: 6,
    });
    state1 = CountingGame.gameState({
        ...defaults,
        turnNum: 7,
        gameCounter: 2,
    });
    state2 = CountingGame.gameState({
        ...defaults,
        turnNum: 8,
        gameCounter: 3,
    });
    state3 = CountingGame.gameState({
        ...defaults,
        turnNum: 9,
        gameCounter: 4,
    });
    state4 = CountingGame.concludeState({
        ...defaults,
        turnNum: 8,
        gameCounter: 4,
    });
    state5 = CountingGame.concludeState({
        ...defaults,
        turnNum: 9,
        gameCounter: 4,
    });
    state1alt = CountingGame.gameState({
      ...defaults,
      channel,
      allocation: differentAllocation,
      turnNum: 7,
      gameCounter: 2,
    });
    state2alt = CountingGame.gameState({
      ...defaults,
      channel,
      allocation: differentAllocation,
      turnNum: 8,
      gameCounter: 3,
    });

    const { r: r0, s: s0, v: v0 } = sign(state4.toHex(), alice.privateKey);
    const { r: r1, s: s1, v: v1 } = sign(state5.toHex(), bob.privateKey);

    conclusionProof = {
            penultimateState: state4.asEthersObject,
            ultimateState: state5.asEthersObject,
            penultimateSignature: { v: v0, r: r0, s: s0 },
            ultimateSignature: { v: v1, r: r1, s: s1 },
    };
  });

  describe('Eth management', () => {
    describe('deposit', () => {
      it('works', async () => {
        await depositTo(channel.id);
        const allocatedAmount = await nitro.holdings(channel.id);

        expect(allocatedAmount.toNumber()).toEqual(DEPOSIT_AMOUNT);
      });
    });

    describe('withdraw', () => {
      it('works when holdings[participant] >= amount and sent on behalf of participant', async () => {
        await depositTo(alice.address);

        const startBal = await provider.getBalance(aliceDest.address);
        const allocatedAtStart = await nitro.holdings(alice.address); // should be at least DEPOSIT_AMOUNT, regardless of test ordering

        // Alice can withdraw some of her money
        await withdraw(alice, aliceDest.address, alice, SMALL_WITHDRAW_AMOUNT);

        expect(Number(await provider.getBalance(aliceDest.address))).toEqual(
          Number(startBal.add(SMALL_WITHDRAW_AMOUNT)),
        );
        expect(Number(await nitro.holdings(alice.address))).toEqual(
          Number(allocatedAtStart - SMALL_WITHDRAW_AMOUNT),
        );

        // Alice should be able to withdraw all remaining funds allocated to her.
        await withdraw(alice, aliceDest.address, alice, allocatedAtStart - SMALL_WITHDRAW_AMOUNT);

        expect(Number(await provider.getBalance(aliceDest.address))).toEqual(
          Number(await provider.getBalance(aliceDest.address)),
        );
        expect(Number(await nitro.holdings(alice.address))).toEqual(0);
      });

      it('reverts when holdings[participant] > amount but not sent on behalf of participant', async () => {
        await delay();
        await depositTo(alice.address);
        assertRevert(
          withdraw(alice, aliceDest.address, bob),
          'Withdraw: not authorized by participant',
        );
        await delay();
      });

      it('reverts when sent on behalf of participant but holdings[participant] < amount', async () => {
        await delay(2000);
        await depositTo(alice.address);
        await delay();
        const allocated = await nitro.holdings(alice.address); // should be at least DEPOSIT_AMOUNT, regardless of test ordering
        assertRevert(withdraw(alice, aliceDest.address, alice, Number(allocated) + 100000));
        await delay();
      });

      it('reverts when unauthorized', async () => {
        await delay(2000);
        await depositTo(alice.address);
        await delay();
        const allocated = await nitro.holdings(alice.address); // should be at least DEPOSIT_AMOUNT, regardless of test ordering
        assertRevert(withdraw(alice, aliceDest.address, alice, 0, alice.address), "Withdraw: not authorized by participant"); // alice doesn't sign transactions, so the signature is incorrect 
        await delay();
      });
    });

    describe('transfer', () => {
      it('works when \
          the outcome is final and \
          outcomes[fromChannel].destination is covered by holdings[fromChannel]', async () => {
        await depositTo(channel.id);
        await depositTo(guarantor.address);
        await delay();

        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();

        const allocatedToChannel = await nitro.holdings(channel.id);
        const allocatedToAlice = await nitro.holdings(alice.address);

        await nitro.transfer(channel.id, alice.address, allocation[0]);

        expect(await nitro.holdings(alice.address)).toEqual(allocatedToAlice.add(allocation[0]));
        expect(await nitro.holdings(channel.id)).toEqual(
          allocatedToChannel.sub(allocation[0]),
        );

        await delay();
      });

      it('reverts when the outcome is not final', async () => {
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(Date.now() + 1000),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();

        assertRevert(
          nitro.transfer(channel.id, aliceDest.address, allocation[0]),
          'Transfer: outcome must be final',
        );

        await delay(100);
      });

      it('reverts when the outcome is final but the destination is not covered', async () => {
        const allocated = await nitro.holdings(channel.id);
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation: [allocated.add(1), allocation[1]],
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();

        assertRevert(
          nitro.transfer(channel.id, alice.address, allocated.add(1)),
          'Transfer: holdings[channel] must cover transfer',
        );

        await delay(1000);
      });

      it('reverts when the outcome is final \
              and the destination is covered by holdings[channel] \
              but outcome.amount[destination] < amount', async () => {
        await nitro.deposit(channel.id, { value: allocation[0].add(allocation[1]) });

        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();

        assertRevert(
          nitro.transfer(channel.id, alice.address, allocation[0].add(1)),
          'Transfer: transfer too large',
        );

        await delay(1000);
      });

      it('reverts when the destination is not in outcome.destination', async () => {
        await nitro.deposit(channel.id, { value: allocation[0].add(allocation[1]) });

        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();

        assertRevert(
          nitro.transfer(channel.id, aliceDest.address, allocation[0]),
          'Transfer: transfer too large',
        );

        await delay(1000);
      });

      it('reverts when finalizedAt is 0', async () => {
        await nitro.deposit(channel.id, { value: allocation[0].add(allocation[1]) });

        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();

        assertRevert(
          nitro.transfer(channel.id, alice.address, allocation[0]),
          'Transfer: outcome must be present',
        );

        await delay(1000);
      });
    });

    describe('claim', () => {
      const finalizedAt = 1;
      it('works', async () => {
        const recipient = bob.address;
        const guarantee = {
          destination: [bob.address, alice.address],
          allocation: [],
          finalizedAt: ethers.utils.bigNumberify(finalizedAt),
          challengeState: state0.asEthersObject,
          guaranteedChannel: channel.id,
        };
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(finalizedAt),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        await (await nitro.setOutcome(guarantor.address, guarantee)).wait();
        await (await nitro.setOutcome(channel.id, allocationOutcome)).wait();

        expect(await nitro.getOutcome(channel.id)).toMatchObject(allocationOutcome);
        expect(await nitro.getOutcome(guarantor.address)).toMatchObject(guarantee);

        let startBal = 5;
        const claimAmount = 2;
        await (await nitro.deposit(guarantor.address, { value: startBal })).wait();

        // Other tests may have deposited into guarantor.address, but we
        // ensure that the guarantor has at least 5 in holdings
        startBal = await nitro.holdings(guarantor.address);
        expect(Number(await nitro.holdings(recipient))).toEqual(0);

        const allocationAfterClaim = [aBal, bBal.sub(claimAmount)];
        const expectedOutcome = {
          destination: [alice.address, bob.address],
          allocation: allocationAfterClaim,
          finalizedAt: ethers.utils.bigNumberify(finalizedAt),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };

        // guarantor = G
        // recipient = χ (bob)
        // outcome = (A: 5, χ: 5)
        // channel.id = L
        // C_{G,χ}(2) [[􏰀G:5 􏰂→ (L|χ), L:(A : 5, χ : 5)]]􏰁 =
        // 􏰀  [[G:3 􏰂→ (L|χ), L:(A : 5, χ : 3), χ:2]]􏰁
        await (await nitro.claim(guarantor.address, recipient, claimAmount)).wait();

        const newOutcome = await nitro.getOutcome(channel.id);
        expect(newOutcome).toMatchObject(expectedOutcome);
        expect(Number(await nitro.holdings(guarantor.address))).toEqual(startBal - claimAmount);
        expect(Number(await nitro.holdings(recipient))).toEqual(claimAmount);
      });

      it('reverts if guarantor is underfunded', async () => {
        const recipient = bob.address;
        const guarantee = {
          destination: [bob.address, alice.address],
          allocation: [],
          finalizedAt: ethers.utils.bigNumberify(finalizedAt),
          challengeState: state0.asEthersObject,
          guaranteedChannel: channel.id,
        };
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(finalizedAt),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        await (await nitro.setOutcome(channel.id, allocationOutcome)).wait();
        await (await nitro.setOutcome(guarantor.address, guarantee)).wait();

        const claimAmount = Number(await nitro.holdings(guarantor.address)) + 1;
        assertRevert(
          nitro.claim(guarantor.address, recipient, claimAmount),
          'Claim: guarantor must be sufficiently funded',
        );
        await delay(50);
      });

      it('reverts if the recipient channel\'s outcome is not finalized', async () => {
        const recipient = bob.address;
        const guarantee = {
          destination: [bob.address, alice.address],
          allocation: [],
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: channel.id,
        };
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        await (await nitro.setOutcome(channel.id, allocationOutcome)).wait();
        await (await nitro.setOutcome(guarantor.address, guarantee)).wait();

        assertRevert(
          nitro.claim(guarantor.address, recipient, 0),
          'Claim: channel must be closed',
        );
      });
    });

    describe('setOutcome', () => {
      it('works', async () => { 
        await delay();
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const tx = await nitro.setOutcome(channel.id, allocationOutcome);
        await tx.wait();
        await delay();

        const setOutcome = await nitro.getOutcome(channel.id);
        expect(setOutcome).toMatchObject(allocationOutcome);
        await delay();
      });
    });

    describe('overlap', () => {
      it('returns funding when funding is less than the amount allocated to the recipient in the outcome', async () => {
        const recipient = alice.address;
        const outcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const funding = ethers.utils.bigNumberify(2);
        expect(await nitro.overlapPub(recipient, outcome, funding)).toEqual(funding);
      });

      it('returns funding when funding is equal to than the amount allocated to the recipient in the outcome', async () => {
        const recipient = alice.address;
        const outcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const funding = aBal;
        expect(await nitro.overlapPub(recipient, outcome, funding)).toEqual(funding);
      });

      it('returns the allocated amount when funding is greater than the amount allocated to the recipient in the outcome', async () => {
        const recipient = alice.address;
        const outcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const funding = aBal.add(1);
        expect(await nitro.overlapPub(recipient, outcome, funding)).toEqual(aBal);
      });

      it('returns zero when recipient is not a participant', async () => {
        const recipient = aliceDest.address;
        const outcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const funding = aBal.add(1);
        const zero = ethers.utils.bigNumberify(0);
        expect(await nitro.overlapPub(recipient, outcome, funding)).toEqual(zero);
      });
    });

    describe('remove', () => {
      it('works', async() => {
        const outcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        const removeAmount = 2;
        const allocationAfterRemove = [aBal, bBal.sub(removeAmount)];

        const expectedOutcome = {
          destination: [alice.address, bob.address],
          allocation: allocationAfterRemove,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
        };


        const recipient = bob.address;
        const newOutcome = await nitro.removePub(outcome, recipient, removeAmount);

        expect(newOutcome).toMatchObject(expectedOutcome);
      });
    });

    describe('reprioritize', () => {
      it('works when the guarantee destination length matches the allocation outcome\'s allocation length', async () => {
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };

        const guarantee = {
          destination: [bob.address, alice.address],
          allocation: [],
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: channel.id,
        };
        // const guarantee = [guarantor.address, channel.id,[bob.address, alice.address]];

        const expectedOutcome = {
          destination: [bob.address, alice.address],
          allocation: differentAllocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };

        const newOutcome = await nitro.reprioritizePub(allocationOutcome, guarantee);

        expect(newOutcome).toMatchObject(expectedOutcome);
      });

      it('works when the guarantee destination length is less than the allocation outcome\'s allocation length', async () => {
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };

        const guarantee = {
          destination: [bob.address],
          allocation: [],
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: channel.id,
        };
        // const guarantee = [guarantor.address, channel.id,[bob.address, alice.address]];

        const expectedOutcome = {
          destination: [bob.address],
          allocation: [bBal],
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };

        const newOutcome = await nitro.reprioritizePub(allocationOutcome, guarantee);

        expect(newOutcome).toMatchObject(expectedOutcome);
      });

    });

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
      await (await nitro.setOutcome(channel.id, nullOutcome)).wait();
      // challenge doesn't exist at start of game
      expect(
        await nitro.isChannelClosedPub(channel.id)
      ).toBe(false);
    });

    describe('conclude', () => {
      it('works when the conclusion proof is valid', async () => {
        await delay();
        const { destination: startDestination, allocation: startAllocation, challengeState: startState, finalizedAt, guaranteedChannel } = await nitro.getOutcome(channel.id);
        expect({ destination: startDestination, allocation: startAllocation, challengeState: startState, finalizedAt, guaranteedChannel }).toMatchObject(nullOutcome);

        const tx = await nitro.conclude(conclusionProof);
        await tx.wait();
        await delay();

        const { destination: endDestination, allocation: endAllocation, challengeState } = await nitro.getOutcome(channel.id);

        expect(endDestination).toEqual([alice.address, bob.address]);
        expect(endAllocation).toEqual(allocation);
        expect(challengeState).toMatchObject(conclusionProof.penultimateState);
        // TODO: figure out how to test finalizedAt

      });

      it('reverts if it has already been concluded', async () => {
        const tx = await nitro.conclude(conclusionProof);
        await tx.wait();

        assertRevert(
          nitro.conclude(conclusionProof),
          "Conclude: channel must not be finalized"
        );
        await delay();
      });
    });

    describe('forceMove', () => {
      it('emits ForceMove', async () => {
        const agreedState = state0;
        const challengeState = state1;

        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        const signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 }
        ];

        expect(await nitro.outcomeFinal(channel.id)).toBe(false);
        const filter = nitro.filters.ChallengeCreated(null, null, null);
    
        const { emitterWitness, eventPromise } = expectEvent(nitro, filter);

        const tx = await nitro.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
          ZERO_ADDRESS,
          signatures,
        );
        await tx.wait();
        await eventPromise;

        expect(await nitro.isChallengeOngoing(channel.id)).toBe(true);

        expect(emitterWitness).toBeCalled();
      });

      it('reverts when the move is not valid', async () => {
        const agreedState = state0;
        const challengeState = state3;

        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        const signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 }
        ];
    
        expect(await nitro.outcomeFinal(channel.id)).toBe(false);
    
        const tx = nitro.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
          ZERO_ADDRESS,
          signatures,
        );
        assertRevert(
          tx,
          "Invalid transition: turnNum must increase by 1"
        );
        await delay();
      });

      it('reverts when the states are not signed', async () => {
        const agreedState = state0;
        const challengeState = state1;

        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(state3.toHex(), challenger.privateKey);
        const signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 }
        ];
    
        expect(await nitro.outcomeFinal(channel.id)).toBe(false);
    
        const tx = nitro.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
          ZERO_ADDRESS,
          signatures,
        );
        assertRevert(
          tx,
          "ForceMove: challengeState not authorized"
        );
        await delay();
      });

      it('reverts when the channel is closed', async () => {
        const agreedState = state0;
        const challengeState = state1;

        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        const signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 }
        ];
    
        const allocationOutcome = {
          destination: [alice.address, bob.address],
          allocation,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
          guaranteedChannel: ZERO_ADDRESS,
        };
        await (await nitro.setOutcome(channel.id, allocationOutcome)).wait();
        expect(await nitro.outcomeFinal(channel.id)).toBe(true);
    
        const tx = nitro.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
          ZERO_ADDRESS,
          signatures,
        );
        assertRevert(
          tx,
          "ForceMove: channel must be open"
        );
        await delay();
      });
    });

    describe('refute', () => {
      let agreedState;
      let challengeState;
      let refutationState;
      let refutationSignature;
      let signatures;

      async function runBeforeRefute() {
        await (await nitro.setOutcome(channel.id, nullOutcome)).wait();
        // challenge doesn't exist at start of game
        expect(
          await nitro.isChannelClosedPub(channel.id)
        ).toBe(false);
    
        await nitro.forceMove(
          agreedState.args,
          challengeState.args,
          ZERO_ADDRESS,
          signatures,
        );
        // challenge should be created
        expect(await nitro.isChallengeOngoing(channel.id)).toBe(true);
      }

      it('works', async () => {
        await runBeforeRefute();
    
        const { emitterWitness, eventPromise } = expectEvent(nitro, 'Refuted');
        await nitro.refute(refutationState.asEthersObject, refutationSignature);
    
        await eventPromise;
        expect(emitterWitness).toBeCalled();

        // "challenge should be cancelled
        expect(await nitro.isChallengeOngoing(channel.id)).toBe(false);
      });

      beforeAll(() => {
        agreedState = state0;
        challengeState = state1;
        refutationState = state3;
    
        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 },
        ];
      
        const { r: r2, s: s2, v: v2 } = sign(refutationState.toHex(), challenger.privateKey);
        refutationSignature = { r: r2, s: s2, v: v2 };
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeRefute();

        // expired challenge exists at start of game
        await increaseTime(DURATION.days(2), provider);
        expect(
          await nitro.isChannelClosedPub(channel.id)
        ).toBe(true);
    
        assertRevert(
          nitro.refute(refutationState.asEthersObject, refutationSignature),
          "Refute: channel must be open"
        );
        await delay();
      });

      it('reverts when the refutationState is not signed', async () => {
        await runBeforeRefute();

        assertRevert(
          nitro.refute(refutationState.asEthersObject, signatures[0]),
          "Refute: move must be authorized"
        );
        await delay();
      });

      it('reverts when the refutationState is invalid', async () => {
        await runBeforeRefute();

        const invalidRefutationState = state3;
        invalidRefutationState.turnNum = agreedState.turnNum - 1;
      
        const { r: r3, s: s3, v: v3 } = sign(invalidRefutationState.toHex(), challenger.privateKey);
        const invalidRefutationSignature = { r: r3, s: s3, v: v3 };

        assertRevert(
          nitro.refute(invalidRefutationState.asEthersObject, invalidRefutationSignature),
          "the refutationState must have a higher nonce"
        );
        await delay();
      });
    });

    describe('respondWithMove', () => {
      let agreedState;
      let challengeState;
      let responseState;
  
      let signatures;
      let responseSignature;

      beforeAll(() => {
        agreedState = state0;
        challengeState = state1;
        responseState = state2;
    
        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 },
        ];
      
        const { r: r2, s: s2, v: v2 } = sign(responseState.toHex(), challengee.privateKey);
        responseSignature = { r: r2, s: s2, v: v2 };
      });

      async function runBeforeRespond() {
        await (await nitro.setOutcome(channel.id, nullOutcome)).wait();
        // challenge doesn't exist at start of game
        expect(
          await nitro.isChannelClosedPub(channel.id)
        ).toBe(false);
    
        await nitro.forceMove(
          agreedState.args,
          challengeState.args,
          ZERO_ADDRESS,
          signatures,
        );
        // challenge should be created
        expect(await nitro.isChallengeOngoing(channel.id)).toBe(true);
      }

      it('works', async () => {
        await runBeforeRespond();
    
        const { emitterWitness, eventPromise } = expectEvent(nitro, 'RespondedWithMove');
        await nitro.respondWithMove(responseState.asEthersObject, responseSignature);
    
        await eventPromise;
        expect(emitterWitness).toBeCalled();

        // "challenge should be cancelled
        expect(await nitro.isChallengeOngoing(channel.id)).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeRespond();

        // expired challenge exists at start of game
        await increaseTime(DURATION.days(2), provider);
        expect(
          await nitro.isChannelClosedPub(channel.id)
        ).toBe(true);
    
        assertRevert(
          nitro.respondWithMove(responseState.asEthersObject, responseSignature),
          "RespondWithMove: channel must be open"
        );
        await delay();
      });

      it('reverts when the responseState is not signed', async () => {
        await runBeforeRespond();

        assertRevert(
          nitro.respondWithMove(responseState.asEthersObject, signatures[0]),
          "RespondWithMove: move must be authorized"
        );
        await delay();
      });
 
      it('reverts when the responseState is invalid', async () => {
        await runBeforeRespond();

        const invalidResponseState = state3;
      
        const { r: r3, s: s3, v: v3 } = sign(invalidResponseState.toHex(), challenger.privateKey);
        const invalidResponseSignature = { r: r3, s: s3, v: v3 };

        assertRevert(
          nitro.respondWithMove(invalidResponseState.asEthersObject, invalidResponseSignature),
          "Invalid transition: turnNum must increase by 1"
        );
        await delay();
      });
    });

    describe('alternativeRespondWithMove', () => {
      let agreedState;
      let challengeState;
      let alternativeState;
      let responseState;
  
      let signatures;
      let alternativeSignature;
      let responseSignature;

      beforeAll(() => {
        agreedState = state0;
        challengeState = state1;
        alternativeState = state1alt;
        responseState = state2alt;
    
        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 },
        ];
      
        const { r: r2, s: s2, v: v2 } = sign(alternativeState.toHex(), challenger.privateKey);
        const { r: r3, s: s3, v: v3 } = sign(responseState.toHex(), challengee.privateKey);

        alternativeSignature = { r: r2, s: s2, v: v2 };
        responseSignature = { r: r3, s: s3, v: v3 };
      });

      async function runBeforeAlternativeRespond() {
        await (await nitro.setOutcome(channel.id, nullOutcome)).wait();
        // challenge doesn't exist at start of game
        expect(
          await nitro.isChannelClosedPub(channel.id)
        ).toBe(false);
    
        await nitro.forceMove(
          agreedState.args,
          challengeState.args,
          ZERO_ADDRESS,
          signatures,
        );
        // challenge should be created
        expect(await nitro.isChallengeOngoing(channel.id)).toBe(true);
      }

      it('works', async () => {
        await runBeforeAlternativeRespond();
    
        const { emitterWitness, eventPromise } = expectEvent(nitro, 'RespondedWithAlternativeMove');
        await nitro.alternativeRespondWithMove(alternativeState.asEthersObject, responseState.asEthersObject, alternativeSignature, responseSignature);
    
        await eventPromise;
        expect(emitterWitness).toBeCalled();

        // "challenge should be cancelled
        expect(await nitro.isChallengeOngoing(channel.id)).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeAlternativeRespond();

        // expired challenge exists at start of game
        await increaseTime(DURATION.days(2), provider);
        expect(
          await nitro.isChannelClosedPub(channel.id)
        ).toBe(true);
    
        assertRevert(
          nitro.alternativeRespondWithMove(alternativeState.asEthersObject, responseState.asEthersObject, alternativeSignature, responseSignature),
          "AlternativeRespondWithMove: channel must be open"
        );
        await delay();
      });

      it('reverts when the responseState is not authorized', async () => {
        await runBeforeAlternativeRespond();

        assertRevert(
          nitro.alternativeRespondWithMove(alternativeState.asEthersObject, responseState.asEthersObject, alternativeSignature, alternativeSignature),
          "AlternativeRespondWithMove: move must be authorized"
        );
        await delay();
      });
 
      it('reverts when the responseState is invalid', async () => {
        await runBeforeAlternativeRespond();

        const invalidResponseState = state3;
      
        const { r: r3, s: s3, v: v3 } = sign(invalidResponseState.toHex(), challenger.privateKey);
        const invalidResponseSignature = { r: r3, s: s3, v: v3 };

        assertRevert(
          nitro.alternativeRespondWithMove(alternativeState.asEthersObject, invalidResponseState.asEthersObject, alternativeSignature, invalidResponseSignature),
          "Invalid transition: turnNum must increase by 1"
        );
        await delay();
      });

      it('reverts when the alternativeState has the wrong turnNum', async () => {
        await runBeforeAlternativeRespond();

        const invalidAlternativeState = state0;
        const invalidResponseState = state1;
      
        const { r: r3, s: s3, v: v3 } = sign(invalidAlternativeState.toHex(), challenger.privateKey);
        const invalidAlternativeSignature = { r: r3, s: s3, v: v3 };
        const { r: r4, s: s4, v: v4 } = sign(invalidResponseState.toHex(), challenger.privateKey);
        const invalidResponseSignature = { r: r4, s: s4, v: v4 };

        assertRevert(
          nitro.alternativeRespondWithMove(invalidAlternativeState.asEthersObject, invalidResponseState.asEthersObject, invalidAlternativeSignature, invalidResponseSignature),
          "alternativeState must have the same nonce as the challenge state"
        );
        await delay();
      });
    });
  });
});
