import { ethers, ContractFactory, Wallet } from 'ethers';
import linker from 'solc/linker';

import expectRevert from '../helpers/expect-revert';

import { CountingGame } from '../..//test-game/counting-game';
import { Channel } from '../..';

// @ts-ignore
import StateArtifact from "../../../build/contracts/State.json";
// @ts-ignore
import RulesArtifact from "../../../build/contracts/Rules.json";

// @ts-ignore
import CountingStateArtifact from "../../../build/contracts/CountingState.json";
// @ts-ignore
import CountingGameArtifact from "../../../build/contracts/CountingGame.json";
import { link } from 'fs';

describe('Rules', () => {
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    const privateKey = '0x' + '1'.repeat(64);
    const wallet = new Wallet(privateKey, provider);

    let channel;
    let otherChannel;
    let defaults;
    let framework;
    const resolution = [12, 13];
    const otherResolution = [10, 15];

    const participantA = new ethers.Wallet('6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1');
    const participantB = new ethers.Wallet('6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c');
    const participants = [participantA.address, participantB.address];

    let fromState;
    let toState;

    beforeEach(async () => {
        const networkId = (await provider.getNetwork()).chainId;
        CountingStateArtifact.bytecode = (linker.linkBytecode(CountingStateArtifact.bytecode, { "State": StateArtifact.networks[networkId].address }));

        CountingGameArtifact.bytecode = (linker.linkBytecode(CountingGameArtifact.bytecode, { "CountingState": CountingStateArtifact.networks[networkId].address}));
        const gameContract = await ContractFactory.fromSolidity(CountingGameArtifact, wallet).attach(CountingGameArtifact.networks[networkId].address);

        otherChannel = new Channel(gameContract.address, 1, participants);

        RulesArtifact.bytecode = (linker.linkBytecode(RulesArtifact.bytecode, { "State": StateArtifact.networks[networkId].address }));
        framework = await ContractFactory.fromSolidity(RulesArtifact, wallet).attach(RulesArtifact.networks[networkId].address);

        channel = new Channel(gameContract.address, 0, participants);
        defaults = { channel, resolution, gameCounter: 0};
    });



    const validTransition = async (state1, state2) => {
        return await framework.validTransition(state1.toHex(), state2.toHex());
    };

    describe("preFundSetup -> preFundSetup", () => {
        beforeEach(() => {
            fromState = CountingGame.preFundSetupState({ ...defaults, turnNum: 0, stateCount: 0 });
            toState = CountingGame.preFundSetupState({ ...defaults, turnNum: 1, stateCount: 1 });
        });

        it("allows a valid transition", async () => {
            // expect(true).toEqual(true);
            expect(await validTransition(fromState, toState)).toEqual(true);
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async () => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });
        it("rejects a transition where the count doesn't increment", async () => {
            toState.stateCount = fromState.stateCount;
            await expectRevert(validTransition(fromState, toState));
        });
        it("rejects a transition where the game attributes changes", async () => {
            toState.gameCounter = 45;
            await expectRevert(validTransition(fromState, toState));
        });
    });


    describe("preFundSetup -> PostFundSetup", () => {
        beforeEach(() => {
            fromState = CountingGame.preFundSetupState({ ...defaults, turnNum: 1, stateCount: 1 });
            toState = CountingGame.PostFundSetupState({ ...defaults, turnNum: 2, stateCount: 0 });
        });

        it("allows a valid transition", async() => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition not from the last preFundSetup state", async() => {
            fromState.stateCount = 0;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async() => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the count doesn't reset", async() => {
            toState.stateCount = 2;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the position changes", async() => {
            toState.gameCounter = 45;
            await expectRevert(validTransition(fromState, toState));
        });
    });

    describe("preFundSetup -> conclude", () => {
        beforeEach(() => {
            fromState = CountingGame.preFundSetupState({ ...defaults, turnNum: 1, stateCount: 1 });
            toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
        });

        it("allows a valid transition", async () => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async () => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition not from the last preFundSetup state", async () => {
            fromState.stateCount = 0;
            await expectRevert(validTransition(fromState, toState));
        });
    });

    describe("PostFundSetup -> PostFundSetup", () => {
        beforeEach(() => {
            fromState = CountingGame.PostFundSetupState({ ...defaults, turnNum: 1, stateCount: 0 });
            toState = CountingGame.PostFundSetupState({ ...defaults, turnNum: 2, stateCount: 1 });
        });

        it("allows a valid transition", async () => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async () => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the count doesn't reset", async () => {
            toState.stateCount = 2;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition from the last PostFundSetup state", async () => {
            fromState.stateCount = 1;
            await expectRevert(validTransition(fromState, toState));
        });
    });


    describe("PostFundSetup -> conclude", () => {
        beforeEach(() => {
            fromState = CountingGame.PostFundSetupState({ ...defaults, turnNum: 1, stateCount: 0 });
            toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("allows a valid transition", async() => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async () => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition from the last PostFundSetup state", async () => {
            fromState.stateCount = 1;
            await expectRevert(validTransition(fromState, toState));
        });
    });

    describe("PostFundSetup -> game", () => {
        beforeEach(() => {
            fromState = CountingGame.PostFundSetupState({ ...defaults, turnNum: 1, stateCount: 1, gameCounter: 3 });
            toState = CountingGame.gameState({ ...defaults, turnNum: 2, gameCounter: 4 });
        });

        it("allows a valid transition", async() => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition not from the last PostFundSetup state", async () => {
            fromState.stateCount = 0;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the game rules are broken", async() => {
            toState.gameCounter = 2; // game specifies that counter must increment
            await expectRevert(validTransition(fromState, toState));
        });
    });

    describe("game -> game", () => {
        beforeEach(() => {
            fromState = CountingGame.gameState({ ...defaults, turnNum: 1, gameCounter: 3 });
            toState = CountingGame.gameState({ ...defaults, turnNum: 2, gameCounter: 4 });
        });

        it("allows a valid transition", async() => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the game rules are broken", async() => {
            toState.gameCounter = 2; // game specifies that counter must increment
            await expectRevert(validTransition(fromState, toState));
        });
    });

    describe("game -> conclude", () => {
        beforeEach(() => {
            fromState = CountingGame.gameState({ ...defaults, turnNum: 1, gameCounter: 3 });
            toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
        });

        it("allows a valid transition", async() => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async () => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });
    });

    describe("conclude -> conclude", () => {
        beforeEach(() => {
            fromState = CountingGame.concludeState({ ...defaults, turnNum: 1 });
            toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
        });

        it("allows a valid transition", async() => {
            assert(await validTransition(fromState, toState));
        });

        it("rejects a transition where the turnNum doesn't increment", async () => {
            toState.turnNum = fromState.turnNum;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects any transition where the channel changes", async () => {
            toState.channel = otherChannel;
            await expectRevert(validTransition(fromState, toState));
        });

        it("rejects a transition where the balances changes", async () => {
            toState.resolution = otherResolution;
            await expectRevert(validTransition(fromState, toState));
        });
    });
});
