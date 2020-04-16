/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, setupLogging} from '../helpers';
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
    const browserPromiseA = setUpBrowser(HEADLESS, 0);
    const browserPromiseB = setUpBrowser(HEADLESS, 0); // 100ms sloMo avoids some undiagnosed race conditions. TODO: remove sloMo and address underlying problem

    const {browser: browserA} = await browserPromiseA;
    const {browser: browserB} = await browserPromiseB;

    rpsTabA = (await browserA.pages())[0];
    rpsTabB = (await browserB.pages())[0];

    await setupLogging(rpsTabA);
    await setupLogging(rpsTabB);

    const url = 'http://localhost:3000';

    const gotoPromiseA = rpsTabA.goto(url, {waitUntil: 'load'});
    const gotoPromiseB = rpsTabB.goto(url, {waitUntil: 'load'});
    await Promise.all([gotoPromiseA, gotoPromiseB]);

    await rpsTabA.bringToFront();
    await rpsTabB.bringToFront();

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
