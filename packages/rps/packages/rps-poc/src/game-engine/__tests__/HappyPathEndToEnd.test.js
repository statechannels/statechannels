import GameEngine from '../GameEngine';
import ChannelWallet from '../ChannelWallet';
import { Message } from '../Message';
import * as ApplicationStatesA from '../application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from '../application-states/ApplicationStatesPlayerB';
import { RpsState, RpsGame } from '../../game-rules/game-rules';

let Eth = require('web3-eth');
let eth = new Eth('http://localhost:8545')

const stake = 1;
const addressOfLibrary = 0xccc;
const initialBals = [5, 4];
const bWinsBals = [4, 5];
const aWinsBals = [6, 3];

it('runthrough', () => {
    let channelWalletA = new ChannelWallet(); // generates ephemeral keys
    let channelWalletB = new ChannelWallet(); // generates ephemeral keys

    let addressOfA = channelWalletA.address;
    let addressOfB = channelWalletB.address;
    let participants = [addressOfA, addressOfB];

    let gameEngineA = new GameEngine({ addressOfLibrary, channelWallet: channelWalletA });
    let gameEngineB = new GameEngine({ addressOfLibrary, channelWallet: channelWalletB });

    // In A's application
    let readyToSendPreFundSetup0 = gameEngineA.setupGame({
        myAddr: addressOfA,
        opponentAddr: addressOfB,
        stake,
        initialBals,
    });
    expect(readyToSendPreFundSetup0.type).toEqual(ApplicationStatesA.types['ReadyToSendPreFundSetup0'])
    let message0 = readyToSendPreFundSetup0.message;
    let gameState0 = RpsState.fromHex(new Message({hexMessage: message0}).state);
    expect(gameState0.turnNum).toEqual(0);
    expect(gameState0.stateCount).toEqual(0);
    expect(gameState0.resolution).toEqual(initialBals);
    expect(gameState0.stake).toEqual(1);

    let waitForPreFundSetup1 = gameEngineA.messageSent({oldState: readyToSendPreFundSetup0});
    expect(waitForPreFundSetup1.type).toEqual(ApplicationStatesA.types['WaitForPreFundSetup1']);
    expect(waitForPreFundSetup1.message).toEqual(message0);

    // In B's application
    let readyToSendPreFundSetup1 = gameEngineB.prefundProposalReceived({ hexMessage: message0 });
    expect(readyToSendPreFundSetup1.type).toEqual(ApplicationStatesB.types['ReadyToSendPreFundSetup1']);
    expect(readyToSendPreFundSetup1._balances).toEqual(initialBals);
    expect(readyToSendPreFundSetup1._channel).toEqual(waitForPreFundSetup1._channel);
    expect(readyToSendPreFundSetup1.stake).toEqual(stake);

    let message1 = readyToSendPreFundSetup1.message;
    let gameState1 = RpsState.fromHex(message1.state);
    expect(gameState1.turnNum).toEqual(1);
    expect(gameState1.stateCount).toEqual(1);
    expect(gameState1.resolution).toEqual(initialBals);
    expect(gameState1.stake).toEqual(1);

    let waitForDeployAdjudicatorB = gameEngineB.messageSent({oldState: readyToSendPreFundSetup1});
    expect(waitForDeployAdjudicatorB.type).toEqual(ApplicationStatesB.types['WaitForAToDeploy'])
    expect(waitForDeployAdjudicatorB._balances).toEqual(initialBals);

    // In A's application
    let readyToDeployAdjudicator = gameEngineA.receiveMessage({ oldState: waitForPreFundSetup1, message: message1 });
    expect(readyToDeployAdjudicator.type).toEqual(ApplicationStatesA.types['ReadyToDeploy'])
    expect(readyToDeployAdjudicator.transaction).not.toBeUndefined();

    let waitForDeployAdjudicatorA = gameEngineA.transactionSent({  oldState: readyToDeployAdjudicator });
    expect(waitForDeployAdjudicatorA.type).toEqual(ApplicationStatesA.types['WaitForBlockchainDeploy'])

    // From the blockchain

    let adjudicator = '0x2718';
    let deploymentEvent = { adjudicator: adjudicator, funds: 1 }; // TODO

    // In A's application
    let waitForFunding0 = gameEngineA.receiveEvent({ oldState: waitForDeployAdjudicatorA, event: deploymentEvent});
    expect(waitForFunding0.type).toEqual(ApplicationStatesA.types['WaitForBToDeposit'])
    expect(waitForFunding0.adjudicator).toEqual(adjudicator)

    // In B's application
    let readyToFund = gameEngineB.receiveEvent({ oldState: waitForDeployAdjudicatorB, event: deploymentEvent });
    expect(readyToFund.type).toEqual(ApplicationStatesB.types['ReadyToDeposit']);
    expect(readyToFund.adjudicator).toEqual(adjudicator);
    expect(readyToFund.transaction).not.toBeUndefined();
    expect(readyToFund._balances).toEqual(initialBals);

    let waitForFunding1 = gameEngineB.transactionSent({ oldState: readyToFund });
    expect(waitForFunding1.type).toEqual(ApplicationStatesB.types['WaitForPostFundSetup0']);
    expect(waitForFunding1.adjudicator).toEqual(adjudicator);
    expect(waitForFunding1._balances).toEqual(initialBals);

    // From the blockchain
    let fundingEvent = { adjudicator: adjudicator, aBalance: 1, bBalance: 2 }; // TODO

    // In A's application
    let readyToSendPostFundSetup0 = gameEngineA.receiveEvent({ oldState: waitForFunding0, event: fundingEvent });
    expect(readyToSendPostFundSetup0.type).toEqual(ApplicationStatesA.types['ReadyToSendPostFundSetup0']);

    let message2 = readyToSendPostFundSetup0.message;
    expect(message2).not.toBeUndefined();
    let gameState2 = RpsState.fromHex(message2.state);
    expect(gameState2.turnNum).toEqual(2);
    expect(gameState2.stateCount).toEqual(0);
    expect(gameState2.resolution).toEqual(initialBals);
    expect(gameState2.stake).toEqual(1);

    let waitForPostFundSetup1 = gameEngineA.messageSent({oldState: readyToSendPostFundSetup0});
    expect(waitForPostFundSetup1.type).toEqual(ApplicationStatesA.types['WaitForPostFundSetup1']);
    expect(waitForPostFundSetup1.adjudicator).toEqual(adjudicator);


    // In B's application
    let readyToSendPostFundSetup1 = gameEngineB.receiveMessage({oldState: waitForFunding1, message: message2});
    expect(readyToSendPostFundSetup1.type).toEqual(ApplicationStatesB.types['ReadyToSendPostFundSetup1']);
    expect(readyToSendPostFundSetup1._balances).not.toBeUndefined();
    let message3 = readyToSendPostFundSetup1.message;
    expect(message3).not.toBeUndefined();
    expect(readyToSendPostFundSetup1._balances).toEqual(initialBals);

    let gameState3 = RpsState.fromHex(message3.state);
    expect(gameState3.turnNum).toEqual(3);
    expect(gameState3.stateCount).toEqual(1);
    expect(gameState3.resolution).toEqual(initialBals);
    expect(gameState3.stake).toEqual(1);

    let waitForPropose = gameEngineB.messageSent({oldState: readyToSendPostFundSetup1});
    expect(waitForPropose.type).toEqual(ApplicationStatesB.types['WaitForPropose']);

    // In A's application
    let readyToChoosePlay0 = gameEngineA.receiveMessage({ oldState: waitForPostFundSetup1, message: message3});
    expect(readyToChoosePlay0.type).toEqual(ApplicationStatesA.types['ReadyToChooseAPlay'])

    let readyToSendPropose = gameEngineA.choosePlay({oldState: readyToChoosePlay0, move: 'ROCK'});
    expect(readyToSendPropose.type).toEqual(ApplicationStatesA.types['ReadyToSendPropose']);
    expect(readyToSendPropose.aPlay.key).toEqual('ROCK');
    expect(readyToSendPropose.message).not.toBeUndefined();
    expect(readyToSendPropose.salt).not.toBeUndefined();
    
    let gameState4 = RpsState.fromHex(readyToSendPropose.message.state);
    expect(gameState4.turnNum).toEqual(4);
    expect(gameState4.stake).toEqual(1);
    expect(gameState4.resolution).toEqual(bWinsBals);

    let waitForAccept = gameEngineA.messageSent({
        oldState: readyToSendPropose,
        message: readyToSendPropose.message
    });
    expect(waitForAccept.type).toEqual(ApplicationStatesA.types['WaitForAccept']);
    let proposal = waitForAccept.message;
    expect(proposal).not.toBeUndefined();
    expect(waitForAccept.salt).toEqual(readyToSendPropose.salt);

    // In B's application
    let readyToChoosePlay1 = gameEngineB.receiveMessage({ oldState: waitForPropose, message: proposal });
    expect(readyToChoosePlay1.type).toEqual(ApplicationStatesB.types['ReadyToChooseBPlay']);
    expect(readyToChoosePlay1.opponentMessage).not.toBeUndefined();

    let readyToSendAccept = gameEngineB.choosePlay({ oldState: readyToChoosePlay1, move: "SCISSORS" });
    expect(readyToSendAccept.type).toEqual(ApplicationStatesB.types['ReadyToSendAccept']);
    let message5 = readyToSendAccept.message;
    let gameState5 = RpsState.fromHex(message5.state);
    expect(gameState5.turnNum).toEqual(5);
    expect(gameState5.stake).toEqual(1);
    expect(gameState5.resolution).toEqual(bWinsBals);

    let waitForReveal = gameEngineB.messageSent({ oldState: readyToSendAccept });
    expect(waitForReveal.type).toEqual(ApplicationStatesB.types['WaitForReveal']);
    expect(waitForReveal.bPlay.key).toEqual('SCISSORS');
    expect(waitForReveal.message).not.toBeUndefined();

    // In A's application
    let readyToSendReveal = gameEngineA.receiveMessage({ oldState: waitForAccept, message: message5 });
    expect(readyToSendReveal.type).toEqual(ApplicationStatesA.types['ReadyToSendReveal']);
    expect(readyToSendReveal.aPlay.key).toEqual('ROCK');
    expect(readyToSendReveal.bPlay.key).toEqual('SCISSORS');
    expect(readyToSendReveal.salt).toEqual(waitForAccept.salt);
    expect(readyToSendReveal.result.key).toEqual('A');

    let message6 = readyToSendReveal.message;
    let gameState6 = RpsState.fromHex(message6.state);
    expect(gameState6.turnNum).toEqual(6);
    expect(gameState6.stake).toEqual(1);
    expect(gameState6.aPlay).toEqual(RpsGame.Plays.ROCK);
    expect(gameState6.bPlay).toEqual(RpsGame.Plays.SCISSORS);
    expect(gameState6.resolution).toEqual(aWinsBals);

    // In B's application
    let readyToSendResting = gameEngineB.receiveMessage({ oldState: waitForReveal, message: message6 });
    expect(readyToSendResting.type).toEqual(ApplicationStatesB.types['ReadyToSendResting']);
    expect(readyToSendResting._balances).toEqual([6,3]);
    let message7 = readyToSendResting.message;
    let gameState7 = RpsState.fromHex(message7.state);
    expect(gameState7.turnNum).toEqual(7);
    expect(gameState7.resolution).toEqual(aWinsBals);
})

