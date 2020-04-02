/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadWeb3App, waitAndOpenChannel, waitForClosingChannel} from '../helpers';

import {uploadFile, startDownload, cancelDownload} from '../scripts/web3torrent';

jest.setTimeout(200_000);

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');

let browserA: Browser;
let browserB: Browser;
let web3tTabA: Page;
let web3tTabB: Page;

describe('Supports torrenting among peers with channels', () => {
  beforeAll(async () => {
    // 100ms sloMo avoids some undiagnosed race conditions
    browserA = await setUpBrowser(HEADLESS, 100);
    browserB = await setUpBrowser(HEADLESS, 100);

    web3tTabA = (await browserA.pages())[0];
    web3tTabB = (await browserB.pages())[0];

    await loadWeb3App(web3tTabA, 0, 'file/new', true);
    await loadWeb3App(web3tTabB, 0, '', true);
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });

  it('allows peers to start torrenting', async () => {
    console.log('A uploads a file');
    const url = await uploadFile(web3tTabA);

    console.log('B starts downloading...');
    await startDownload(web3tTabB, url);

    await waitAndOpenChannel(web3tTabA);
    await waitAndOpenChannel(web3tTabB);

    await web3tTabB.waitFor(3000);
    console.log('B cancels download');
    await cancelDownload(web3tTabB);

    await waitForClosingChannel(web3tTabB);
    await waitForClosingChannel(web3tTabA);

    console.log('Checking exchanged amount from downloader and uploader...');
    const earnedColumn = await web3tTabA.$('td.earned');
    const earned = await web3tTabA.evaluate(e => e.textContent, earnedColumn);
    const paidColumn = await web3tTabB.$('td.paid');
    const paid = await web3tTabB.evaluate(e => e.textContent, paidColumn);
    expect(paid).toEqual(`-${earned}`);
  });
});
