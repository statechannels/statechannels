/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadDapp, waitAndOpenChannel, waitForClosingChannel} from '../helpers';

import {uploadFile, startDownload, cancelDownload} from '../scripts/web3torrent';

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');
jest.setTimeout(HEADLESS ? 200_000 : 1_000_000);

const USES_VIRTUAL_FUNDING = process.env.REACT_APP_FUNDING_STRATEGY === 'Virtual';

let browserA: Browser;
let browserB: Browser;
let web3tTabA: Page;
let web3tTabB: Page;
let tabs: [Page, Page];

describe('Supports torrenting among peers with channels', () => {
  beforeAll(async () => {
    // 100ms sloMo avoids some undiagnosed race conditions
    console.log('Opening browsers');

    browserA = await setUpBrowser(HEADLESS, 100);
    browserB = await setUpBrowser(HEADLESS, 100);

    console.log('Waiting on pages');
    web3tTabA = (await browserA.pages())[0];
    web3tTabB = (await browserB.pages())[0];
    tabs = [web3tTabA, web3tTabB];

    console.log('Loading dapps');
    await loadDapp(web3tTabA, 0, true);
    await loadDapp(web3tTabB, 0, true);

    await web3tTabA.goto('http://localhost:3000/file/new', {waitUntil: 'load'});
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
    const url = await uploadFile(web3tTabA, USES_VIRTUAL_FUNDING);

    console.log('B starts downloading...');
    await startDownload(web3tTabB, url, USES_VIRTUAL_FUNDING);

    console.log('Waiting for open channels');
    await Promise.all(tabs.map(waitAndOpenChannel(USES_VIRTUAL_FUNDING)));

    // Let the download cointinue for some time
    console.log('Downloading');
    await web3tTabB.waitFor(1000);

    console.log('B cancels download');
    await cancelDownload(web3tTabB);

    console.log('Waiting for channels to close');
    await Promise.all(tabs.map(waitForClosingChannel));

    // TODO: puppeteer errors with something like `property `
    // "Evaluation failed: TypeError: Cannot read property 'textContent' of null"
    // eslint-disable-next-line no-constant-condition
    if (false) {
      // Inject some delays. Otherwise puppeteer may read the stale amounts and fails.
      await Promise.all([web3tTabA, web3tTabB].map(tab => tab.waitFor(1500)));

      console.log('Checking exchanged amount between downloader and uploader...');
      const earnedColumn = await web3tTabA.$('td.earned');
      const earned = await web3tTabA.evaluate(e => e.textContent, earnedColumn);
      const paidColumn = await web3tTabB.$('td.paid');
      const paid = await web3tTabB.evaluate(e => e.textContent, paidColumn);
      expect(paid).toEqual(`-${earned}`);
    }
  });
});
