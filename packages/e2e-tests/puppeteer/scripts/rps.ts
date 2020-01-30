import {Page} from 'puppeteer';

import {
  setUpBrowser,
  loadRPSApp,
  waitForAndClickButton,
  waitForHeading as waitForWinLossUIHeader
} from '../helpers';

export async function setupRPS(rpsTabA: Page, rpsTabB: Page): Promise<boolean> {
  async function playerA(page: Page): Promise<void> {
    await waitForAndClickButton(page, '#start-playing');
    await (await page.waitFor('#name')).type('A');
    await waitForAndClickButton(page, '#connect-with-metamask');
  }
  async function playerB(page: Page): Promise<void> {
    await waitForAndClickButton(page, '#start-playing');
    await (await page.waitFor('#name')).type('B');
    await waitForAndClickButton(page, '#connect-with-metamask');
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
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, '#create-a-game');
    await waitForAndClickButton(page, '#create-game');
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#ok');
    await playMove(page, 'rock');
    await waitForAndClickButton(page, '#play-again');
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
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, '#respond');
    await playMove(page, 'rock');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#play-again');
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
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'rock');
    await waitForAndClickButton(page, '#challenge');
    await waitForAndClickButton(walletIFrame, '#yes');
    await waitForAndClickButton(walletIFrame, '#ok');
    await waitForAndClickButton(page, '#play-again');
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
      await waitForAndClickButton(walletIFrame, '#yes');
      await waitForAndClickButton(walletIFrame, '#ok');
      await waitForAndClickButton(page, '#resigned-ok');
      await waitForAndClickButton(page, '#exit');
    }

    async function ledgerFunding(): Promise<void> {
      await waitForAndClickButton(walletIFrame, '#ok');
      await waitForAndClickButton(page, '#resigned-ok');
      await waitForAndClickButton(page, '#exit');
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
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
  return true;
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

    await loadRPSApp(rpsTabA, 3);
    await loadRPSApp(rpsTabB, 4);

    await setupRPS(rpsTabA, rpsTabB);

    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await playMove(rpsTabA, 'rock');
    await playMove(rpsTabB, 'paper');

    await waitForWinLossUIHeader(rpsTabA);
    await waitForWinLossUIHeader(rpsTabB);

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    // Should be in the lobby

    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await playMove(rpsTabA, 'rock');
    await playMove(rpsTabB, 'paper');

    await waitForWinLossUIHeader(rpsTabA);
    await waitForWinLossUIHeader(rpsTabB);

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await clickThroughRPSUIWithChallengeByPlayerA(rpsTabA, rpsTabB);

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    process.exit();
  })();
}
