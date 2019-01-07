import { ContractFactory, ethers } from 'ethers';
import {
  linkedByteCode,
  assertRevert,
  getNetworkId,
  getGanacheProvider,
  expectEvent,
  increaseTime,
  DURATION
} from 'magmo-devtools';
import { sign, Channel, CountingGame } from 'fmg-core';

import StateArtifact from '../build/contracts/State.json';
import RulesArtifact from '../build/contracts/Rules.json';
import TurboAdjudicatorArtifact from '../build/contracts/TurboAdjudicator.json';
import { getCountingGame } from './CountingGame';

jest.setTimeout(20000);
let turbo: ethers.Contract;
const abiCoder = new ethers.utils.AbiCoder();
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

const DEPOSIT_AMOUNT = 255; //
const SMALL_WITHDRAW_AMOUNT = 10;

let nullOutcome: {} | any[];
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

function depositTo(destination: any, value = DEPOSIT_AMOUNT): Promise<any> {
  return turbo.deposit(destination, { value });
}

async function withdraw(
  participant,
  destination: string,
  signer = participant,
  amount = DEPOSIT_AMOUNT,
): Promise<any> {
  const sender = await turbo.signer.getAddress();
  const authorization = abiCoder.encode(AUTH_TYPES, [participant.address, destination, amount, sender]);

  const sig = sign(authorization, signer.privateKey);
  return turbo.withdraw(
    participant.address,
    destination,
    amount,
    authorization,
    sig.v,
    sig.r,
    sig.s,
    { gasLimit: 3000000 },
  );
}

async function setupContracts() {
  const networkId = await getNetworkId();

  TurboAdjudicatorArtifact.bytecode = linkedByteCode(
    TurboAdjudicatorArtifact,
    StateArtifact,
    networkId,
  );
  TurboAdjudicatorArtifact.bytecode = linkedByteCode(
    TurboAdjudicatorArtifact,
    RulesArtifact,
    networkId,
  );

  turbo = await ContractFactory.fromSolidity(TurboAdjudicatorArtifact, providerSigner).deploy();
  await turbo.deployed();

  const unwrap = ({challengeState, finalizedAt }) => ({challengeState, finalizedAt});
  nullOutcome = { amount: [], destination: [], ...unwrap(await turbo.outcomes(turbo.address))};
}

