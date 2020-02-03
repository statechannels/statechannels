import {Browser, Page, Frame, launch} from 'puppeteer';

import * as fs from 'fs';
import * as path from 'path';

export async function loadRPSApp(page: Page, ganacheAccountIndex: number): Promise<void> {
  // TODO: This is kinda ugly but it works
  // We need to instantiate a web3 for the wallet so we import the web 3 script
  // and then assign it on the window
  const web3JsFile = fs.readFileSync(path.resolve(__dirname, 'web3/web3.min.js'), 'utf8');
  await page.evaluateOnNewDocument(web3JsFile);
  await page.evaluateOnNewDocument(`window.web3 = new Web3("http://localhost:8547")`);
  await page.evaluateOnNewDocument(`window.ethereum = window.web3.currentProvider`);
  // MetaMask has an .enable() API to unlock it / access it from the app
  await page.evaluateOnNewDocument(`window.ethereum.enable = () => new Promise(r => r())`);
  await page.evaluateOnNewDocument(
    `web3.eth.getAccounts().then(lst => {
      web3.eth.defaultAccount = lst[${ganacheAccountIndex}];
      window.ethereum.selectedAddress = web3.eth.defaultAccount;
    });`
  );
  await page.evaluateOnNewDocument(`window.ethereum.networkVersion = 9001`);
  await page.evaluateOnNewDocument(`window.ethereum.on = () => {}`);
  await page.goto('http://localhost:3000/', {waitUntil: 'networkidle0'});
  page.on('pageerror', error => {
    throw error;
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      throw new Error(`Error was logged into the console ${msg.text()}`);
    }
  });
}

// waiting for a css selector, and then clicking that selector is more robust than waiting for
// an XPath and then calling .click() on the resolved handle. We do not use the return value from the
// waitForSelector promise, so we avoid any errors where that return value loses its meaning
// https://github.com/puppeteer/puppeteer/issues/3496
// https://github.com/puppeteer/puppeteer/issues/2977
export async function waitForAndClickButton(page: Page | Frame, selector: string): Promise<void> {
  await page.waitForSelector(selector);
  return page.click(selector);
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
    ]
  });

  return browser;
}
