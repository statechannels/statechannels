import assertRevert from '../helpers/assertRevert';

import { CountingGame } from '../../src/CountingGame';
import { Channel, State } from '../../src/CommonState';

var Framework = artifacts.require("./Framework.sol");
var CountingGameContract = artifacts.require("./CountingGame.sol");

contract('Framework', (accounts) => {
    let channel, defaults, framework;

    before(async () => {
        framework = await Framework.deployed();

        let gameContract = await CountingGameContract.deployed();
        channel = new Channel(gameContract.address, 0, [accounts[0], accounts[1]]);

        let challengeeBal = Number(web3.toWei(6, "ether"));
        let challengerBal = Number(web3.toWei(4, "ether"));
        
        defaults = { channel: channel, resolution: [12, 13], gameCounter: 0};
    });


    const validTransition = async (state1, state2) => { 
        return await framework.validTransition(state1.toHex(), state2.toHex());
    };

        // propose0 = CountingGame.proposeState({...defaults, turnNum: 0, stateCounter: 0 });
        // propose1 = CountingGame.proposeState({...defaults, turnNum: 1, stateCounter: 1 });
        // accept0 = CountingGame.acceptState({...defaults, turnNum: 2, stateCounter: 0 });
        // accept1 = CountingGame.acceptState({...defaults, turnNum: 3, stateCounter: 1 });
        // game0 = CountingGame.gameState({...defaults, turnNum: 4, gameCounter: 0 });
        // game1 = CountingGame.gameState({...defaults, turnNum: 5, gameCounter: 1 });
        // game2 = CountingGame.gameState({...defaults, turnNum: 6, gameCounter: 2 });

    it("rejects any transition where the turnNum doesn't increment", async () => {
        // let s0 = propose0;
        // let s1 = propose1;
        // assert(await Framework.validTransition(s0.toHex(), s1.toHex()));

        // s1.channel.channelNonce += 1;
        // assertRevert(await Framework.validTransition(s0.toHex(), s1.toHex()));
    });

    it("rejects any transition where the channel changes", async () => {


    });

    // describe("propose -> propose", () => {
        let propose0, propose1;
        beforeEach(() => {
          propose0 = CountingGame.proposeState({...defaults, turnNum: 0, stateCount: 0 });
          propose1 = CountingGame.proposeState({...defaults, turnNum: 1, stateCount: 1 });
        });

        it("allows a valid transition", async () => {
            let d = defaults;
            
            assert.isOk(await validTransition(propose0, propose1));
        });

        it("rejects a transition where the balances changes");
        it("rejects a transition where the count doesn't increment");
        it("rejects a transition where the position changes");
    // });


    describe("propose -> accept", () => {
        it("allows a valid propose -> accept transition");
        it("rejects a propose -> accept transition not from the last propose state");
        it("rejects a propose -> accept transition where the balances changes");
        it("rejects a propose -> accept transition where the count doesn't reset");
        it("rejects a propose -> accept transition where the position changes");
    });

    it("rejects a propose -> game transition");


    describe("propose -> conclude", () => {
        it("allows a valid propose -> conclude transition");
        it("rejects a propose -> conclude transition where the balances changes");
        it("rejects a propose -> conclude transition not from the last propose state");
    });

    describe("accept -> accept", () => {
        it("allows a valid accept -> accept transition");
        it("rejects an accept -> accept transition where the count doesn't reset");
        it("rejects an accept -> accept transition from the last accept state");
    });


    describe("accept -> accept", () => {
        it("allows a valid accept -> conclude transition");
        it("rejects an accept -> conclude transition from the last accept state");
    });

    describe("accept -> game", () => {
        it("allows a valid transition");
        it("rejects a transition not from the last accept state");
        it("rejects a transition where the position changes");
        it("rejects a transition if not a game start state");
    });

    describe("game -> game", () => {
        it("allows a valid game -> game transition");
        it("rejects game -> game transitions where the game rules are broken")
    });

    describe("game -> conclude", () => {
        it("allows a valid game -> conclude transition");
        it("rejects a game -> conclude transition if not a game end state");
    });

    describe("conclude -> conclude", () => {
        it("allows a valid conclude -> conclude transition");
        it("rejects conclude -> conclude transitions where the balances change");
    });

});