import {Page} from 'puppeteer';

import {
  setUpBrowser,
  loadRPSApp,
  waitForAndClickButton,
  waitForHeading as waitForWinLossUIHeader
} from '../helpers';

export async function setupRPS(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function playerA(page: Page): Promise<void> {
    await waitForAndClickButton(page, 'Start Playing!');
    await (await page.waitFor('#name')).type('playerA');
    await waitForAndClickButton(page, 'Connect with MetaMask');
  }
  async function playerB(page: Page): Promise<void> {
    await waitForAndClickButton(page, 'Start Playing!');
    await (await page.waitFor('#name')).type('playerB');
    await waitForAndClickButton(page, 'Connect with MetaMask');
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
}

export async function startAndFundRPSGame(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    // NOTE: There is some weird scrolling issue. .click() scrolls and somehow React re-renders this
    // button and so we get a "Node is detached from document error". Using .evaluate() fixes it.
    // https://github.com/puppeteer/puppeteer/issues/3496
    await (await page.waitForXPath('//button[contains(., "Create a game")]')).evaluate(
      'document.querySelector("button.lobby-new-game").click()'
    );
    await waitForAndClickButton(page, 'Create Game');
    await waitForAndClickButton(walletIFrame, 'Fund Channel');
    await waitForAndClickButton(walletIFrame, 'Ok!');
  }
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await new Promise(r => setTimeout(r, 500));
    await waitForAndClickButton(page, 'Join');
    await waitForAndClickButton(walletIFrame, 'Fund Channel');
    await waitForAndClickButton(walletIFrame, 'Ok!');
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
}

export async function playMove(rpsTab: Page, move: 'rock' | 'paper' | 'scissors'): Promise<void> {
  await (await rpsTab.waitFor(`img[src*="${move}"]`)).click();
}

export async function clickThroughRPSUIWithChallengeByPlayerA(
  rpsTabA: Page,
  rpsTabB: Page
): Promise<void> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'rock');
    await waitForAndClickButton(page, 'Challenge on-chain');
    await waitForAndClickButton(walletIFrame, 'Approve');
    await waitForAndClickButton(walletIFrame, 'Ok');
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, 'Respond');
    await playMove(page, 'paper');
    await waitForAndClickButton(walletIFrame, 'Ok');
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
}

export async function clickThroughRPSUIWithChallengeByPlayerB(
  rpsTabA: Page,
  rpsTabB: Page
): Promise<void> {
  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, 'Respond');
    await playMove(page, 'paper');
    await waitForAndClickButton(walletIFrame, 'Ok');
  }
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await playMove(page, 'rock');
    await waitForAndClickButton(page, 'Challenge on-chain');
    await waitForAndClickButton(walletIFrame, 'Approve');
    await waitForAndClickButton(walletIFrame, 'Ok');
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
}

export async function clickThroughResignationUI(rpsTabA: Page, rpsTabB: Page): Promise<void> {
  async function playerB(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];

    await (await page.waitForXPath('//button[contains(., "Resign")]')).evaluate(
      'document.querySelector("button.footer-resign").click()'
    );
    await waitForAndClickButton(walletIFrame, 'Close Channel');

    async function virtualFunding(): Promise<void> {
      await waitForAndClickButton(walletIFrame, 'Approve');
      await waitForAndClickButton(walletIFrame, 'Ok');
      await waitForAndClickButton(page, 'OK');
      await waitForAndClickButton(page, 'Exit');
    }

    async function ledgerFunding(): Promise<void> {
      await waitForAndClickButton(walletIFrame, 'Ok');
      await waitForAndClickButton(page, 'OK');
      await waitForAndClickButton(page, 'Exit');
    }

    await Promise.race([virtualFunding(), ledgerFunding()]);
  }

  async function playerA(page: Page): Promise<void> {
    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(walletIFrame, 'Close Channel');
    await waitForAndClickButton(walletIFrame, 'Approve');
    await waitForAndClickButton(walletIFrame, 'Ok');
    await waitForAndClickButton(page, 'OK');
    await waitForAndClickButton(page, 'Exit');
  }

  await Promise.all([playerA(rpsTabA), playerB(rpsTabB)]);
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
