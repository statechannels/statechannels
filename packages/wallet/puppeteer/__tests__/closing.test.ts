import {
  loadWallet,
  setUpBrowser,
  MessageEventTypes,
  createMessageHandler,
  completeFunding,
  MessageType,
  sendCloseChannel
} from "../helpers";
import Emittery from "emittery";

jest.setTimeout(600000);

describe("Closing a Channel", () => {
  let browserA;
  let browserB;
  let walletA;
  let walletB;
  let channelId;
  let walletMessages: Emittery.Typed<MessageEventTypes>;
  let notificationQueueFromA;
  let notificationQueueFromB;

  beforeAll(async () => {
    browserA = await setUpBrowser(true);
    browserB = await setUpBrowser(true);

    walletA = (await browserA.pages())[0];
    walletB = (await browserB.pages())[0];

    walletMessages = new Emittery.Typed<MessageEventTypes>();
    notificationQueueFromA = walletMessages.events(MessageType.PlayerANotification);
    notificationQueueFromB = walletMessages.events(MessageType.PlayerBNotification);
    await loadWallet(walletA, createMessageHandler(walletMessages, "A"));
    await loadWallet(walletB, createMessageHandler(walletMessages, "B"));
    const fundingResult = await completeFunding(walletA, walletB, walletMessages);
    channelId = fundingResult.channelId;
  });

  it("accepts the close request from player A", async () => {
    const updateStatePromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);

    await sendCloseChannel(walletA, channelId);
    const response = await updateStatePromise;

    expect(response.result).toMatchObject({
      turnNum: 4,
      status: "closing",
      channelId
    });
  });

  it("allows player A to select close Channel", async () => {
    await walletA.waitFor("button");
    const [closeChannelButton] = await walletA.$x("//button[contains(., 'Close Channel')]");

    await closeChannelButton.click();
  });

  it("sends a channel updated notification from player A's wallet", async () => {
    let channelUpdatedEvent;
    for await (const message of notificationQueueFromA) {
      if (message.method === "ChannelUpdated" && message.params.status === "closing") {
        channelUpdatedEvent = message;
        break;
      }
    }
    expect(channelUpdatedEvent.params.channelId).toEqual(channelId);
  });

  it("allows player B to select close Channel", async () => {
    await walletB.waitFor("button");
    const [closeChannelButton] = await walletB.$x("//button[contains(., 'Close Channel')]");
    await closeChannelButton.click();
  });

  it("sends a channel updated notification from player B's wallet", async () => {
    let channelUpdatedEvent;
    for await (const message of notificationQueueFromB) {
      if (message.method === "ChannelUpdated" && message.params.status === "closed") {
        channelUpdatedEvent = message;
        break;
      }
    }
    expect(channelUpdatedEvent.params.channelId).toEqual(channelId);
  });

  it("allows player A to select withdrawal", async () => {
    await walletA.waitFor("button");
    const [withdrawButton] = await walletA.$x("//button[contains(., 'Approve')]");
    await withdrawButton.click();
    await walletA.waitFor(9999);
  });

  it("shows success to player A", async () => {
    await walletA.waitFor("button");
    const [h2] = await walletA.$x("//h2[contains(., 'Withdraw Complete')]");
    expect(h2).toBeDefined();
  });

  it("shows success to player B", async () => {
    await walletB.waitFor("button");
    const [h2] = await walletB.$x("//h2[contains(., 'Withdraw Complete')]");
    expect(h2).toBeDefined();
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
