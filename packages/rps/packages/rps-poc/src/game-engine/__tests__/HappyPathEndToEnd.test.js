import GameEngine from '../GameEngine';
import ApplicationController from '../../application-controller/ApplicationController'
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

    let applicationControllerA = new ApplicationController();
    let applicationControllerB = new ApplicationController();

    let gameEngineA = new GameEngine({ addressOfLibrary, channelWallet: channelWalletA, applicationController: applicationControllerA });
    let gameEngineB = new GameEngine({ addressOfLibrary, channelWallet: channelWalletB, applicationController: applicationControllerB });

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
    expect(waitForDeployAdjudicatorB.constructor).toEqual(ApplicationStatesB.WaitForAToDeploy)

    // In A's application
    let readyToDeployAdjudicator = gameEngineA.receiveMessage(message1);
    expect(gameEngineA.appState).toEqual(readyToDeployAdjudicator);
    expect(readyToDeployAdjudicator.constructor).toEqual(ApplicationStatesA.ReadyToDeploy)
    expect(readyToDeployAdjudicator.transaction).not.toBeNull();

    let waitForDeployAdjudicatorA = gameEngineA.transactionSent();
    expect(gameEngineA.appState).toEqual(waitForDeployAdjudicatorA);
    expect(waitForDeployAdjudicatorA.constructor).toEqual(ApplicationStatesA.WaitForBlockchainDeploy)

    // From the blockchain

    let adjudicator = '0x2718';
    let deploymentEvent = { adjudicator: adjudicator, funds: 1 }; // TODO

    // In A's application
    let waitForFunding0 = gameEngineA.receiveEvent(deploymentEvent);
    expect(gameEngineA.appState).toEqual(waitForFunding0);
    expect(waitForFunding0.constructor).toEqual(ApplicationStatesA.WaitForBToDeposit)
    expect(waitForFunding0.adjudicator).toEqual(adjudicator)

    // In B's application
    let readyToFund = gameEngineB.receiveEvent(deploymentEvent);
    expect(gameEngineB.appState).toEqual(readyToFund);
    expect(readyToFund.constructor).toEqual(ApplicationStatesB.ReadyToDeposit);
    expect(readyToFund.adjudicator).toEqual(adjudicator);
    expect(readyToFund.transaction).not.toBeNull();

    let waitForFunding1 = gameEngineB.transactionSent();
    expect(gameEngineB.appState).toEqual(waitForFunding1);
    expect(waitForFunding1.constructor).toEqual(ApplicationStatesB.WaitForPostFundSetup0);
    expect(waitForFunding1.adjudicator).toEqual(adjudicator);

    // From the blockchain
    let fundingEvent = { adjudicator: adjudicator, aBalance: 1, bBalance: 2 }; // TODO

    // In A's application
    let readyToSendPostFundSetup0 = gameEngineA.receiveEvent(fundingEvent);
    expect(gameEngineA.appState).toEqual(readyToSendPostFundSetup0);
    expect(readyToSendPostFundSetup0.constructor).toEqual(ApplicationStatesA.ReadyToSendPostFundSetup0);

    let message2 = readyToSendPostFundSetup0.message;
    expect(message2).not.toBeNull();
    let waitForPostFundSetup1 = gameEngineA.messageSent();
    expect(gameEngineA.appState).toEqual(waitForPostFundSetup1);
    expect(waitForPostFundSetup1.constructor).toEqual(ApplicationStatesA.WaitForPostFundSetup1);
    expect(waitForPostFundSetup1.adjudicator).toEqual(adjudicator);


    // In B's application
    let readyToSendPostFundSetup1 = gameEngineB.receiveMessage(message2);
    expect(gameEngineB.appState).toEqual(readyToSendPostFundSetup1);
    expect(readyToSendPostFundSetup1.constructor).toEqual(ApplicationStatesB.ReadyToSendPostFundSetup1);
    let message3 = readyToSendPostFundSetup1.message;
    expect(message3).not.toBeNull();

    let waitForPropose = gameEngineB.messageSent();
    expect(gameEngineB.appState).toEqual(waitForPropose);
    expect(waitForPropose.constructor).toEqual(ApplicationStatesB.WaitForPropose);

})
it.skip('the rest', () => {

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

