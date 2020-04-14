/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, waitAndOpenChannel, waitForClosingChannel} from '../helpers';

import {uploadFile, startDownload, cancelDownload} from '../scripts/web3torrent';
import {Dappeteer} from 'dappeteer';

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');
jest.setTimeout(HEADLESS ? 200_000 : 1_000_000);

const USES_VIRTUAL_FUNDING = true;

describe('One file, two seeders, one leecher', () => {
  const enum Label {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D'
  }

  const labels: Label[] = [Label.A, Label.B, Label.C];
  type Data<T> = Record<Label, T>;

  const assignEachLabel = <T>(data: Data<T>, cb: (label: Label) => any) =>
    Promise.all(labels.map(async label => (data[label] = await cb(label))));

  const forEach = async <T>(data: Data<T>, cb: (obj: T, label: Label) => any) =>
    await Promise.all(labels.map(async label => await cb(data[label], label)));

  const browsers: Data<{browser: Browser; metamask: Dappeteer}> = {} as Data<{
    browser: Browser;
    metamask: Dappeteer;
  }>;
  const tabs: Data<Page> = {} as Data<Page>;
  const metamasks: Data<Dappeteer> = {} as Data<Dappeteer>;
  afterAll(async () => {
    if (HEADLESS) {
      await forEach(browsers, async ({browser}) => browser && (await browser.close()));
    }
  });

  it('allows peers to start torrenting', async () => {
    // 100ms sloMo avoids some undiagnosed race conditions

    console.log('Opening browsers');
    await assignEachLabel(browsers, async () => await setUpBrowser(HEADLESS, 100));

    console.log('Waiting on pages');
    await assignEachLabel(tabs, async label => (await browsers[label].browser.pages())[0]);

    const logPageOutput = (role: Label) => (msg: any) =>
      // use console.error so we can redirect STDERR to a file
      console.error(`${role}: `, msg.text());
    forEach(tabs, (tab, label) => tab.on('console', logPageOutput(label)));

    await tabs.A.goto('http://localhost:3000/file/new', {waitUntil: 'load'});

    console.log('A, B upload the same file');
    const [file] = [Label.A, Label.B].map(async label => {
      const tab = tabs[label];
      const {metamask} = browsers[label];
      await tab.goto('http://localhost:3000/file/new', {waitUntil: 'load'});
      return await uploadFile(tab, USES_VIRTUAL_FUNDING, metamask);
    });

    console.log('B starts downloading...');
    await startDownload(tabs.B, await file, USES_VIRTUAL_FUNDING, metamasks.B);

    console.log('Waiting for open channels');
    await forEach(tabs, waitAndOpenChannel(USES_VIRTUAL_FUNDING));

    // Let the download cointinue for some time
    console.log('Downloading');
    await tabs.C.waitFor(1000);

    console.log('C cancels download');
    await cancelDownload(tabs.C);

    console.log('Waiting for channels to close');
    await forEach(tabs, waitForClosingChannel);
  });
});
