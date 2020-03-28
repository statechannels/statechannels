/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadWeb3App} from '../helpers';

import {seederUploadsAFile, startDownload, cancelDownload} from '../scripts/web3torrent';

jest.setTimeout(200_000);

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');

let browserA: Browser;
let browserB: Browser;
let browserC: Browser;
let web3tTabA: Page;
let web3tTabB: Page;
let web3tTabC: Page;

describe('Multiple downloaders', () => {
  beforeAll(async () => {
    // 100ms sloMo avoids some undiagnosed race conditions
    browserA = await setUpBrowser(HEADLESS, 100);
    browserB = await setUpBrowser(HEADLESS, 100);
    browserC = await setUpBrowser(HEADLESS, 100);

    web3tTabA = (await browserA.pages())[0];
    web3tTabB = (await browserB.pages())[0];
    web3tTabC = (await browserC.pages())[0];

    await loadWeb3App(web3tTabA, 0);
    await loadWeb3App(web3tTabB, 0);
    await loadWeb3App(web3tTabC, 0);
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
    if (browserC) {
      await browserC.close();
    }
  });

  it('allows multiple peers to start torrenting', async () => {
    console.log('A uploads a file...');
    const url = await seederUploadsAFile(web3tTabA);

    console.log('B and C start downloading...');
    await startDownload(web3tTabB, url);
    await startDownload(web3tTabC, url);

    console.log('B and C cancel download...');
    await cancelDownload(web3tTabB);
    await cancelDownload(web3tTabC);

    // Assert uploader earned equal to sum of spent by the downloaders
  });
});
