/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadRPSApp} from '../helpers';
import {
  login,
  aChallenges,
  bChallenges,
  bResigns,
  startFundAndPlaySingleMove
} from '../scripts/rps';

jest.setTimeout(200_000);

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');

let browserA: Browser;
let browserB: Browser;
let rpsTabA: Page;
let rpsTabB: Page;

describe('completes game 1 (challenge by A, challenge by B, resign by B) and begins game 2 ', () => {
  beforeAll(async () => {
    browserA = await setUpBrowser(HEADLESS, 100); // 100ms sloMo avoids some undiagnosed race conditions
    browserB = await setUpBrowser(HEADLESS, 100); // 100ms sloMo avoids some undiagnosed race conditions. TODO: remove sloMo and address underlying problem

    rpsTabA = (await browserA.pages())[0];
    rpsTabB = (await browserB.pages())[0];

    await loadRPSApp(rpsTabA, 0);
    await loadRPSApp(rpsTabB, 1);

    await login(rpsTabA, rpsTabB);
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
    await startFundAndPlaySingleMove(rpsTabA, rpsTabB);
    console.log('A challenging...');
    await aChallenges(rpsTabA, rpsTabB);
    console.log('B challenging...');
    await bChallenges(rpsTabA, rpsTabB);
    console.log('B resigning...');
    await bResigns(rpsTabA, rpsTabB);
    console.log('starting second game...');
    return await startFundAndPlaySingleMove(rpsTabA, rpsTabB);
    // (ultimate and intermediate) test success implied by promises resolving
    // therefore no assertions needed in this test
  });
});
