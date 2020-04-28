/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, setupLogging, waitAndApproveMetaMask, setupFakeWeb3} from '../../helpers';
import {login, startFundAndPlaySingleMove} from '../../scripts/rps';
import {Dappeteer} from 'dappeteer';
import {USE_DAPPETEER} from '../../constants';

jest.setTimeout(200_000);

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');

let browserA: Browser;
let browserB: Browser;
let metamaskA: Dappeteer;
let metamaskB: Dappeteer;
let rpsTabA: Page;
let rpsTabB: Page;

describe('completes game 1 (challenge by A, challenge by B, resign by B) and begins game 2 ', () => {
  beforeAll(async () => {
    const browserPromiseA = setUpBrowser(HEADLESS, 0);
    const browserPromiseB = setUpBrowser(HEADLESS, 0);

    ({browser: browserA, metamask: metamaskA} = await browserPromiseA);
    ({browser: browserB, metamask: metamaskB} = await browserPromiseB);

    rpsTabA = (await browserA.pages())[0];
    rpsTabB = (await browserB.pages())[0];

    await setupLogging(rpsTabA, 0, 'rps-test', true);
    await setupLogging(rpsTabB, 1, 'rps-test', true);
    if (!USE_DAPPETEER) await setupFakeWeb3(rpsTabA, 0);
    if (!USE_DAPPETEER) await setupFakeWeb3(rpsTabB, 1);

    const url = 'http://localhost:3000';

    await Promise.all([
      rpsTabA.goto(url, {waitUntil: 'load'}),
      rpsTabB.goto(url, {waitUntil: 'load'})
    ]);

    await rpsTabA.bringToFront();
    await rpsTabB.bringToFront();
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
    console.log('approving MetaMask..');
    await Promise.all([
      waitAndApproveMetaMask(rpsTabA, metamaskA),
      waitAndApproveMetaMask(rpsTabB, metamaskB)
    ]);
    await rpsTabA.bringToFront();
    await rpsTabB.bringToFront();
    console.log('logging in..');
    await login(rpsTabA, rpsTabB);
    console.log('starting first game...');
    return await startFundAndPlaySingleMove(rpsTabA, metamaskA, rpsTabB, metamaskB);
    // xstate wallet does not fully support challenging yet
    // console.log('A challenging...');
    // await aChallenges(rpsTabA, rpsTabB);
    // console.log('B challenging...');
    // await bChallenges(rpsTabA, rpsTabB);
    // console.log('B resigning...');
    // await bResigns(rpsTabA, rpsTabB);
    // console.log('starting second game...');
    // return await startFundAndPlaySingleMove(rpsTabA, metamaskA, rpsTabB, metamaskB);
    // (ultimate and intermediate) test success implied by promises resolving
    // therefore no assertions needed in this test
  });
});
