import Emittery from "emittery";

import {
  loadWallet,
  setUpBrowser,
  MessageEventTypes,
  createMessageHandler,
  completeFunding,
  sendUpdateState,
  MessageType
} from "../helpers";

jest.setTimeout(60000);

describe("State Updating", () => {
  let browserA;
  let browserB;
  let walletA;
  let walletB;
  let channelId;
  let playerAAddress;
  let playerBAddress;
  let walletMessages: Emittery.Typed<MessageEventTypes>;
  let messageQueueFromA;
  let messageQueueFromB;
  let notificationQueueFromA;
  let notificationQueueFromB;
  beforeAll(async () => {
    browserA = await setUpBrowser(true);
    browserB = await setUpBrowser(true);

    walletA = (await browserA.pages())[0];
    walletB = (await browserB.pages())[0];

    walletMessages = new Emittery.Typed<MessageEventTypes>();
    messageQueueFromA = walletMessages.events(MessageType.PlayerAMessage);
    messageQueueFromB = walletMessages.events(MessageType.PlayerBMessage);
    notificationQueueFromA = walletMessages.events(MessageType.PlayerANotification);
    notificationQueueFromB = walletMessages.events(MessageType.PlayerBNotification);
    await loadWallet(walletA, createMessageHandler(walletMessages, "A"));
    await loadWallet(walletB, createMessageHandler(walletMessages, "B"));
    const fundingResult = await completeFunding(walletA, walletB, walletMessages);
    channelId = fundingResult.channelId;
    playerAAddress = fundingResult.playerAAddress;
    playerBAddress = fundingResult.playerBAddress;
  });

  it("updates the state for player A", async () => {
    const updateStatePromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);

    await sendUpdateState(walletA, channelId, playerAAddress, playerBAddress);
    const response = await updateStatePromise;

    expect(response.result).toMatchObject({
      turnNum: 4,
      status: "running",
      channelId
    });
  });

  it("sends a channel updated message to player B", async () => {
    let channelUpdatedMessage;
    for await (const message of messageQueueFromA) {
      if (message.params.data.type === "Channel.Updated") {
        channelUpdatedMessage = message;
        break;
      }
    }

    expect(channelUpdatedMessage.params.data.type).toEqual("Channel.Updated");
  });

  it("sends a channel updated event from player B's wallet", async () => {
    let channelUpdatedEvent;
    for await (const message of notificationQueueFromB) {
      if (message.method === "ChannelUpdated") {
        channelUpdatedEvent = message;
        break;
      }
    }
    expect(channelUpdatedEvent.params.channelId).toEqual(channelId);
  });

  it("updates the state for player B", async () => {
    const updateStatePromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
    await sendUpdateState(walletB, channelId, playerAAddress, playerBAddress);
    const response = await updateStatePromise;

    expect(response.result).toMatchObject({
      turnNum: 5,
      status: "running",
      channelId
    });
  });

  it("sends a channel updated message to player A", async () => {
    let channelUpdatedMessage;
    for await (const message of messageQueueFromB) {
      if (message.params.data.type === "Channel.Updated") {
        channelUpdatedMessage = message;
        break;
      }
    }
    expect(channelUpdatedMessage.params.data.type).toEqual("Channel.Updated");
  });

  it("sends a channel updated notification from player A's wallet", async () => {
    let channelUpdatedEvent;
    for await (const message of notificationQueueFromA) {
      if (message.method === "ChannelUpdated") {
        channelUpdatedEvent = message;
        break;
      }
    }
    expect(channelUpdatedEvent.params.channelId).toEqual(channelId);
  });

  afterAll(async () => {
    walletMessages.clearListeners();
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });
});
