import {setUpBrowser, loadRPSApp, waitForAndClickButton} from '../helpers';
import {Page} from 'puppeteer';

export async function setupRPS(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function tabA(): Promise<void> {
    await waitForAndClickButton(rpsTabA, 'Start Playing!');
    await (await rpsTabA.waitFor('#name')).type('playerA');
    await waitForAndClickButton(rpsTabA, 'Connect with MetaMask');
  }
  async function tabB(): Promise<void> {
    await waitForAndClickButton(rpsTabB, 'Start Playing!');
    await (await rpsTabB.waitFor('#name')).type('playerB');
    await waitForAndClickButton(rpsTabB, 'Connect with MetaMask');
  }

  await Promise.all([tabA(), tabB()]);
}

export async function clickThroughRPSUI(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function tabA(): Promise<void> {
    const walletIFrameA = rpsTabA.frames()[1];
    // NOTE: There is some weird scrolling issue. .click() scrolls and somehow React re-renders this
    // button and so we get a "Node is detached from document error". Using .evaluate() fixes it.
    // https://github.com/puppeteer/puppeteer/issues/3496
    await (await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).evaluate(
      'document.querySelector("button.lobby-new-game").click()'
    ); // TODO this is actually Player B. Consider permuting A and B throughout this script.
    await waitForAndClickButton(rpsTabA, 'Create Game');
    await waitForAndClickButton(walletIFrameA, 'Fund Channel');
    await waitForAndClickButton(walletIFrameA, 'Ok!');
    await (await rpsTabA.waitFor('img[src*="rock"]')).click();
  }
  async function tabB(): Promise<void> {
    const walletIFrameB = rpsTabB.frames()[1];
    await waitForAndClickButton(rpsTabB, 'Join');
    await waitForAndClickButton(walletIFrameB, 'Fund Channel');
    await waitForAndClickButton(walletIFrameB, 'Ok!');
    await (await rpsTabB.waitFor('img[src*="paper"]')).click();
  }

  await Promise.all([tabA(), tabB()]);
}

export async function clickThroughResignationUI(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function tabA(): Promise<void> {
    const walletIFrameA = rpsTabA.frames()[1];
    await waitForAndClickButton(rpsTabA, 'Resign');
    await waitForAndClickButton(walletIFrameA, 'Close Channel');

    const button = await Promise.race([
      walletIFrameA.waitForXPath('//button[contains(., "Approve")]'), // virtual funding
      walletIFrameA.waitForXPath('//button[contains(., "Ok")]') // ledger funding NOTE CASE SENSITIVE Ok not OK
    ]);

    await button.click();
    await waitForAndClickButton(rpsTabA, 'OK');
    await waitForAndClickButton(rpsTabA, 'Exit');
  }

  async function tabB(): Promise<void> {
    const walletIFrameB = rpsTabB.frames()[1];
    await waitForAndClickButton(walletIFrameB, 'Close Channel');
    await waitForAndClickButton(walletIFrameB, 'Approve');
    await waitForAndClickButton(walletIFrameB, 'Ok');
    await waitForAndClickButton(rpsTabB, 'OK');
    await waitForAndClickButton(rpsTabB, 'Exit');
  }

  await Promise.all([tabA(), tabB()]);
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
