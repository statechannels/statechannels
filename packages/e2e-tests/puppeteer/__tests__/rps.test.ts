import {setUpBrowser, loadRPSApp} from '../helpers';
import {clickThroughRPSUI, clickThroughResignationUI, setupRPS} from '../scripts/rps';
import {Page, Browser} from 'puppeteer';

jest.setTimeout(60000);

describe('Playing a game of RPS', () => {
  let browserA: Browser;
  let browserB: Browser;
  let rpsTabA: Page;
  let rpsTabB: Page;

  beforeAll(async () => {
    browserA = await setUpBrowser(false, 10);
    browserB = await setUpBrowser(false, 10);

    rpsTabA = (await browserA.pages())[0];
    rpsTabB = (await browserB.pages())[0];

    await loadRPSApp(rpsTabA, 0);
    await loadRPSApp(rpsTabB, 1);
    await setupRPS(rpsTabA, rpsTabB);
  });

  afterAll(async () => {
    if (browserA) {
      await browserA.close();
    }
    if (browserB) {
      await browserB.close();
    }
  });

  it('can play a game end to end, and start a second game', async () => {
    await clickThroughRPSUI(rpsTabA, rpsTabB);
    expect(await (await rpsTabA.waitFor('h1.mb-5')).evaluate(el => el.textContent)).toMatch(
      'You lost'
    );
    expect(await (await rpsTabB.waitFor('h1.mb-5')).evaluate(el => el.textContent)).toMatch(
      'You won!'
    );

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    // Should be in the lobby
    expect(await rpsTabB.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
    expect(await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();

    await clickThroughRPSUI(rpsTabA, rpsTabB);
    expect(await (await rpsTabA.waitFor('h1.mb-5')).evaluate(el => el.textContent)).toMatch(
      'You lost'
    );
    expect(await (await rpsTabB.waitFor('h1.mb-5')).evaluate(el => el.textContent)).toMatch(
      'You won!'
    );
  });
});
