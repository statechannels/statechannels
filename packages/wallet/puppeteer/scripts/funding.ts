import Emittery from "emittery";
import {
  setUpBrowser,
  loadWallet,
  pushMessage,
  sendGetWalletInformation,
  sendCreateChannel,
  sendJoinChannel,
  createMessageHandler,
  MessageEventTypes,
  MessageType
} from "../helpers";

// Load environment variables from .env
require("../../config/env");

(async () => {
  // Unfortunately we need to use two separate windows
  // as otherwise the javascript gets paused on the non-selected tab
  // see https://github.com/puppeteer/puppeteer/issues/3339
  const browserA = await setUpBrowser(false);
  const browserB = await setUpBrowser(false);

  const walletA = await browserA.newPage();
  const walletB = await browserB.newPage();

  const walletMessages = new Emittery.Typed<MessageEventTypes>();

  await loadWallet(walletA, createMessageHandler(walletMessages, "A"));
  await loadWallet(walletB, createMessageHandler(walletMessages, "B"));

  // Automatically deliver messageQueued message to opponent's wallet
  walletMessages.on(MessageType.PlayerAMessage, async message => {
    console.log("Delivering message from player A's wallet to player B's wallet");
    await pushMessage(walletB, (message as any).params);
  });
  walletMessages.on(MessageType.PlayerBMessage, async message => {
    console.log("Delivering message from player B's wallet to player A's wallet");
    await pushMessage(walletA, (message as any).params);
  });

  const playerAAddressPromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);
  const playerBAddressPromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
  await sendGetWalletInformation(walletA);
  await sendGetWalletInformation(walletB);
  const playerAAddress = (await playerAAddressPromise).result;
  const playerBAddress = (await playerBAddressPromise).result;
  console.log("Player A address is ", playerAAddress);
  console.log("Player B address is ", playerBAddress);

  const createChannelPromise: Promise<any> = walletMessages.once(MessageType.PlayerAResult);
  await sendCreateChannel(walletA, playerAAddress, playerBAddress);
  const channelId = (await createChannelPromise).result.channelId;
  console.log(`Player A has created channel ${channelId}`);

  const joinChannelPromise: Promise<any> = walletMessages.once(MessageType.PlayerBResult);
  await sendJoinChannel(walletB, channelId);
  await joinChannelPromise;
  console.log(`Player B has joined channel ${channelId}`);

  await walletA.waitFor("button");
  await walletA.click("button");

  await walletB.waitFor("button");
  await walletB.click("button");
})();
