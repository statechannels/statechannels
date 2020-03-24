import Emittery from "emittery";

import {
  loadWallet,
  setUpBrowser,
  pushMessage,
  sendGetWalletInformation,
  sendCreateChannel,
  sendJoinChannel,
  MessageEventTypes,
  createMessageHandler,
  MessageType
} from "../helpers";

jest.setTimeout(60000);

describe("Funding", () => {
  let browserA;
  let browserB;
  let walletA;
  let walletB;
  let walletMessages: Emittery.Typed<MessageEventTypes>;
  let messageQueueFromA;
  let messageQueueFromB;
  beforeAll(async () => {
    browserA = await setUpBrowser(true);
    browserB = await setUpBrowser(true);

    walletA = (await browserA.pages())[0];
    walletB = (await browserB.pages())[0];

    walletMessages = new Emittery.Typed<MessageEventTypes>();
    messageQueueFromA = walletMessages.events(MessageType.PlayerAMessage);
    messageQueueFromB = walletMessages.events(MessageType.PlayerBMessage);

    await loadWallet(walletA, createMessageHandler(walletMessages, "A"));
    await loadWallet(walletB, createMessageHandler(walletMessages, "B"));
    //  Automatically deliver messageQueued message to opponent's wallet
    walletMessages.on(MessageType.PlayerAMessage, async message => {
      await pushMessage(walletB, (message as any).params);
    });
    walletMessages.on(MessageType.PlayerBMessage, async message => {
      await pushMessage(walletA, (message as any).params);
    });
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

  let playerAAddress;
  it("gets As address", async () => {
    const getAddressPromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);
    await sendGetWalletInformation(walletA);
    playerAAddress = (await getAddressPromise).result;
    expect(playerAAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  let playerBAddress;
  it("gets Bs address", async () => {
    const getAddressPromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
    await sendGetWalletInformation(walletB);
    playerBAddress = (await getAddressPromise).result;
    expect(playerBAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  let channelId;
  it("creates a channel for player A", async () => {
    const createChannelPromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);
    await sendCreateChannel(walletA, playerAAddress, playerBAddress);
    channelId = (await createChannelPromise).result.channelId;
    expect(channelId).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("sends a channel opened message to player B", async () => {
    const channelProposedMessage = (await messageQueueFromA.next()).value;
    expect(channelProposedMessage.params.data.type).toEqual("Channel.Open");
  });

  it("joins a channel for player B", async () => {
    const joinChannelPromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
    await sendJoinChannel(walletB, channelId);
    const response = await joinChannelPromise;

    expect(response.result).toBeDefined();
  });

  it("sends a channel opened message to player B", async () => {
    const channelJoinedMessage = (await messageQueueFromB.next()).value;
    expect(channelJoinedMessage.params.data.type).toEqual("Channel.Joined");
  });
  it("allows player A to approve funding", async () => {
    await walletA.waitFor("button");
    await walletA.click("button");
  });
  it("allows player B to approve funding", async () => {
    await walletB.waitFor("button");
    await walletB.click("button");
  });
  it("completes funding for player A", async () => {
    await walletA.waitFor("button");
    expect(await walletA.content()).toMatch(/.*[Channel\ funded\!].*/);
  });
  it("completes funding for player B", async () => {
    await walletB.waitFor("button");
    expect(await walletB.content()).toMatch(/.*[Channel\ funded\!].*/);
  });
});
