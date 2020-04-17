import {Browser, Page, Frame, launch} from 'puppeteer';

import * as fs from 'fs';
import * as path from 'path';

const pinoLog =
  process.env.LOG_DESTINATION && process.env.LOG_DESTINATION !== 'console'
    ? fs.createWriteStream(process.env.LOG_DESTINATION, {flags: 'a'})
    : {write: (): null => null};

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
      web3.eth.getAccounts().then(lst => {
        web3.eth.defaultAccount = lst[${ganacheAccountIndex}];
        window.ethereum.selectedAddress = web3.eth.defaultAccount;
        r([window.ethereum.selectedAddress]);
    });    
    
      
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

    const text = msg.text();
    if (/"name":"xstate-wallet"/.test(text)) pinoLog.write(text + '\n');
    else if (/"name":"web3torrent"/.test(text)) pinoLog.write(text + '\n');
    else console.log('Page console log: ', text);
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
    await page.screenshot({path: 'wait.error.png'});
    throw error;
  }
  try {
    return await frame.click(selector);
  } catch (error) {
    console.error('frame.click(' + selector + ') failed on frame ' + (await frame.title()));
    await page.screenshot({path: 'click.error.png'});
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

export async function waitForBudgetEntry(page: Page): Promise<void> {
  await page.waitForSelector('.site-budget-table > tbody > tr');
}

export async function waitForEmptyBudget(page: Page): Promise<void> {
  // eslint-disable-next-line no-undef
  await page.waitForFunction(() => !document.querySelector('.site-budget-table'));
}

export async function withdrawAndWait(page: Page): Promise<void> {
  console.log('Withdrawing funds');
  const walletIFrame = page.frames()[1];
  const web3TorrentIFrame = page.frames()[0];
  await waitForAndClickButton(page, web3TorrentIFrame, '#budget-withdraw');
  await waitForAndClickButton(page, walletIFrame, '#approve-withdraw');
}

export async function waitAndApproveBudget(page: Page): Promise<void> {
  console.log('Approving budget');

  const approveBudgetButton = '.approve-budget-button';

  const walletIFrame = page.frames()[1];
  await waitForAndClickButton(page, walletIFrame, approveBudgetButton);
}

interface Window {
  channelProvider: import('@statechannels/channel-provider').ChannelProviderInterface;
  done(): void;
}
declare let window: Window;

let doneFuncCounter = 0;
const doneWhen = (page: Page, done: string): Promise<void> => {
  const doneFunc = `done${doneFuncCounter++}`;
  const cb = `cb${doneFuncCounter}`;

  return new Promise(resolve =>
    page.exposeFunction(doneFunc, resolve).then(() => {
      page.evaluate(
        `
          ${cb} = channelStatus => {
            if (${done}) {
              window.${doneFunc}('Done');
              window.channelProvider.off('ChannelUpdated', ${cb});
            } 
          }
          window.channelProvider.on('ChannelUpdated', ${cb});
          `
      );
    })
  );
};
export const waitAndOpenChannel = (usingVirtualFunding: boolean) => async (
  page: Page
): Promise<void> => {
  if (!usingVirtualFunding) {
    console.log('Waiting for create channel button');

    const createChannelButton = 'div.application-workflow-prompt > div > button';

    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, walletIFrame, createChannelButton);
  } else {
    return doneWhen(page, 'true');
  }
};
export const waitForNthState = async (page: Page, n = 50): Promise<void> => {
  return doneWhen(page, `parseInt(channelStatus.turnNum) >= ${n}`);
};

export async function waitForClosingChannel(page: Page): Promise<void> {
  const closingText = 'div.application-workflow-prompt > h2';
  const closingIframeB = page.frames()[1];
  await closingIframeB.waitForSelector(closingText);
}
