import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadRPSApp, waitForHeading} from '../helpers';
import {
  startAndFundRPSGame,
  clickThroughResignationUI,
  setupRPS,
  playMove,
  clickThroughRPSUIWithChallengeByPlayerA,
  clickThroughRPSUIWithChallengeByPlayerB
} from '../scripts/rps';

jest.setTimeout(120_000);

configureEnvVariables();
const HEADLESS = getEnvBool('HEADLESS');

describe('Playing a game of RPS', () => {
  let browserA: Browser;
  let browserB: Browser;
  let rpsTabA: Page;
  let rpsTabB: Page;

  beforeAll(async () => {
    browserA = await setUpBrowser(HEADLESS);
    browserB = await setUpBrowser(HEADLESS);

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

  it('can play four games end to end in one tab session, two with challenges', async () => {
    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await playMove(rpsTabA, 'rock');
    await playMove(rpsTabB, 'paper');

    expect(await waitForHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForHeading(rpsTabB)).toMatch('You won!');

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    // Should be in the lobby
    expect(await rpsTabB.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
    expect(await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();

    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await playMove(rpsTabA, 'rock');
    await playMove(rpsTabB, 'paper');

    expect(await waitForHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForHeading(rpsTabB)).toMatch('You won!');

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    // Should be in the lobby
    expect(await rpsTabB.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
    expect(await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();

    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await clickThroughRPSUIWithChallengeByPlayerA(rpsTabA, rpsTabB);

    expect(await waitForHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForHeading(rpsTabB)).toMatch('You won!');

    await clickThroughResignationUI(rpsTabA, rpsTabB);

    await startAndFundRPSGame(rpsTabA, rpsTabB);

    await clickThroughRPSUIWithChallengeByPlayerB(rpsTabA, rpsTabB);

    expect(await waitForHeading(rpsTabA)).toMatch('You won!');
    expect(await waitForHeading(rpsTabB)).toMatch('You lost');
  });
});
