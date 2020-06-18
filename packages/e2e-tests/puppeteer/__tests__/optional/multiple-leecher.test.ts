/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jest/expect-expect */
import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {
  setUpBrowser,
  waitAndOpenChannel,
  setupLogging,
  setupFakeWeb3,
  waitForNthState,
  takeScreenshot
} from '../../helpers';

import {uploadFile, startDownload, cancelDownload} from '../../scripts/web3torrent';
import {Dappeteer} from 'dappeteer';
import {CLOSE_BROWSERS} from '../../constants';
const USE_DAPPETEER = false;

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');
jest.setTimeout(HEADLESS ? 200_000 : 1_000_000);

const USES_VIRTUAL_FUNDING = true;

describe('One file, six leechers, one seeder', () => {
  const enum Label {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D',
    E = 'E',
    F = 'F'
  }

  const leechers: Label[] = [Label.B, Label.C, Label.D, Label.E, Label.F];
  const labels: Label[] = leechers.concat([Label.A]);

  type Actor = {browser: Browser; metamask: Dappeteer; tab: Page};
  type Actors = Record<Label, Actor>;
  const actors: Actors = {} as Actors;

  const assignEachLabel = (cb: (label: Label) => any) =>
    Promise.all(labels.map(async label => (actors[label] = await cb(label))));

  const forEachActor = async (
    cb: (obj: Actor, label: Label) => any,
    labelsToMap: Label[] = labels
  ) => await Promise.all(labelsToMap.map(async label => await cb(actors[label], label)));

  afterAll(async () => {
    await forEachActor(({tab}, label) => takeScreenshot(tab, `multiple-leecher.${label}`));
    CLOSE_BROWSERS && (await forEachActor(async ({browser}) => browser.close()));
  });

  it('Allows peers to share a torrent completely', async () => {
    let i = 0;
    console.log('Opening browsers');
    await assignEachLabel(async label => {
      const idx = i++;
      const {browser, metamask} = await setUpBrowser(HEADLESS, idx, 0);
      const tab = (await browser.pages())[0];

      await setupLogging(tab, idx, `multiple-leecher.${label}`, true);
      !USE_DAPPETEER && (await setupFakeWeb3(tab, idx));

      return {browser, tab, metamask};
    });

    console.log('A uploads the file');
    console.log('Going to URL');
    await actors.A.tab.goto('http://localhost:3000/upload', {waitUntil: 'load'});
    console.log('Uploading file');
    const file = await uploadFile(actors.A.tab, USES_VIRTUAL_FUNDING, actors.A.metamask, {
      repeats: 200_000
    });

    console.log('B, C, D start downloading...');
    await forEachActor(
      ({tab, metamask}) => startDownload(tab, file, USES_VIRTUAL_FUNDING, metamask),
      leechers
    );

    console.log('Waiting for open channels');
    await forEachActor(({tab}) => waitAndOpenChannel(USES_VIRTUAL_FUNDING)(tab));

    console.log('Downloading');

    await waitForNthState(actors.C.tab, 10);
    console.log('C cancels download');
    await cancelDownload(actors.C.tab);

    console.log('Waiting for channels to close');

    await forEachActor(async ({tab}, label) => {
      const timeout = 120_000;
      switch (label) {
        case Label.A:
          return tab.waitForSelector('[data-test-selector=numPeers]', {timeout});
        case Label.C:
          // TODO: this isn't the behaviour anymore

          // This is the "Start download" button
          // return tab.waitForSelector('#download-button', {timeout});
          return true;

        default:
          // This is the "Download the file" button
          return tab.waitForSelector('.DownloadLink.button', {timeout});
      }
    });
  });
});
