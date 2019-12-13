import {Typed} from "emittery";
import {
  setUpBrowser,
  loadWallet,
  pushMessage,
  sendGetAddress,
  sendCreateChannel,
  sendJoinChannel,
  createMessageHandler,
  MessageEventTypes,
  MessageType,
  loadRPSApp
} from "../helpers";

// Load environment variables from .env
require("../../config/env");

(async () => {
  // Unfortunately we need to use two separate windows
  // as otherwise the javascript gets paused on the non-selected tab
  // see https://github.com/puppeteer/puppeteer/issues/3339
  const browserA = await setUpBrowser(false);
  const browserB = await setUpBrowser(false);

  const rpsTabA = await browserA.newPage();
  const rpsTabB = await browserB.newPage();

  const walletMessages = new Typed<MessageEventTypes>();

  await loadRPSApp(rpsTabA, createMessageHandler(walletMessages, "A"));
  await loadRPSApp(rpsTabB, createMessageHandler(walletMessages, "B"));

  await (await rpsTabA.waitFor(".homePage-loginButton")).click();
  await (await rpsTabB.waitFor(".homePage-loginButton")).click();

  await (await rpsTabA.waitFor("#name")).type("playerA");
  await rpsTabA.click(".form-profile button");

  await (await rpsTabB.waitFor("#name")).type("playerB");
  await rpsTabB.click(".form-profile button");

  await (await rpsTabA.waitFor(".lobby-new-game")).click();
  await (await rpsTabA.waitFor(".modal-content button")).click();

  await (await rpsTabB.waitFor(".ogc-join")).click();

  const walletIFrameA = rpsTabA.frames()[1];
  const walletIFrameB = rpsTabB.frames()[1];

  await (await walletIFrameB.waitForXPath('//button[contains(., "Fund Channel")]')).click();

  await (await walletIFrameA.waitForXPath('//button[contains(., "Fund Channel")]')).click();

  await (await walletIFrameB.waitForXPath('//button[contains(., "Ok!")]')).click();

  await (await walletIFrameA.waitForXPath('//button[contains(., "Ok!")]')).click();

  await (await rpsTabA.waitFor('img[src*="rock"]')).click();

  await (await rpsTabB.waitFor('img[src*="paper"]')).click();

  await (await rpsTabB.waitForXPath('//button[contains(., "Ok!")]')).click();
})();
