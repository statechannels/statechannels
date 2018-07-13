import GameEngine from './GameEngine';

const stake = 1;
const addressOfLibrary = 0xccc;
const initialBals = [5, 4];

it('runthrough', () => {
    let channelWalletA = new ChannelWallet(); // generates ephemeral keys
    let channelWalletB = new ChannelWallet(); // generates ephemeral keys

    let addressOfA = channelWalletA.address();
    let addressOfB = channelWalletB.address();

    let gameEngineA = new GameEngine({ addressOfLibrary, channelWalletA });
    let gameEngineB = new GameEngine({ addressOfLibrary, channelWalletB });

    // In A's application
    let readyToSendPreFundSetup0 = gameEngineA.setupGame({ addressOfB, stake, initialBals });
    expect(readyToSendPreFundSetup0.name).toEqual("ReadyToSendPreFundSetup0")
    let message0 = readyToSendPreFundSetup0.message;
    let waitForPreFundSetup1 = gameEngineA.messageSent();
    expect(waitForPreFundSetup1.name).toEqual("WaitForPreFundSetup1");

    // In B's application
    let readyToSendPreFundSetup1 = gameEngineB.initFromMessage(message0);
    expect(readyToSendPreFundSetup1.appState).toEqual(READY_TO_SEND_PRE_FUND_SETUP_1);
    expect(readyToSendPreFundSetup1.initialBals).toEqual(initBals);
    expect(readyToSendPreFundSetup1.stake).toEqual(stake);
    let message1 = readyToSendPreFundSetup1.message;
    let waitForDeployAdjudicatorB = gameEngineB.messageSent();
    expet(waitForDeployAdjudicatorB.appState).toEqual(WAIT_FOR_DEPLOY_ADJUDICATOR);

    // In A's application
    let readyToDeployAdjudicator = gameEngineA.receiveMessage(message1);
    expect(readyToDeployAdjudicator.appState).toEqual(READY_TO_DEPLOY_ADJUDICATOR);
    expect(readyToDeployAdjudicator.transaction).not.toBeNull();
    let waitForDeployAdjudicatorA = gameEngineA.transactionSent();
    expect(waitForDeployAdjudicatorA.appState).toEqual(WAIT_FOR_DEPLOY_ADJUDICATOR);

    // From the blockchain
    let deploymentEvent = { }; // TODO

    // In A's application
    let waitForFunding = gameEngineA.receiveEvent(deploymentEvent);
    expect(waitForFunding.appState).toEqual(WAIT_FOR_FUNDING);
    
    // In B's application
    let readyToFund = gameEngineB.receiveEvent(deploymentEvent);
    expect(readyToFund.appState).toEqual(READY_TO_FUND);
    expect(readyToFund.transaction).not.toBeNull();
    let waitForFunding = gameEngineB.transactionSent();
    expect(waitForFunding.appState).toEqual(WAIT_FOR_FUNDING);

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
    let readyToChoosePlay = gameEngineA.receiveMessage(message3);
    let readyToSendPropose = gameEngineA.choosePlay("rock");
    let message4 = readyToSendPropose.message;
    let waitForAccept = gameEngineA.messageSent();

    // In B's application
    let readyToChoosePlay = gameEngineB.receiveMessage(message4);
    let readyToSendAccept = gameEngineB.choosePlay("scissors");
    let message5 = readyToSendAccept.message;
    let waitForReveal = readyToSendAccept.messageSent();

    // In A's application
    let readyToSendReveal = gameEngineA.receiveMessage(message5);



    assert.equal(s1.applicationState, "READY_TO_SEND");

})

