/* eslint-disable */

// you do not always need to assert something
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadRPSApp, waitForHeading, waitForWinLossHeading} from '../helpers';
import {
  startAndFundRPSGame,
  clickThroughResignationUI,
  setupRPS,
  playMove,
  clickThroughRPSUIWithChallengeByPlayerA,
  clickThroughRPSUIWithChallengeByPlayerB
} from '../scripts/rps';

jest.setTimeout(120_000);

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');

let browserA: Browser;
let browserB: Browser;
let rpsTabA: Page;
let rpsTabB: Page;

describe('plays game 1 (resignation) and game 2 (challenge by each player)', () => {
  beforeAll(async () => {
    browserA = await setUpBrowser(HEADLESS, 100);
    browserB = await setUpBrowser(HEADLESS, 100);

    rpsTabA = (await browserA.pages())[0];
    rpsTabB = (await browserB.pages())[0];

    await loadRPSApp(rpsTabA, 0);
    await loadRPSApp(rpsTabB, 1);

    await setupRPS(rpsTabA, rpsTabB);
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });

  it('works', async () => {
    console.log('starting first game...');
    await startAndFundRPSGame(rpsTabA, rpsTabB);
    console.log('A challenging...');
    await clickThroughRPSUIWithChallengeByPlayerA(rpsTabA, rpsTabB);
    console.log('B challenging...');
    await clickThroughRPSUIWithChallengeByPlayerB(rpsTabA, rpsTabB);
    console.log('B resigning...');
    await clickThroughResignationUI(rpsTabA, rpsTabB);
    console.log('starting second game...');
    return await startAndFundRPSGame(rpsTabA, rpsTabB);
  });
});
