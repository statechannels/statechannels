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

it('runthrough', () => {
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
    let readyToSendPreFundSetup0 = gameEngineA.setupGame({
        myAddr: addressOfA,
        opponentAddr: addressOfB,
        stake,
        initialBals,
    });
    expect(readyToSendPreFundSetup0.type()).toEqual(ApplicationStatesA.ReadyToSendPreFundSetup0)
    let message0 = readyToSendPreFundSetup0.message;

    let waitForPreFundSetup1 = gameEngineA.messageSent({oldState: readyToSendPreFundSetup0});
    expect(waitForPreFundSetup1.type()).toEqual(ApplicationStatesA.WaitForPreFundSetup1);
    expect(waitForPreFundSetup1.message).toEqual(message0);

    // In B's application
    let readyToSendPreFundSetup1 = gameEngineB.prefundProposalReceived({ hexMessage: message0 });
    expect(readyToSendPreFundSetup1.type()).toEqual(ApplicationStatesB.ReadyToSendPreFundSetup1);
    expect(readyToSendPreFundSetup1._balances).toEqual(initialBals);
    expect(readyToSendPreFundSetup1._channel).toEqual(waitForPreFundSetup1._channel);
    expect(readyToSendPreFundSetup1.stake).toEqual(stake);

    let message1 = readyToSendPreFundSetup1.message;
    let waitForDeployAdjudicatorB = gameEngineB.messageSent({oldState: readyToSendPreFundSetup1});
    expect(waitForDeployAdjudicatorB.type()).toEqual(ApplicationStatesB.WaitForAToDeploy)
    expect(waitForDeployAdjudicatorB._balances).toEqual(initialBals);

    // In A's application
    let readyToDeployAdjudicator = gameEngineA.receiveMessage({ oldState: waitForPreFundSetup1, message: message1 });
    expect(readyToDeployAdjudicator.type()).toEqual(ApplicationStatesA.ReadyToDeploy)
    expect(readyToDeployAdjudicator.transaction).not.toBeNull();

    let waitForDeployAdjudicatorA = gameEngineA.transactionSent({  oldState: readyToDeployAdjudicator });
    expect(waitForDeployAdjudicatorA.type()).toEqual(ApplicationStatesA.WaitForBlockchainDeploy)

    // From the blockchain

    let adjudicator = '0x2718';
    let deploymentEvent = { adjudicator: adjudicator, funds: 1 }; // TODO

    // In A's application
    let waitForFunding0 = gameEngineA.receiveEvent({ oldState: waitForDeployAdjudicatorA, event: deploymentEvent});
    expect(waitForFunding0.type()).toEqual(ApplicationStatesA.WaitForBToDeposit)
    expect(waitForFunding0.adjudicator).toEqual(adjudicator)

    // In B's application
    let readyToFund = gameEngineB.receiveEvent({ oldState: waitForDeployAdjudicatorB, event: deploymentEvent });
    expect(readyToFund.type()).toEqual(ApplicationStatesB.ReadyToDeposit);
    expect(readyToFund.adjudicator).toEqual(adjudicator);
    expect(readyToFund.transaction).not.toBeNull();
    expect(readyToFund._balances).toEqual(initialBals);

    let waitForFunding1 = gameEngineB.transactionSent({ oldState: readyToFund });
    expect(waitForFunding1.type()).toEqual(ApplicationStatesB.WaitForPostFundSetup0);
    expect(waitForFunding1.adjudicator).toEqual(adjudicator);
    expect(waitForFunding1._balances).toEqual(initialBals);

    // From the blockchain
    let fundingEvent = { adjudicator: adjudicator, aBalance: 1, bBalance: 2 }; // TODO

    // In A's application
    let readyToSendPostFundSetup0 = gameEngineA.receiveEvent({ oldState: waitForFunding0, event: fundingEvent });
    expect(readyToSendPostFundSetup0.type()).toEqual(ApplicationStatesA.ReadyToSendPostFundSetup0);

    let message2 = readyToSendPostFundSetup0.message;
    expect(message2).not.toBeNull();
    let waitForPostFundSetup1 = gameEngineA.messageSent({oldState: readyToSendPostFundSetup0});
    expect(waitForPostFundSetup1.type()).toEqual(ApplicationStatesA.WaitForPostFundSetup1);
    expect(waitForPostFundSetup1.adjudicator).toEqual(adjudicator);


    // In B's application
    let readyToSendPostFundSetup1 = gameEngineB.receiveMessage({oldState: waitForFunding1, message: message2});
    expect(readyToSendPostFundSetup1.type()).toEqual(ApplicationStatesB.ReadyToSendPostFundSetup1);
    expect(readyToSendPostFundSetup1._balances).not.toBeNull();
    let message3 = readyToSendPostFundSetup1.message;
    expect(message3).not.toBeNull();
    expect(readyToSendPostFundSetup1._balances).toEqual(initialBals);

    let waitForPropose = gameEngineB.messageSent({oldState: readyToSendPostFundSetup1});
    expect(waitForPropose.type()).toEqual(ApplicationStatesB.WaitForPropose);

})
it.skip('the rest', () => {

    // In A's application
    let readyToChoosePlay0 = gameEngineA.receiveMessage({ oldState: waitForPostFundSetup1, message: message3});
    expect(readyToChoosePlay0)

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

