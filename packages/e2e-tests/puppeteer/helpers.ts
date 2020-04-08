import {Browser, Page, Frame, launch} from 'puppeteer';

import * as fs from 'fs';
import * as path from 'path';

export async function loadDapp(
  page: Page,
  ganacheAccountIndex: number,
  ignoreConsoleError?: boolean
): Promise<void> {
  // TODO: This is kinda ugly but it works
  // We need to instantiate a web3 for the wallet so we import the web 3 script
  // and then assign it on the window
  const web3JsFile = fs.readFileSync(path.resolve(__dirname, 'web3/web3.min.js'), 'utf8');
  await page.evaluateOnNewDocument(web3JsFile);
  await page.evaluateOnNewDocument(`
    window.web3 = new Web3("http://localhost:8547");
    window.ethereum = window.web3.currentProvider;
    window.ethereum.enable = () => new Promise(r => {
      console.log("[puppeteer] window.ethereum.enable() was called");
      return r();
    });
    web3.eth.getAccounts().then(lst => {
      web3.eth.defaultAccount = lst[${ganacheAccountIndex}];
      window.ethereum.selectedAddress = web3.eth.defaultAccount;
    });
    window.ethereum.networkVersion = 9001;
    window.ethereum.on = () => {};
  `);

  page.on('pageerror', error => {
    throw error;
  });

  page.on('console', msg => {
    if (msg.type() === 'error' && !ignoreConsoleError) {
      throw new Error(`Error was logged into the console ${msg.text()}`);
    }
  });
}

// waiting for a css selector, and then clicking that selector is more robust than waiting for
// an XPath and then calling .click() on the resolved handle. We do not use the return value from the
// waitForSelector promise, so we avoid any errors where that return value loses its meaning
// https://github.com/puppeteer/puppeteer/issues/3496
// https://github.com/puppeteer/puppeteer/issues/2977
export async function waitForAndClickButton(
  page: Page,
  frame: Frame,
  selector: string
): Promise<void> {
  try {
    await frame.waitForSelector(selector);
  } catch (error) {
    console.error(
      'frame.waitForSelector(' + selector + ') failed on frame ' + (await frame.title())
    );
    await page.screenshot({path: 'e2e-wait.error.png'});
    throw error;
  }
  try {
    return await frame.click(selector);
  } catch (error) {
    console.error('frame.click(' + selector + ') failed on frame ' + (await frame.title()));
    await page.screenshot({path: 'e2e-click.error.png'});
    throw error;
  }
}

export async function setUpBrowser(headless: boolean, slowMo?: number): Promise<Browser> {
  const browser = await launch({
    headless,
    slowMo,
    devtools: !headless,
    // Keep code here for convenience... if you want to use redux-dev-tools
    // then download and unzip the release from Github and specify the location.
    // Github URL: https://github.com/zalmoxisus/redux-devtools-extension/releases
    // args: [
    //   '--disable-extensions-except=/Users/liam/Downloads/redux-dev-tools',
    //   '--load-extension=/Users/liam/Downloads/redux-dev-tools'
    // ],
    //, Needed to allow both windows to execute JS at the same time
    ignoreDefaultArgs: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    args: [
      // Needed to inject web3.js code into wallet iframe
      // https://github.com/puppeteer/puppeteer/issues/2548#issuecomment-390077713
      '--disable-features=site-per-process'
    ]
  });

  return browser;
}

export async function waitAndApproveBudget(page: Page): Promise<void> {
  console.log('Approving budget');

  const approveBudgetButton = '.approve-budget-button';

  const walletIFrame = page.frames()[1];
  await waitForAndClickButton(page, walletIFrame, approveBudgetButton);
}

export const waitAndOpenChannel = (usingVirtualFunding: boolean) => async (
  page: Page
): Promise<void> => {
  if (usingVirtualFunding) {
    return new Promise(r => {
      setTimeout(() => r(), 10000);
    });
  } else {
    const createChannelButton = 'div.application-workflow-prompt > div > button';

    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, walletIFrame, createChannelButton);
  }
};

export async function waitForClosingChannel(page: Page): Promise<void> {
  const closingText = 'div.application-workflow-prompt > h1';
  const closingIframeB = page.frames()[1];
  await closingIframeB.waitForSelector(closingText);
}
