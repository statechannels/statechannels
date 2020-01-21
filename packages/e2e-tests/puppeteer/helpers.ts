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

export async function waitForAndClickButton(page: Page | Frame, button: string): Promise<void> {
  return (await page.waitForXPath('//button[contains(., "' + button + '")]')).click();
}

export async function waitForHeading(page: Page | Frame): Promise<string | null> {
  return (await page.waitFor('h1.mb-5')).evaluate(el => el.textContent);
}
export async function setUpBrowser(headless: boolean, slowMo?: number): Promise<Browser> {
  const browser = await launch({
    headless,
    slowMo,
    devtools: !headless,
    // Needed to allow both windows to execute JS at the same time
    ignoreDefaultArgs: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  return browser;
}
