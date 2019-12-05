import {
  loadWallet,
  setUpBrowser,
  MessageEventTypes,
  createMessageHandler,
  completeFunding,
  sendUpdateState,
  MessageType
} from "../helpers";
import Emittery from "emittery";
jest.setTimeout(100000);
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

    walletA = await browserA.newPage();
    walletB = await browserB.newPage();

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

    expect(response).toMatchObject({
      turnNum: 4,
      status: "Running",
      channelId
    });
  });
  it("sends a channel updated message to player B", async () => {
    const channelUpdatedMessage = (await messageQueueFromA.next()).value;
    expect(channelUpdatedMessage.params.data.type).toEqual("Channel.Updated");
  });

  it("sends a channel updated event", async () => {
    const channelUpdatedEvent = (await notificationQueueFromB.next()).value;
    expect(channelUpdatedEvent.method).toEqual("ChannelUpdated");
  });

  it("updates the state for player B", async () => {
    const updateStatePromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
    await sendUpdateState(walletB, channelId, playerAAddress, playerBAddress);
    const response = await updateStatePromise;

    expect(response).toMatchObject({
      turnNum: 5,
      status: "Running",
      channelId
    });
  });

  it("sends a channel updated message to player A", async () => {
    const channelUpdatedMessage = (await messageQueueFromB.next()).value;
    expect(channelUpdatedMessage.params.data.type).toEqual("Channel.Updated");
  });

  it("sends a channel updated event", async () => {
    const channelUpdatedEvent = (await notificationQueueFromA.next()).value;
    expect(channelUpdatedEvent.method).toEqual("ChannelUpdated");
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });
});