describe('TurboAdjudicator', () => {
  const aBal = ethers.utils.parseUnits('6', 'wei');
  const bBal = ethers.utils.parseUnits('4', 'wei');
  const resolution = [aBal, bBal];
  const differentResolution = [bBal, aBal];

  let channel: Channel;
  let alice: ethers.Wallet;
  let aliceDest: ethers.Wallet;
  let bob: ethers.Wallet;
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
    aliceDest = ethers.Wallet.createRandom();
    CountingGameContract = await getCountingGame();

    channel = new Channel(
        CountingGameContract.address,
        0,
        [alice.address, bob.address]
    );

    const defaults = { channel, resolution, gameCounter: 0 };

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
      channel,
      resolution: differentResolution,
      turnNum: 7,
      gameCounter: 2,
    });
    state2alt = CountingGame.gameState({
      channel,
      resolution: differentResolution,
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
        const allocatedAmount = await turbo.allocations(channel.id);

        expect(allocatedAmount.toNumber()).toEqual(DEPOSIT_AMOUNT);
      });
    });

    describe('withdraw', () => {
      it('works when allocations[participant] >= amount and sent on behalf of participant', async () => {
        await depositTo(alice.address);

        const startBal = await provider.getBalance(aliceDest.address);
        const allocatedAtStart = await turbo.allocations(alice.address); // should be at least DEPOSIT_AMOUNT, regardless of test ordering

        // Alice can withdraw some of her money
        await withdraw(alice, aliceDest.address, alice, SMALL_WITHDRAW_AMOUNT);

        expect(Number(await provider.getBalance(aliceDest.address))).toEqual(
          Number(startBal.add(SMALL_WITHDRAW_AMOUNT)),
        );
        expect(Number(await turbo.allocations(alice.address))).toEqual(
          Number(allocatedAtStart - SMALL_WITHDRAW_AMOUNT),
        );

        // Alice should be able to withdraw all remaining funds allocated to her.
        await withdraw(alice, aliceDest.address, alice, allocatedAtStart - SMALL_WITHDRAW_AMOUNT);

        expect(Number(await provider.getBalance(aliceDest.address))).toEqual(
          Number(await provider.getBalance(aliceDest.address)),
        );
        expect(Number(await turbo.allocations(alice.address))).toEqual(0);
      });

      it('reverts when allocations[participant] > amount but not sent on behalf of participant', async () => {
        await delay();
        await depositTo(alice.address);
        assertRevert(
          withdraw(alice, aliceDest.address, bob),
          'Withdraw: not authorized by participant',
        );
        await delay();
      });

      it('reverts when sent on behalf of participant but allocations[participant] < amount', async () => {
        await delay(2000);
        await depositTo(alice.address);
        await delay();
        const allocated = await turbo.allocations(alice.address); // should be at least DEPOSIT_AMOUNT, regardless of test ordering
        assertRevert(withdraw(alice, aliceDest.address, alice, Number(allocated) + 100000));
        await delay();
      });
    });

    describe('setOutcome', () => {
      it('works', async () => { 
        await delay();
        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();
        await delay();

        const setOutcome = await turbo.getOutcome(channel.id);
        expect(setOutcome).toMatchObject(outcome);
        await delay();
      });
    });

    describe('transfer', () => {
      it('works when \
          the outcome is final and \
          outcomes[fromChannel].destination is covered by allocations[fromChannel]', async () => {
        await depositTo(channel.id);
        await delay();

        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();

        const allocatedToChannel = await turbo.allocations(channel.id);
        const allocatedToAlice = await turbo.allocations(alice.address);

        await turbo.transfer(channel.id, alice.address, resolution[0]);

        expect(await turbo.allocations(alice.address)).toEqual(allocatedToAlice.add(resolution[0]));
        expect(await turbo.allocations(channel.id)).toEqual(
          allocatedToChannel.sub(resolution[0]),
        );

        await delay();
      });

      it('reverts when the outcome is not final', async () => {
        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(Date.now() + 1000),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();

        assertRevert(
          turbo.transfer(channel.id, aliceDest.address, resolution[0]),
          'Transfer: outcome must be final',
        );

        await delay(100);
      });

      it('reverts when the outcome is final but the destination is not covered', async () => {
        const allocated = await turbo.allocations(channel.id);
        const outcome = {
          destination: [alice.address, bob.address],
          amount: [allocated.add(1), resolution[1]],
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();

        assertRevert(
          turbo.transfer(channel.id, alice.address, allocated.add(1)),
          'Transfer: allocations[channel] must cover transfer',
        );

        await delay(1000);
      });

      it('reverts when the outcome is final \
              and the destination is covered by allocations[channel] \
              but outcome.amount[destination] < amount', async () => {
        await turbo.deposit(channel.id, { value: resolution[0].add(resolution[1]) });

        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();

        assertRevert(
          turbo.transfer(channel.id, alice.address, resolution[0].add(1)),
          'Transfer: transfer too large',
        );

        await delay(1000);
      });

      it('reverts when the destination is not in outcome.destination', async () => {
        await turbo.deposit(channel.id, { value: resolution[0].add(resolution[1]) });

        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();

        assertRevert(
          turbo.transfer(channel.id, aliceDest.address, resolution[0]),
          'Transfer: destination not in outcome',
        );

        await delay(1000);
      });

      it('reverts when finalizedAt is 0', async () => {
        await turbo.deposit(channel.id, { value: resolution[0].add(resolution[1]) });

        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(0),
          challengeState: state0.asEthersObject,
        };
        const tx = await turbo.setOutcome(channel.id, outcome);
        await tx.wait();

        assertRevert(
          turbo.transfer(channel.id, alice.address, resolution[0]),
          'Transfer: outcome must be present',
        );

        await delay(1000);
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
      await (await turbo.setOutcome(channel.id, nullOutcome)).wait();
      // challenge doesn't exist at start of game
      expect(
        await turbo.isChannelClosed(channel.id)
      ).toBe(false);
    });

    describe('conclude', () => {
      it('works when the conclusion proof is valid', async () => {
        await delay();
        const { destination: startDestination, amount: startAmount, challengeState: startState, finalizedAt } = await turbo.getOutcome(channel.id);
        expect({ destination: startDestination, amount: startAmount, challengeState: startState, finalizedAt }).toMatchObject(nullOutcome);

        const tx = await turbo.conclude(conclusionProof);
        await tx.wait();
        await delay();

        const { destination, amount, challengeState } = await turbo.getOutcome(channel.id);

        expect(destination).toEqual([alice.address, bob.address]);
        expect(amount).toEqual(resolution);
        expect(challengeState).toMatchObject(conclusionProof.penultimateState);
        // TODO: figure out how to test finalizedAt

      });

      it('reverts if it has already been concluded', async () => {
        const tx = await turbo.conclude(conclusionProof);
        await tx.wait();

        assertRevert(
          turbo.conclude(conclusionProof),
          "Conclude: channel must not be finalized"
        );
        await delay();
      });
    });

    describe('forceMove', () => {
      it('emits ForceMove', async () => {
        const agreedState = state0;
        const challengeState = state1;
        const SolidityGameAttributesType = {
          "GameAttributes": {
            "gameCounter": "uint256",
          },
        };


        const { r: r0, s: s0, v: v0 } = sign(agreedState.toHex(), challengee.privateKey);
        const { r: r1, s: s1, v: v1 } = sign(challengeState.toHex(), challenger.privateKey);
        const signatures = [
          { r: r0, s: s0, v: v0 },
          { r: r1, s: s1, v: v1 }
        ];

        expect(await turbo.outcomeFinal(channel.id)).toBe(false);
        const filter = turbo.filters.ChallengeCreated(null, null, null);
    
        const { emitterWitness, eventPromise } = expectEvent(turbo, filter);

        const tx = await turbo.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
          signatures,
        );
        await tx.wait();
        await eventPromise;

        expect(await challengeInProgress(channel.id)).toBe(true);

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
    
        expect(await turbo.outcomeFinal(channel.id)).toBe(false);
    
        const tx = turbo.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
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
    
        expect(await turbo.outcomeFinal(channel.id)).toBe(false);
    
        const tx = turbo.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
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
    
        const outcome = {
          destination: [alice.address, bob.address],
          amount: resolution,
          finalizedAt: ethers.utils.bigNumberify(1),
          challengeState: state0.asEthersObject,
        };
        await (await turbo.setOutcome(channel.id, outcome)).wait();
        expect(await turbo.outcomeFinal(channel.id)).toBe(true);
    
        const tx = turbo.forceMove(
          agreedState.asEthersObject,
          challengeState.asEthersObject,
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
        await (await turbo.setOutcome(channel.id, nullOutcome)).wait();
        // challenge doesn't exist at start of game
        expect(
          await turbo.isChannelClosed(channel.id)
        ).toBe(false);
    
        await turbo.forceMove(
          agreedState.args,
          challengeState.args,
          signatures,
        );
        // challenge should be created
        expect(await turbo.isChallengeOngoing(channel.id)).toBe(true);
      }

      it('works', async () => {
        await runBeforeRefute();
    
        const { emitterWitness, eventPromise } = expectEvent(turbo, 'Refuted');
        await turbo.refute(refutationState.asEthersObject, refutationSignature);
    
        await eventPromise;
        expect(emitterWitness).toBeCalled();

        // "challenge should be cancelled
        expect(await turbo.isChallengeOngoing(channel.id)).toBe(false);
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
          await turbo.isChannelClosed(channel.id)
        ).toBe(true);
    
        assertRevert(
          turbo.refute(refutationState.asEthersObject, refutationSignature),
          "Refute: channel must be open"
        );
        await delay();
      });

      it('reverts when the refutationState is not signed', async () => {
        await runBeforeRefute();

        assertRevert(
          turbo.refute(refutationState.asEthersObject, signatures[0]),
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
          turbo.refute(invalidRefutationState.asEthersObject, invalidRefutationSignature),
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
        await (await turbo.setOutcome(channel.id, nullOutcome)).wait();
        // challenge doesn't exist at start of game
        expect(
          await turbo.isChannelClosed(channel.id)
        ).toBe(false);
    
        await turbo.forceMove(
          agreedState.args,
          challengeState.args,
          signatures,
        );
        // challenge should be created
        expect(await turbo.isChallengeOngoing(channel.id)).toBe(true);
      }

      it('works', async () => {
        await runBeforeRespond();
    
        const { emitterWitness, eventPromise } = expectEvent(turbo, 'RespondedWithMove');
        await turbo.respondWithMove(responseState.asEthersObject, responseSignature);
    
        await eventPromise;
        expect(emitterWitness).toBeCalled();

        // "challenge should be cancelled
        expect(await turbo.isChallengeOngoing(channel.id)).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeRespond();

        // expired challenge exists at start of game
        await increaseTime(DURATION.days(2), provider);
        expect(
          await turbo.isChannelClosed(channel.id)
        ).toBe(true);
    
        assertRevert(
          turbo.respondWithMove(responseState.asEthersObject, responseSignature),
          "RespondWithMove: channel must be open"
        );
        await delay();
      });

      it('reverts when the responseState is not signed', async () => {
        await runBeforeRespond();

        assertRevert(
          turbo.respondWithMove(responseState.asEthersObject, signatures[0]),
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
          turbo.respondWithMove(invalidResponseState.asEthersObject, invalidResponseSignature),
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
        await (await turbo.setOutcome(channel.id, nullOutcome)).wait();
        // challenge doesn't exist at start of game
        expect(
          await turbo.isChannelClosed(channel.id)
        ).toBe(false);
    
        await turbo.forceMove(
          agreedState.args,
          challengeState.args,
          signatures,
        );
        // challenge should be created
        expect(await turbo.isChallengeOngoing(channel.id)).toBe(true);
      }

      it('works', async () => {
        await runBeforeAlternativeRespond();
    
        const { emitterWitness, eventPromise } = expectEvent(turbo, 'RespondedWithAlternativeMove');
        await turbo.alternativeRespondWithMove(alternativeState.asEthersObject, responseState.asEthersObject, alternativeSignature, responseSignature);
    
        await eventPromise;
        expect(emitterWitness).toBeCalled();

        // "challenge should be cancelled
        expect(await turbo.isChallengeOngoing(channel.id)).toBe(false);
      });

      it('reverts when the channel is closed', async () => {
        await runBeforeAlternativeRespond();

        // expired challenge exists at start of game
        await increaseTime(DURATION.days(2), provider);
        expect(
          await turbo.isChannelClosed(channel.id)
        ).toBe(true);
    
        assertRevert(
          turbo.alternativeRespondWithMove(alternativeState.asEthersObject, responseState.asEthersObject, alternativeSignature, responseSignature),
          "AlternativeRespondWithMove: channel must be open"
        );
        await delay();
      });

      it('reverts when the responseState is not authorized', async () => {
        await runBeforeAlternativeRespond();

        assertRevert(
          turbo.alternativeRespondWithMove(alternativeState.asEthersObject, responseState.asEthersObject, alternativeSignature, alternativeSignature),
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
          turbo.alternativeRespondWithMove(alternativeState.asEthersObject, invalidResponseState.asEthersObject, alternativeSignature, invalidResponseSignature),
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
          turbo.alternativeRespondWithMove(invalidAlternativeState.asEthersObject, invalidResponseState.asEthersObject, invalidAlternativeSignature, invalidResponseSignature),
          "alternativeState must have the same nonce as the challenge state"
        );
        await delay();
      });
    });
  });
});

function delay(ms = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function challengeInProgress(channelId: string) {
  return 1000*Number((await turbo.outcomes(channelId)).finalizedAt) > Date.now();
}