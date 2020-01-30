import {Page, Browser} from 'puppeteer';
import {configureEnvVariables, getEnvBool} from '@statechannels/devtools';

import {setUpBrowser, loadRPSApp, waitForHeading, waitForWinLossHeading} from '../helpers';
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

  it('[game 1] can start and fund an RPS game', async () => {
    await startAndFundRPSGame(rpsTabA, rpsTabB);
    expect(await waitForHeading(rpsTabA)).toMatch('Choose your move:');
    expect(await waitForHeading(rpsTabB)).toMatch('Choose your move:');
  });

  it('[game 1] can select rock (tab A) and paper (tab B)', async () => {
    await playMove(rpsTabA, 'rock');
    await playMove(rpsTabB, 'paper');
    expect(await waitForWinLossHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForWinLossHeading(rpsTabB)).toMatch('You won!');
  });

  it('[game 1] can get through resignation', async () => {
    await clickThroughResignationUI(rpsTabA, rpsTabB);
    // Should be in the lobby
    expect(await rpsTabB.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
    expect(await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
  });

  it('[game 2] can start and fund an RPS game', async () => {
    await startAndFundRPSGame(rpsTabA, rpsTabB);
    expect(await waitForHeading(rpsTabA)).toMatch('Choose your move:');
    expect(await waitForHeading(rpsTabB)).toMatch('Choose your move:');
  });

  it('[game 2] can select rock (tab A) and paper (tab B)', async () => {
    await playMove(rpsTabA, 'rock');
    await playMove(rpsTabB, 'paper');
    expect(await waitForWinLossHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForWinLossHeading(rpsTabB)).toMatch('You won!');
  });

  it('[game 2] can get through resignation', async () => {
    await clickThroughResignationUI(rpsTabA, rpsTabB);
    // Should be in the lobby
    expect(await rpsTabB.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
    expect(await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
  });

  it('[game 3] can start and fund an RPS game', async () => {
    await startAndFundRPSGame(rpsTabA, rpsTabB);
    expect(await waitForHeading(rpsTabA)).toMatch('Choose your move:');
    expect(await waitForHeading(rpsTabB)).toMatch('Choose your move:');
  });

  it('[game 3] can get through a challenge by player A', async () => {
    await clickThroughRPSUIWithChallengeByPlayerA(rpsTabA, rpsTabB);
    expect(await waitForWinLossHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForWinLossHeading(rpsTabB)).toMatch('You won!');
  });

  it('[game 3] can get through resignation', async () => {
    await clickThroughResignationUI(rpsTabA, rpsTabB);
    // Should be in the lobby
    expect(await rpsTabB.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
    expect(await rpsTabA.waitForXPath('//button[contains(., "Create a game")]')).toBeDefined();
  });

  it('[game 4] can start and fund an RPS game', async () => {
    await startAndFundRPSGame(rpsTabA, rpsTabB);
    expect(await waitForHeading(rpsTabA)).toMatch('Choose your move:');
    expect(await waitForHeading(rpsTabB)).toMatch('Choose your move:');
  });

  it('[game 3] can get through a challenge by player B', async () => {
    await clickThroughRPSUIWithChallengeByPlayerB(rpsTabA, rpsTabB);
    expect(await waitForWinLossHeading(rpsTabA)).toMatch('You lost');
    expect(await waitForWinLossHeading(rpsTabB)).toMatch('You won!');
  });
});
