import {
  loadWallet,
  setUpBrowser,
  pushMessage,
  sendGetAddress,
  sendCreateChannel,
  sendJoinChannel
} from "../helpers";
import Emittery from "emittery";
jest.setTimeout(10000);

describe("Funding", () => {
  let browserA;
  let browserB;
  let walletA;
  let walletB;
  let walletMessages: Emittery;
  let messageQueueFromA;
  let messageQueueFromB;
  beforeAll(async () => {
    browserA = await setUpBrowser(true);
    browserB = await setUpBrowser(true);

    walletA = await browserA.newPage();
    walletB = await browserB.newPage();
    walletMessages = new Emittery();
    messageQueueFromA = walletMessages.events("playerA-message");
    messageQueueFromB = walletMessages.events("playerB-message");

    await loadWallet(walletA, m => messageHandler(walletMessages, "A", m));
    await loadWallet(walletB, m => messageHandler(walletMessages, "B", m));
    // Automatically deliver messageQueued message to opponent's wallet
    walletMessages.on("playerA-message", async message => {
      await pushMessage(walletB, (message as any).params);
    });
    walletMessages.on("playerB-message", async message => {
      await pushMessage(walletA, (message as any).params);
    });
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });

  let playerAAddress;
  it("gets As address", async () => {
    const getAddressPromise: Promise<any> = walletMessages.once("playerA-result");
    await sendGetAddress(walletA);
    playerAAddress = (await getAddressPromise).result;
    expect(playerAAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  let playerBAddress;
  it("gets Bs address", async () => {
    const getAddressPromise: Promise<any> = walletMessages.once("playerB-result");
    await sendGetAddress(walletB);
    playerBAddress = (await getAddressPromise).result;
    expect(playerBAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  let channelId;
  it("creates a channel for player A", async () => {
    const createChannelPromise: Promise<any> = walletMessages.once("playerA-result");
    await sendCreateChannel(walletA, playerAAddress, playerBAddress);
    channelId = (await createChannelPromise).result.channelId;
    expect(channelId).toMatch(/^0x[a-fA-F0-9]{64}$/);
  });

  it("sends a channel opened message to player B", async () => {
    const channelProposedMessage = (await messageQueueFromA.next()).value;
    expect(channelProposedMessage.params.data.type).toEqual("Channel.Open");
  });

  it("joins a channel for player B", async () => {
    const joinChannelPromise: Promise<any> = walletMessages.once("playerB-result");
    await sendJoinChannel(walletB, channelId);
    const response = await joinChannelPromise;

    expect(response.result).toBeDefined();
  });

  it("sends a channel opened message to player B", async () => {
    const channelJoinedMessage = (await messageQueueFromB.next()).value;
    expect(channelJoinedMessage.params.data.type).toEqual("Channel.Joined");
  });
});

function messageHandler(emitter: Emittery, player: "A" | "B", message) {
  const playerPrefix = `player${player}-`;
  if (message.id) {
    emitter.emit(`${playerPrefix}result`, message);
  } else if (message.method === "MessageQueued") {
    console.log(`${playerPrefix}message`, message);
    emitter.emit(`${playerPrefix}message`, message);
  } else {
    console.log(`${playerPrefix}notification`, message);
    emitter.emit(`${playerPrefix}notification`, message);
  }
}
