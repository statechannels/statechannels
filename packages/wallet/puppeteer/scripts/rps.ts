import {setUpBrowser, loadRPSApp} from "../helpers";

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

  await loadRPSApp(rpsTabA, 0);
  await loadRPSApp(rpsTabB, 1);

  await (await rpsTabA.waitForXPath('//button[contains(., "Start Playing!")]')).click();
  await (await rpsTabB.waitForXPath('//button[contains(., "Start Playing!")]')).click();

  await (await rpsTabA.waitFor("#name")).type("playerA");
  (await rpsTabA.waitForXPath('//button[contains(., "Submit")]')).click();

  await (await rpsTabB.waitFor("#name")).type("playerB");
  (await rpsTabB.waitForXPath('//button[contains(., "Submit")]')).click();

  await (await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).click();
  await (await rpsTabA.waitForXPath('//button[contains(., "Create Game")]')).click();

  await (await rpsTabB.waitForXPath('//button[contains(., "Join")]')).click();

  const walletIFrameA = rpsTabA.frames()[1];
  const walletIFrameB = rpsTabB.frames()[1];

  await (await walletIFrameB.waitForXPath('//button[contains(., "Fund Channel")]')).click();

  await (await walletIFrameA.waitForXPath('//button[contains(., "Fund Channel")]')).click();

  await (await walletIFrameB.waitForXPath('//button[contains(., "Ok!")]')).click();

  await (await walletIFrameA.waitForXPath('//button[contains(., "Ok!")]')).click();

  await (await rpsTabA.waitFor('img[src*="rock"]')).click();

  await (await rpsTabB.waitFor('img[src*="paper"]')).click();

  process.exit();
})();
