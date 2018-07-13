import GameEngine from '../GameEngine';
import ChannelWallet from '../ChannelWallet';
import * as ApplicationStatesA from '../application-states/ApplicationStatesPlayerA';
import * as ApplicationStatesB from '../application-states/ApplicationStatesPlayerB';

let Eth = require('web3-eth');
let eth = new Eth('http://localhost:8545')

const stake = 1;
const addressOfLibrary = 0xccc;
const initialBals = [5, 4];

it('runthrough', async () => {
    let channelWalletA = new ChannelWallet(); // generates ephemeral keys
    let channelWalletB = new ChannelWallet(); // generates ephemeral keys

    let addressOfA = channelWalletA.address;
    let addressOfB = channelWalletB.address;
    let participants = [addressOfA, addressOfB];

    let gameEngineA = new GameEngine({ addressOfLibrary, channelWallet: channelWalletA });
    let gameEngineB = new GameEngine({ addressOfLibrary, channelWallet: channelWalletB });

    // In A's application
    let readyToSendPreFundSetup0 = await gameEngineA.setupGame({
        myAddr: addressOfA,
        opponentAddr: addressOfB,
        stake,
        initialBals,
    });
    expect(readyToSendPreFundSetup0).toEqual(gameEngineA.appState);
    expect(readyToSendPreFundSetup0.constructor).toEqual(ApplicationStatesA.ReadyToSendPreFundSetup0)
    let message0 = readyToSendPreFundSetup0.message;
    let waitForPreFundSetup1 = gameEngineA.messageSent();
    expect(waitForPreFundSetup1).toEqual(gameEngineA.appState);
    expect(waitForPreFundSetup1.constructor).toEqual(ApplicationStatesA.WaitForPreFundSetup1);
    expect(waitForPreFundSetup1.message).toEqual(message0);

    // In B's application
    let initBals;
    let readyToSendPreFundSetup1 = gameEngineB.prefundProposalReceived(message0);
    expect(gameEngineB.appState).toEqual(readyToSendPreFundSetup1);

    expect(readyToSendPreFundSetup1.constructor).toEqual(ApplicationStatesB.ReadyToSendPreFundSetup1);
    expect(readyToSendPreFundSetup1.initialBals).toEqual(initBals);
    expect(readyToSendPreFundSetup1.stake).toEqual(stake);
    let message1 = readyToSendPreFundSetup1.message;
    let waitForDeployAdjudicatorB = gameEngineB.messageSent();

    expect(gameEngineB.appState).toEqual(waitForDeployAdjudicatorB);

})

it.skip('the rest', () => {
    // In A's application
    let readyToDeployAdjudicator = gameEngineA.messageReceived(message1);
    expect(readyToDeployAdjudicator.appState).toEqual(READY_TO_DEPLOY_ADJUDICATOR);
    expect(readyToDeployAdjudicator.transaction).not.toBeNull();
    let waitForDeployAdjudicatorA = gameEngineA.transactionSent();
    expect(waitForDeployAdjudicatorA.appState).toEqual(WAIT_FOR_DEPLOY_ADJUDICATOR);

    // From the blockchain
    let deploymentEvent = { }; // TODO

    // In A's application
    let waitForFunding0 = gameEngineA.receiveEvent(deploymentEvent);
    expect(waitForFunding0.appState).toEqual(WAIT_FOR_FUNDING);
    
    // In B's application
    let readyToFund = gameEngineB.receiveEvent(deploymentEvent);
    expect(readyToFund.appState).toEqual(READY_TO_FUND);
    expect(readyToFund.transaction).not.toBeNull();
    let waitForFunding1 = gameEngineB.transactionSent();
    expect(waitForFunding1.appState).toEqual(WAIT_FOR_FUNDING);

    // From the blockchain
    let fundingEvent = { }; // TODO

    // In B's application
    let waitForPostFundSetup0 = gameEngineB.receiveEvent(fundingEvent);

    // In A's application
    let readyToSendPostFundSetup0 = gameEngineA.receiveEvent(fundingEvent);
    let message2 = readyToSendPostFundSetup0.message;
    let waitForPostFundSetup1 = gameEngineA.messageSent();

    // In B's application
    let readyToSendPostFundSetup1 = gameEngineB.receiveMessage(message2);
    let message3 = readyToSendPostFundSetup1.message;
    let waitForPropose = gameEngineB.messageSent();

    // In A's application
    let readyToChoosePlay0 = gameEngineA.receiveMessage(message3);
    let readyToSendPropose = gameEngineA.choosePlay("rock");
    let message4 = readyToSendPropose.message;
    let waitForAccept = gameEngineA.messageSent();

    // In B's application
    let readyToChoosePlay1 = gameEngineB.receiveMessage(message4);
    let readyToSendAccept = gameEngineB.choosePlay("scissors");
    let message5 = readyToSendAccept.message;
    let waitForReveal = readyToSendAccept.messageSent();

    // In A's application
    let readyToSendReveal = gameEngineA.receiveMessage(message5);



    assert.equal(s1.applicationState, "READY_TO_SEND");

})

