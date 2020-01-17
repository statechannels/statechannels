import {setUpBrowser, loadRPSApp} from '../helpers';
import {Page} from 'puppeteer';

export async function setupRPS(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  await (await rpsTabA.waitForXPath('//button[contains(., "Start Playing!")]')).click();
  await (await rpsTabB.waitForXPath('//button[contains(., "Start Playing!")]')).click();

  await (await rpsTabA.waitFor('#name')).type('playerA');
  (await rpsTabA.waitForXPath('//button[contains(., "Connect with MetaMask")]')).click();

  await (await rpsTabB.waitFor('#name')).type('playerB');
  (await rpsTabB.waitForXPath('//button[contains(., "Connect with MetaMask")]')).click();
}

export async function clickThroughRPSUI(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  // NOTE: There is some weird scrolling issue. .click() scrolls and somehow React re-renders this
  // button and so we get a "Node is detached from document error". Using .evaluate() fixes it.
  // https://github.com/puppeteer/puppeteer/issues/3496
  await (await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).evaluate(
    'document.querySelector("button.lobby-new-game").click()'
  ); // TODO this is actually Player B. Consider permuting A and B throughout this script.

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
}

export async function clickThroughResignationUI(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function tabA(): Promise<void> {
    const walletIFrameA = rpsTabA.frames()[1];

    await (await rpsTabA.waitForXPath('//button[contains(., "Resign")]')).click();
    await (await walletIFrameA.waitForXPath('//button[contains(., "Close Channel")]')).click();
    const button = await Promise.race([
      walletIFrameA.waitForXPath('//button[contains(., "Approve")]'), // virtual funding
      walletIFrameA.waitForXPath('//button[contains(., "Ok")]') // ledger funding NOTE CASE SENSITIVE Ok not OK
    ]);
    await button.click();
    await (await rpsTabA.waitForXPath('//button[contains(., "OK")]')).click();
    await (await rpsTabA.waitForXPath('//button[contains(., "Exit")]')).click();
    return;
  }

  async function tabB(): Promise<void> {
    const walletIFrameB = rpsTabB.frames()[1];

    await (await walletIFrameB.waitForXPath('//button[contains(., "Close Channel")]')).click();
    await (await walletIFrameB.waitForXPath('//button[contains(., "Approve")]')).click();
    await (await walletIFrameB.waitForXPath('//button[contains(., "Ok")]')).click();
    await (await rpsTabB.waitForXPath('//button[contains(., "OK")]')).click();
    await (await rpsTabB.waitForXPath('//button[contains(., "Exit")]')).click();
    return;
  }

  const tabAcomplete = tabA();
  const tabBcomplete = tabB();
  await Promise.all([tabAcomplete, tabBcomplete]);
}

if (require.main === module) {
  (async (): Promise<void> => {
    // Unfortunately we need to use two separate windows
    // as otherwise the javascript gets paused on the non-selected tab
    // see https://github.com/puppeteer/puppeteer/issues/3339
    const browserA = await setUpBrowser(false);
    const browserB = await setUpBrowser(false);

    const rpsTabA = await browserA.newPage();
    const rpsTabB = await browserB.newPage();

    await loadRPSApp(rpsTabA, 0);
    await loadRPSApp(rpsTabB, 1);

    await clickThroughRPSUI(rpsTabA, rpsTabB);

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    process.exit();
  })();
}
