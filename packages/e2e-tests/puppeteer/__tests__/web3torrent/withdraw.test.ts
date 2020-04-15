/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable jest/expect-expect */
import {
  setUpBrowser,
  loadDapp,
  waitForBudgetEntry,
  withdrawAndWait,
  waitForEmptyBudget
} from '../../helpers';
import {JEST_TIMEOUT, USES_VIRTUAL_FUNDING, HEADLESS} from '../../constants';
import {Browser, Page} from 'puppeteer';
import {uploadFile} from '../../scripts/web3torrent';

jest.setTimeout(JEST_TIMEOUT);
let browserA: Browser;

let web3tTabA: Page;
const itOrSkip = USES_VIRTUAL_FUNDING ? it : it.skip;
describe('withdrawal from a ledger channel', () => {
  beforeAll(async () => {
    // 100ms sloMo avoids some undiagnosed race conditions
    console.log('Opening browser');

    browserA = await setUpBrowser(HEADLESS, 100);

    console.log('Waiting on pages');
    web3tTabA = (await browserA.pages())[0];

    const logPageOutput = (role: string) => (msg: any) =>
      // use console.error so we can redirect STDERR to a file
      process.env.CI && console.error(`${role}: `, msg.text());
    web3tTabA.on('console', logPageOutput('A'));

    console.log('Loading dapps');
    await loadDapp(web3tTabA, 0, true);

    await web3tTabA.goto('http://localhost:3000/upload', {waitUntil: 'load'});
  });
  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
  });

  itOrSkip('allows a player to withdraw funds from the ledger channel', async () => {
    await uploadFile(web3tTabA, USES_VIRTUAL_FUNDING);

    await waitForBudgetEntry(web3tTabA);

    await withdrawAndWait(web3tTabA);

    await waitForEmptyBudget(web3tTabA);
  });
});
