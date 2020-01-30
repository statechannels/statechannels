import {Page} from 'puppeteer';

import {waitForAndClickButton} from '../helpers';

export async function setupRPS(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    await waitForAndClickButton(page, '#start-playing');
    await (await page.waitFor('#name')).type('A');
    await waitForAndClickButton(page, '#connect-with-metamask');
    // App & Wallet left in a 'clean' no-game state
  }
  async function playerB(page: Page): Promise<void> {
    await waitForAndClickButton(page, '#start-playing');
    await (await page.waitFor('#name')).type('B');
    await waitForAndClickButton(page, '#connect-with-metamask');
    // App & Wallet left in a 'clean' no-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function playMove(page: Page, move: 'rock' | 'paper' | 'scissors'): Promise<void> {
  const selector = `img[src*="${move}"]`;
  return waitForAndClickButton(page, selector);
}

export async function startAndFundRPSGame(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, '#join');
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#ok');
    await playMove(page, 'paper');
    await waitForAndClickButton(page, '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, '#create-a-game');
    await waitForAndClickButton(page, '#create-game');
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#ok');
    await playMove(page, 'rock');
    await waitForAndClickButton(page, '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function clickThroughRPSUIWithChallengeByPlayerA(
  rpsTabA: Page,
  rpsTabB: Page
): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'paper');
    await waitForAndClickButton(page, '#challenge');
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, '#respond');
    await playMove(page, 'rock');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function clickThroughRPSUIWithChallengeByPlayerB(
  rpsTabA: Page,
  rpsTabB: Page
): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, '#respond');
    await playMove(page, 'paper');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'rock');
    await waitForAndClickButton(page, '#challenge');
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#play-again');
    // App & Wallet left in a 'clean' mid-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}

export async function clickThroughResignationUI(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];

    await waitForAndClickButton(page, '#resign');
    await waitForAndClickButton(walletIFrame, '#yes');

    async function virtualFunding(): Promise<void> {
      await waitForAndClickButton(walletIFrame, '#approve-withdraw');
      await waitForAndClickButton(walletIFrame, '#ok');
      await waitForAndClickButton(page, '#resigned-ok');
      await waitForAndClickButton(page, '#exit');
      // App & Wallet left in a 'clean' no-game state
    }

    async function ledgerFunding(): Promise<void> {
      await waitForAndClickButton(walletIFrame, '#ok');
      await waitForAndClickButton(page, '#resigned-ok');
      await waitForAndClickButton(page, '#exit');
      // App & Wallet left in a 'clean' no-game state
    }

    await Promise.race([virtualFunding(), ledgerFunding()]);
  }

  async function playerA(page: Page): Promise<void> {
    await playMove(page, 'rock');
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#approve-withdraw');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#resigned-ok');
    await waitForAndClickButton(page, '#exit');
    // App & Wallet left in a 'clean' no-game state
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
}
