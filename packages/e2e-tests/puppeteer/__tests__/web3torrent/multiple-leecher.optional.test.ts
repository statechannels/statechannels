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
  waitForClosedState,
  takeScreenshot
} from '../../helpers';

import {uploadFile, startDownload} from '../../scripts/web3torrent';
import {Dappeteer} from 'dappeteer';
import {CLOSE_BROWSERS, USES_VIRTUAL_FUNDING} from '../../constants';
const USE_DAPPETEER = false;

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');
jest.setTimeout(HEADLESS ? 200_000 : 1_000_000);

describe('One file, three leechers, one seeder', () => {
  const enum Label {
    A = 'A',
    B = 'B',
    C = 'C',
    D = 'D'
  }

  const leechers: Label[] = [Label.B, Label.C, Label.D];
  const labels: Label[] = leechers.concat([Label.A]);

  type Actor = {browser: Browser; metamask: Dappeteer; tab: Page; label: Label};
  type Actors = Record<Label, Actor>;
  const actors: Actors = {} as Actors;

  const assignEachLabel = (cb: (label: Label) => any) =>
    Promise.all(labels.map(async label => (actors[label] = await cb(label))));

  const forEachActor = async (
    cb: (obj: Actor, label: Label) => any,
    labelsToMap: Label[] = labels
  ) => await Promise.all(labelsToMap.map(async label => await cb(actors[label], label)));

  afterAll(
    async () => CLOSE_BROWSERS && (await forEachActor(async ({browser}) => browser.close()))
  );
  afterAll(async () => {
    await forEachActor(async ({browser, tab, label}) => {
      await takeScreenshot(tab, `stress.${label}.png`);
      CLOSE_BROWSERS && browser.close();
    });
  });

  it('allows peers to start torrenting', async () => {
    if (!USES_VIRTUAL_FUNDING) return;

    let i = 1;
    console.log('Opening browsers');
    await assignEachLabel(async label => {
      const idx = i++;
      const {browser, metamask} = await setUpBrowser(HEADLESS, idx, 0);
      const tab = (await browser.pages())[0];

      await setupLogging(tab, idx, 'stress', true);
      !USE_DAPPETEER && (await setupFakeWeb3(tab, idx));

      return {browser, tab, metamask, label};
    });

    console.log('A uploads the file');
    console.log('Going to URL');
    await actors.A.tab.goto('http://localhost:3000/upload', {waitUntil: 'load'});
    console.log('Uploading file');
    const file = await uploadFile(actors.A.tab, USES_VIRTUAL_FUNDING, actors.A.metamask);

    console.log('B, C, D start downloading...');
    await forEachActor(
      async ({tab, metamask}) => await startDownload(tab, file, USES_VIRTUAL_FUNDING, metamask),
      leechers
    );

    console.log('Waiting for open channels');
    await forEachActor(({tab}) => waitAndOpenChannel(USES_VIRTUAL_FUNDING)(tab));

    console.log('Downloading');
    await forEachActor(({tab}) => waitForNthState(tab, 10));

    // console.log('C cancels download');
    // await cancelDownload(actors.C.tab);

    console.log('Waiting for channels to close');
    await forEachActor(({tab}) => waitForClosedState(tab));
  });
});
