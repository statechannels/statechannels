/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';

// importing from '../../constants' will also run devtools configureEnvVariables
import {
  JEST_TIMEOUT,
  HEADLESS,
  USES_VIRTUAL_FUNDING,
  USE_DAPPETEER,
  APP_URL as WEB3TORRENT_URL,
  CLOSE_BROWSERS
} from '../../constants';

import {
  setUpBrowser,
  setupLogging,
  waitAndOpenChannel,
  waitForFinishedOrCanceledDownload,
  waitAndApproveDeposit,
  waitAndApproveDepositWithHub,
  setupFakeWeb3,
  waitForWalletToBeHidden,
  takeScreenshot,
  waitForTransactionIfNecessary
} from '../../helpers';

import {uploadFile, startDownload} from '../../scripts/web3torrent';
import {Dappeteer} from 'dappeteer';

jest.setTimeout(HEADLESS ? JEST_TIMEOUT : 1_000_000);

let metamaskA: Dappeteer;
let metamaskB: Dappeteer;
let web3tTabA: Page;
let web3tTabB: Page;
let browserA: Browser;
let browserB: Browser;
let tabs: [Page, Page];
let browsers: [Browser, Browser];

const forEachBrowser = <T>(cb: (value: Browser, index: number, array: Browser[]) => Promise<T>) =>
  Promise.all(browsers.map(cb));
const forEachTab = <T>(cb: (value: Page, index: number, array: Page[]) => Promise<T>) =>
  Promise.all(tabs.map(cb));

describe('Web3-Torrent Integration Tests', () => {
  beforeAll(async () => {
    console.log('Opening browsers');

    [
      {browser: browserA, metamask: metamaskA},
      {browser: browserB, metamask: metamaskB}
    ] = await Promise.all([4, 5].map(async idx => await setUpBrowser(HEADLESS, idx, 0)));

    browsers = [browserA, browserB];

    console.log('Waiting on pages');
    [web3tTabA, web3tTabB] = await forEachBrowser(async b => (await b.pages())[0]);
    tabs = [web3tTabA, web3tTabB];

    console.log('Loading dapps');
    await forEachTab(async (tab, idx) => {
      await setupLogging(tab, idx, 'seed-download-complete', true);
      if (!USE_DAPPETEER) await setupFakeWeb3(tab, idx);
    });

    browsers = [browserA, browserB];
  });

  afterAll(async () => {
    await forEachTab((tab, idx) => takeScreenshot(tab, `seed-download.${idx}`));
    await forEachBrowser(async b => CLOSE_BROWSERS && b && b.close());
  });

  it('Torrent a file - Complete download', async () => {
    await web3tTabA.goto(WEB3TORRENT_URL + '/upload', {waitUntil: 'load'});
    await web3tTabA.bringToFront();

    console.log('A uploads a file');
    const url = await uploadFile(web3tTabA, USES_VIRTUAL_FUNDING, metamaskA);

    console.log('B starts downloading...');
    await startDownload(web3tTabB, url, USES_VIRTUAL_FUNDING, metamaskB);

    console.log('Waiting for open channels');
    // only works if done in series.... not sure why
    await waitAndOpenChannel(USES_VIRTUAL_FUNDING)(web3tTabA);
    await waitAndOpenChannel(USES_VIRTUAL_FUNDING)(web3tTabB);

    if (USES_VIRTUAL_FUNDING) {
      await waitAndApproveDepositWithHub(web3tTabB, metamaskB);
    } else {
      await waitAndApproveDeposit(web3tTabB, metamaskB);
    }

    await waitForTransactionIfNecessary(web3tTabB);

    // Let the download continue for some time
    console.log('Downloading');

    // TODO: Verify withdrawal for direct funding once it's implemented
    // see https://github.com/statechannels/monorepo/issues/1546

    console.log('Wait for Wallet to be hidden');
    // Ensure the wallet is not visible
    await forEachTab(waitForWalletToBeHidden);

    console.log('Wait for the "Save File" button to appear');
    await waitForFinishedOrCanceledDownload(web3tTabB);

    // Inject some delays. Otherwise puppeteer may read the stale amounts and fails.
    await forEachTab(tab => tab.waitFor(1500));

    console.log('Checking exchanged amount between downloader and uploader...');
    const earnedColumn = await web3tTabA.waitForSelector('td.exchanged > .amount');
    const earned = await web3tTabA.evaluate(e => e.textContent, earnedColumn);
    const paidColumn = await web3tTabB.waitForSelector('td.exchanged > .amount');
    const paid = await web3tTabB.evaluate(e => e.textContent, paidColumn);
    const transferredColumn = await web3tTabB.waitForSelector('td.transferred > .amount');
    const transferred = await web3tTabB.evaluate(e => e.textContent, transferredColumn);
    console.log(`paid = ${paid}`);
    console.log(`transferred = ${transferred}`);
    expect(transferred).not.toEqual(`0 B`);
    expect(paid).not.toEqual(`0 wei`);
    return expect(paid).toEqual(`${earned}`);
  });
});
