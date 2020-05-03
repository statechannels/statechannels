/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {JEST_TIMEOUT, HEADLESS, USES_VIRTUAL_FUNDING, USE_DAPPETEER} from '../../constants';

import {
  setUpBrowser,
  setupLogging,
  waitAndOpenChannel,
  waitForNthState,
  waitAndApproveDeposit,
  waitAndApproveDepositWithHub,
  setupFakeWeb3,
  waitForWalletToBeHidden,
  waitForClosedState
} from '../../helpers';

import {uploadFile, startDownload, cancelDownload} from '../../scripts/web3torrent';
import {Dappeteer} from 'dappeteer';

jest.setTimeout(HEADLESS ? JEST_TIMEOUT : 1_000_000);

let browserA: Browser;
let browserB: Browser;
let metamaskA: Dappeteer;
let metamaskB: Dappeteer;
let web3tTabA: Page;
let web3tTabB: Page;
let tabs: [Page, Page];

describe('Web3-Torrent Integration Tests', () => {
  beforeAll(async () => {
    // 100ms sloMo avoids some undiagnosed race conditions
    console.log('Opening browsers');

    const setupAPromise = setUpBrowser(HEADLESS, 4, 0);
    const setupBPromise = setUpBrowser(HEADLESS, 5, 0);
    ({browser: browserA, metamask: metamaskA} = await setupAPromise);
    ({browser: browserB, metamask: metamaskB} = await setupBPromise);

    console.log('Waiting on pages');
    web3tTabA = (await browserA.pages())[0];
    web3tTabB = (await browserB.pages())[0];

    tabs = [web3tTabA, web3tTabB];

    console.log('Loading dapps');
    await setupLogging(web3tTabA, 0, 'seed-download', true);
    await setupLogging(web3tTabB, 1, 'seed-download', true);
    if (!USE_DAPPETEER) await setupFakeWeb3(web3tTabA, 0);
    if (!USE_DAPPETEER) await setupFakeWeb3(web3tTabB, 0);

    await web3tTabA.goto('http://localhost:3000/upload', {waitUntil: 'load'});

    await web3tTabA.bringToFront();
  });

  afterAll(async () => {
    await Promise.all(
      [browserA, browserB].map(async browser => browser && (await browser.close()))
    );
  });
  it('allows peers to start torrenting', async () => {
    console.log('A uploads a file');
    const url = await uploadFile(web3tTabA, USES_VIRTUAL_FUNDING, metamaskA);

    console.log('B starts downloading...');
    await startDownload(web3tTabB, url, USES_VIRTUAL_FUNDING, metamaskB);

    console.log('Waiting for open channels');
    await Promise.all([web3tTabA].map(waitAndOpenChannel(USES_VIRTUAL_FUNDING)));
    // only works if done in series.... not sure why
    await Promise.all([web3tTabB].map(waitAndOpenChannel(USES_VIRTUAL_FUNDING)));

    if (USES_VIRTUAL_FUNDING) await waitAndApproveDepositWithHub(web3tTabB, metamaskB);
    else waitAndApproveDeposit(web3tTabB, metamaskB);

    // Let the download continue for some time
    console.log('Downloading');
    await waitForNthState(web3tTabB, 10);

    console.log('B cancels download');
    await cancelDownload(web3tTabB);

    // TODO: Verify withdrawal for direct funding once it's implemented
    // see https://github.com/statechannels/monorepo/issues/1546

    // Ensure the wallet is not visible
    await Promise.all(tabs.map(tab => waitForWalletToBeHidden(tab)));
    // Wait for the close state channel update
    // TODO: It looks like direct funding is not properly sending a closed state
    // see https://github.com/statechannels/monorepo/issues/1649
    if (USES_VIRTUAL_FUNDING) {
      await Promise.all(tabs.map(tab => waitForClosedState(tab)));
    }
    // Inject some delays. Otherwise puppeteer may read the stale amounts and fails.
    await Promise.all(tabs.map(tab => tab.waitFor(1500)));
    console.log('Checking exchanged amount between downloader and uploader...');
    const earnedColumn = await web3tTabA.$('td.earned');
    const earned = await web3tTabA.evaluate(e => e.textContent, earnedColumn);
    const paidColumn = await web3tTabB.$('td.paid');
    const paid = await web3tTabB.evaluate(e => e.textContent, paidColumn);
    expect(paid).toEqual(`-${earned}`);
  });
});
