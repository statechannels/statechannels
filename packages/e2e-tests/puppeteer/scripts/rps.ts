import {Page} from 'puppeteer';

import {
  waitForAndClickButton,
  setUpBrowser,
  setupLogging,
  waitAndApproveMetaMask,
  waitAndApproveDeposit,
  waitForWalletToBeDisplayed,
  waitForWalletToBeHidden
} from '../helpers';
import {Dappeteer} from 'dappeteer';

export async function login(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    await waitForAndClickButton(page, page.mainFrame(), '#start-playing');
    await (await page.waitFor('#name')).type('A');
    await waitForAndClickButton(page, page.mainFrame(), '#connect-with-metamask');
    // App & Wallet left in a 'clean' no-game state
  }
  async function playerB(page: Page): Promise<void> {
    await waitForAndClickButton(page, page.mainFrame(), '#start-playing');
    await (await page.waitFor('#name')).type('B');
    await waitForAndClickButton(page, page.mainFrame(), '#connect-with-metamask');
    // App & Wallet left in a 'clean' no-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function playMove(page: Page, move: 'rock' | 'paper' | 'scissors'): Promise<void> {
  const selector = `img[src*="${move}"]`;
  return waitForAndClickButton(page, page.mainFrame(), selector);
}

export async function startFundAndPlaySingleMove(
  rpsTabA: Page,
  metamaskA: Dappeteer,
  rpsTabB: Page,
  metamaskB: Dappeteer
): Promise<boolean> {
  async function playerA(page: Page, metamask: Dappeteer): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, page.mainFrame(), '#join');
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitAndApproveDeposit(page, metamask);
    await playMove(page, 'paper');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page, metamask: Dappeteer): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, page.mainFrame(), '#create-a-game');
    await waitForAndClickButton(page, page.mainFrame(), '#create-game');
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitAndApproveDeposit(rpsTabB, metamask);
    await rpsTabB.bringToFront();
    await playMove(page, 'rock');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA, metamaskA), playerB(rpsTabB, metamaskB)]);
  return true;
}

export async function aChallenges(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'paper');
    await waitForAndClickButton(page, page.mainFrame(), '#challenge');
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, walletIFrame, '#respond');
    await playMove(page, 'rock');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function bChallenges(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, walletIFrame, '#respond');
    await playMove(page, 'paper');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'rock');
    await waitForAndClickButton(page, page.mainFrame(), '#challenge');
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function bResigns(
  rpsTabA: Page,
  metamaskA: Dappeteer,
  rpsTabB: Page,
  metamaskB: Dappeteer
): Promise<boolean> {
  // const virtual = getEnvBool('USE_VIRTUAL_FUNDING', false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function playerB(page: Page, _metamask: Dappeteer): Promise<void> {
    await waitForAndClickButton(page, page.mainFrame(), '#resign:not([disabled])');
    // unsupported for now
    // if (virtual) {
    //   await waitForAndClickButton(page, walletIFrame, '#approve-withdraw');
    //   await waitForAndClickButton(page, walletIFrame, '#ok');
    //   await waitForAndClickButton(page, page.mainFrame(), '#resigned-ok');
    //   await waitForAndClickButton(page, page.mainFrame(), '#exit');
    //   // App & Wallet left in a 'clean' no-game state
    // } else {

    await waitForWalletToBeDisplayed(page);
    await waitForWalletToBeHidden(page); // We do not send a transaction as Player B

    await waitForAndClickButton(page, page.mainFrame(), '#resigned-ok');
    await waitForAndClickButton(page, page.mainFrame(), '#exit');
    // App & Wallet left in a 'clean' no-game state
    // }
  }

  async function playerA(page: Page, metamask: Dappeteer): Promise<void> {
    await page.waitFor(1000);
    await playMove(page, 'rock');

    await waitForWalletToBeDisplayed(page);
    await page.waitFor(2000); // Give the wallet some time to prepare the transaction TODO once UI is fixed, we can await a visual cue that the tx is ready to be confirmed
    await metamask.confirmTransaction({gas: 20, gasLimit: 50000});
    await page.bringToFront();
    await waitForWalletToBeHidden(page);

    await waitForAndClickButton(page, page.mainFrame(), '#resigned-ok');
    await waitForAndClickButton(page, page.mainFrame(), '#exit');
    // App & Wallet left in a 'clean' no-game state
  }

  await Promise.all([playerA(rpsTabA, metamaskA), playerB(rpsTabB, metamaskB)]);
  return true;
}

/**
 * Useful for local testing. Run with:
 *
 * yarn puppeteer:dev:rps
 *
 * It opens two windows ready for you to manually use.
 */
(async (): Promise<void> => {
  if (require.main === module) {
    const browserPromiseA = setUpBrowser(false);
    const browserPromiseB = setUpBrowser(false);

    const {browser: browserA, metamask: metamaskA} = await browserPromiseA;
    const {browser: browserB, metamask: metamaskB} = await browserPromiseB;

    const rpsTabA = (await browserA.pages())[0];
    const rpsTabB = (await browserB.pages())[0];

    await setupLogging(rpsTabA, 0, 'rps-test', true);
    await setupLogging(rpsTabB, 1, 'rps-test', true);

    const url = 'http://localhost:3000';

    await Promise.all([
      rpsTabA.goto(url, {waitUntil: 'load'}),
      rpsTabB.goto(url, {waitUntil: 'load'})
    ]);

    await rpsTabA.bringToFront();
    await rpsTabB.bringToFront();
    console.log('approving MetaMask..');
    await Promise.all([
      waitAndApproveMetaMask(rpsTabA, metamaskA),
      waitAndApproveMetaMask(rpsTabB, metamaskB)
    ]);
    console.log('logging in..');
    await login(rpsTabA, rpsTabB);
  }
})();
