import {Page} from 'puppeteer';

import {waitForAndClickButton, setUpBrowser, setupLogging} from '../helpers';
import {getEnvBool} from '@statechannels/devtools';

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

export async function startFundAndPlaySingleMove(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, page.mainFrame(), '#join');
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await playMove(page, 'paper');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, page.mainFrame(), '#create-a-game');
    await waitForAndClickButton(page, page.mainFrame(), '#create-game');
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await playMove(page, 'rock');
    await waitForAndClickButton(page, page.mainFrame(), '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
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

export async function bResigns(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  const virtual = getEnvBool('USE_VIRTUAL_FUNDING', false);
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];

    await waitForAndClickButton(page, page.mainFrame(), '#resign');
    await waitForAndClickButton(page, walletIFrame, '#yes');

    if (virtual) {
      await waitForAndClickButton(page, walletIFrame, '#approve-withdraw');
      await waitForAndClickButton(page, walletIFrame, '#ok');
      await waitForAndClickButton(page, page.mainFrame(), '#resigned-ok');
      await waitForAndClickButton(page, page.mainFrame(), '#exit');
      // App & Wallet left in a 'clean' no-game state
    } else {
      await waitForAndClickButton(page, walletIFrame, '#ok');
      await waitForAndClickButton(page, page.mainFrame(), '#resigned-ok');
      await waitForAndClickButton(page, page.mainFrame(), '#exit');
      // App & Wallet left in a 'clean' no-game state
    }
  }

  async function playerA(page: Page): Promise<void> {
    await playMove(page, 'rock');
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, walletIFrame, '#yes');
    await waitForAndClickButton(page, walletIFrame, '#approve-withdraw');
    await waitForAndClickButton(page, walletIFrame, '#ok');
    await waitForAndClickButton(page, page.mainFrame(), '#resigned-ok');
    await waitForAndClickButton(page, page.mainFrame(), '#exit');
    // App & Wallet left in a 'clean' no-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

/**
 * Useful for local testing. Run with:
 *
 * yarn puppeteer:dev
 *
 * It opens two windows ready for you to manually use.
 */
(async (): Promise<void> => {
  if (require.main === module) {
    const browserPromiseA = setUpBrowser(false);
    const browserPromiseB = setUpBrowser(false);

    const {browser: browserA} = await browserPromiseA;
    const {browser: browserB} = await browserPromiseB;

    const rpsTabA = (await browserA.pages())[0];
    const rpsTabB = (await browserB.pages())[0];

    await setupLogging(rpsTabA, 0, 'rps-test', true);
    await setupLogging(rpsTabB, 1, 'rps-test', true);

    await rpsTabA.bringToFront();
    await rpsTabB.bringToFront();

    await login(rpsTabA, rpsTabB);
  }
})();
