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
    browserA = await setUpBrowser(HEADLESS);
    browserB = await setUpBrowser(HEADLESS);

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

  describe('[game 1] can start and fund an RPS game', () => {
    it('works', () => {
      return startAndFundRPSGame(rpsTabA, rpsTabB);
    });
  });

  describe('[game 1] can select rock (tab A) and paper (tab B)', () => {
    it('works', () => {
      return Promise.all([playMove(rpsTabA, 'rock'), playMove(rpsTabB, 'paper')]);
    });
  });

  describe('[game 1] can get through resignation', () => {
    it('works', () => {
      return clickThroughResignationUI(rpsTabA, rpsTabB);
      // Should be in the lobby
    });
  });

  describe('[game 2] can start and fund an RPS game', () => {
    it('works', () => {
      return startAndFundRPSGame(rpsTabA, rpsTabB);
    });
  });

  describe('[game 2] can get through a challenge by player A', () => {
    it('works', () => {
      return clickThroughRPSUIWithChallengeByPlayerA(rpsTabA, rpsTabB);
    });
  });

  describe('[game 2] can get through a challenge by player B', () => {
    it('works', () => {
      return clickThroughRPSUIWithChallengeByPlayerB(rpsTabA, rpsTabB);
    });
  });
});
