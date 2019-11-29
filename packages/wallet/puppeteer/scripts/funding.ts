import Emittery from "emittery";
import {
  setUpBrowser,
  loadWallet,
  pushMessage,
  sendGetAddress,
  sendCreateChannel,
  sendJoinChannel
} from "../helpers";

(async () => {
  // Unfortunately we need to use two separate windows
  // as otherwise the javascript gets paused on the non-selected tab
  // see https://github.com/puppeteer/puppeteer/issues/3339
  const browserA = await setUpBrowser(false);
  const browserB = await setUpBrowser(false);

  const walletA = await browserA.newPage();
  const walletB = await browserB.newPage();

  const walletMessages = new Emittery();

  await loadWallet(walletA, m => messageHandler(walletMessages, "A", m));
  await loadWallet(walletB, m => messageHandler(walletMessages, "B", m));

  // Automatically deliver messageQueued message to opponent's wallet
  walletMessages.on("playerA-message", async message => {
    console.log("Delivering message from player A's wallet to player B's wallet");
    await pushMessage(walletB, (message as any).params);
  });
  walletMessages.on("playerB-message", async message => {
    console.log("Delivering message from player B's wallet to player A's wallet");
    await pushMessage(walletA, (message as any).params);
  });

  const playerAAddressPromise: Promise<any> = walletMessages.once("playerA-result");
  const playerBAddressPromise: Promise<any> = walletMessages.once("playerB-result");
  await sendGetAddress(walletA);
  await sendGetAddress(walletB);
  const playerAAddress = (await playerAAddressPromise).result;
  const playerBAddress = (await playerBAddressPromise).result;
  console.log("Player A address is ", playerAAddress);
  console.log("Player B address is ", playerBAddress);

  const createChannelPromise: Promise<any> = walletMessages.once("playerA-result");
  await sendCreateChannel(walletA, playerAAddress, playerBAddress);
  const channelId = (await createChannelPromise).result.channelId;
  console.log(`Player A has created channel ${channelId}`);

  const joinChannelPromise: Promise<any> = walletMessages.once("playerB-result");
  await sendJoinChannel(walletB, channelId);
  await joinChannelPromise;
  console.log(`Player B has joined channel ${channelId}`);

  await walletA.waitFor("button");
  await walletA.click("button");

  await walletB.waitFor("button");
  await walletB.click("button");
})();

function messageHandler(emitter: Emittery, player: "A" | "B", message) {
  const playerPrefix = `player${player}-`;
  if (message.id) {
    emitter.emit(`${playerPrefix}result`, message);
  } else if (message.method === "MessageQueued") {
    emitter.emit(`${playerPrefix}message`, message);
  } else {
    emitter.emit(`${playerPrefix}notification`, message);
  }
}
