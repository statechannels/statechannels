import puppeteer, {Browser, Page, Frame} from 'puppeteer';
import * as dappeteer from 'dappeteer';

import {parseBittorrentLog} from './parseBittorrentProtocolLogs';
import * as fs from 'fs';
import * as path from 'path';
import {
  USE_DAPPETEER,
  TARGET_NETWORK,
  TX_WAIT_TIMEOUT,
  SCREENSHOT_DIR,
  RPC_ENDPOINT,
  CHAIN_NETWORK_ID,
  LOG_DESTINATION,
  USING_EXTERNAL_CHAIN,
  SHOW_DEVTOOLS,
  DEBUG_FILTER
} from './constants';
import {ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {promisify} from 'util';

const writeFile = promisify(fs.writeFile);

export const waitForWalletToBeDisplayed = async (page: Page): Promise<void> => {
  const walletIframe = page.frames()[1];
  await walletIframe.waitForSelector(':root', {visible: true});
};

export const waitForWalletToBeHidden = async (page: Page): Promise<void> => {
  const walletIframe = page.frames()[1];
  await walletIframe.waitForSelector(':root', {hidden: true, timeout: TX_WAIT_TIMEOUT});
};

export const expectWalletToBeHidden = async (page: Page): Promise<void> => {
  const walletIframe = page.frames()[1];
  await expect(walletIframe.select(':root')).rejects.toThrow();
};

export const expectSelector = async (
  page: Page,
  selector: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value?: any
): Promise<typeof value> => {
  if (value) {
    await expect(page.waitForSelector(selector, {timeout: 1000})).resolves.toEqual(value);
  } else {
    await expect(page.waitForSelector(selector, {timeout: 1000})).resolves.not.toThrow();
  }
};

const logDistinguisherCache: Record<string, true | undefined> = {};
export async function setupLogging(
  page: Page,
  ganacheAccountIndex: number,
  logPrefix: string,
  ignoreConsoleError?: boolean
): Promise<void> {
  page.on('pageerror', error => {
    throw error;
  });

  if (DEBUG_FILTER) {
    console.log(`Setting DEBUG filter for ${ganacheAccountIndex}`);
    await page.goto('http://localhost:3000'); // Can be any page
    await page.evaluate(`localStorage.setItem('debug', '${DEBUG_FILTER}')`);
  }

  const filename = `${logPrefix}.${ganacheAccountIndex}`;

  if (logDistinguisherCache[filename]) throw `Ambiguous log config detected: ${filename}`;
  logDistinguisherCache[filename] = true;

  const LOGS_LOCATION = path.join(LOG_DESTINATION, filename);

  const APPEND = 'a';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writeStream = (filename: string): {write: (...x: any[]) => any} =>
    LOG_DESTINATION === 'console'
      ? {write: (): null => null}
      : fs.createWriteStream(filename, {flags: APPEND});

  const pinoLog = writeStream(`${LOGS_LOCATION}.pino.log`);
  const browserConsoleLog = writeStream(`${LOGS_LOCATION}.browser.log`);

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const isPinoLog = (name: string) => {
    const regex = new RegExp(`"name":"${name}"`);
    return (text: string): boolean => regex.test(text);
  };
  const isDebugLog = (debugTag: string) => (name: string): boolean => !!name.match(debugTag);

  const isXstateWalletLog = isPinoLog('xstate-wallet');
  const isWeb3torrentLog = isPinoLog('web3torrent');
  const isChannelProviderLog = isPinoLog('channel-provider');
  const isBittorrentProtocolLog = isDebugLog('bittorrent-protocol');

  const browserId = ganacheAccountIndex;

  const withGanacheIndex = (text: string): string =>
    JSON.stringify({...JSON.parse(text), browserId}) + '\n';

  page.on('console', msg => {
    if (msg.type() === 'error' && !ignoreConsoleError) {
      throw new Error(`Error was logged into the console ${msg.text()}`);
    }

    const text = msg.text();
    if (isXstateWalletLog(text) || isWeb3torrentLog(text) || isChannelProviderLog(text))
      pinoLog.write(withGanacheIndex(text));
    else if (isBittorrentProtocolLog(text)) {
      const time = Date.now();
      // To parse the bittorrent logs, we must first await the arguments from the handle that
      // puppeteer gives us
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Promise.all(msg.args().map(arg => arg.jsonValue())).then((args: any) => {
        const [logLine, ...values] = args;
        const TRACE = 10;
        const line = {time, browserId, level: TRACE, ...parseBittorrentLog(logLine, ...values)};
        pinoLog.write(JSON.stringify(line) + '\n');
      });
    } else {
      browserConsoleLog.write(`Browser ${browserId} logged ${text}` + '\n');
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
  frame: Frame | Page,
  selector: string
): Promise<void> {
  try {
    // We only want to click on a button if it  is visible to the user
    await frame.waitForSelector(selector, {visible: true});
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

class FakeMetaMask implements dappeteer.Dappeteer {
  lock: () => Promise<void> = () => new Promise<void>(res => res());
  unlock: (password: string) => Promise<void> = (password: string) =>
    new Promise<void>(res => password && res());
  addNetwork: (url: string) => Promise<void> = (url: string) =>
    new Promise<void>(res => url && res());
  importPK: (pk: string) => Promise<void> = (pk: string) => new Promise<void>(res => pk && res());
  switchAccount: (accountNumber: number) => Promise<void> = (accountNumber: number) =>
    new Promise<void>(res => accountNumber && res());
  switchNetwork: (network: string) => Promise<void> = (network: string) =>
    new Promise<void>(res => network && res());
  confirmTransaction: (options: dappeteer.TransactionOptions) => Promise<void> = (
    options: dappeteer.TransactionOptions
  ) => new Promise<void>(res => options && res());
  sign: () => Promise<void> = () => new Promise<void>(res => res());
  approve: () => Promise<void> = () => new Promise<void>(res => res());
}

export async function setupFakeWeb3(page: Page, ganacheAccountIndex: number): Promise<void> {
  // TODO: This is kinda ugly but it works
  // We need to instantiate a web3 for the wallet so we import the web 3 script
  // and then assign it on the window
  const web3JsFile = fs.readFileSync(path.resolve(__dirname, 'web3/web3.min.js'), 'utf8');
  await page.evaluateOnNewDocument(web3JsFile);
  await page.evaluateOnNewDocument(`
    window.web3 = new Web3(new Web3.providers.HttpProvider("${RPC_ENDPOINT}"));
    ${
      USING_EXTERNAL_CHAIN
        ? 'window.web3.eth.accounts.wallet.add("0xccb052837ccafb700e34c0e0cc0f3e5fbee8f078f3fe6b4e5950c7c8acaa7bce");'
        : ''
    }

    window.ethereum = window.web3.currentProvider;
    ${USING_EXTERNAL_CHAIN ? 'window.ethereum.mockingInfuraProvider = true;' : ''}

    window.ethereum.enable = () => new Promise(r => {
      console.log("[puppeteer] window.ethereum.enable() was called");
      web3.eth.getAccounts().then(lst => {
        web3.eth.defaultAccount = ${
          USING_EXTERNAL_CHAIN
            ? '"0x7e4ABd63A7C8314Cc28D388303472353D884f292"'
            : `lst[${ganacheAccountIndex}]`
        };
        console.log("Using address " + web3.eth.defaultAccount);
        window.ethereum.selectedAddress = web3.eth.defaultAccount;
        r([window.ethereum.selectedAddress]);
      });      
    });
    window.ethereum.networkVersion = ${CHAIN_NETWORK_ID};
    window.ethereum.on = () => {};
  `);
}

export async function setUpBrowser(
  headless: boolean,
  etherlimeAccountIndex?: number,
  slowMo?: number,
  usePipe = false,
  devtools = SHOW_DEVTOOLS === null ? !headless : SHOW_DEVTOOLS
): Promise<{browser: Browser; metamask: dappeteer.Dappeteer}> {
  let browser: Browser;
  let metamask: dappeteer.Dappeteer;
  if (!USE_DAPPETEER) {
    browser = await puppeteer.launch({
      headless,
      slowMo,
      pipe: usePipe,
      devtools,
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
        '--disable-features=site-per-process',
        // https://github.com/puppeteer/puppeteer/issues/1175#issuecomment-369728215
        '--disable-dev-shm-usage',
        // https://github.com/puppeteer/puppeteer/issues/3683#issuecomment-453236421
        '--no-sandbox'
      ]
    });
    metamask = new FakeMetaMask();
  } else {
    console.log(
      'USE_DAPPETEER was set to TRUE, so ignoring HEADLESS variable and running in headFUL mode'
    );
    browser = await dappeteer.launch(puppeteer, {
      headless: false,
      slowMo,
      pipe: usePipe,

      //, Needed to allow both windows to execute JS at the same time
      ignoreDefaultArgs: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      args: [
        // Needed to inject web3.js code into wallet iframe
        // https://github.com/puppeteer/puppeteer/issues/2548#issuecomment-390077713
        '--disable-features=site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    metamask = await dappeteer.getMetamask(browser);

    if (etherlimeAccountIndex && TARGET_NETWORK === 'localhost') {
      if (etherlimeAccountIndex === 6) {
        throw new Error('STOP! You are using the same private key as the hub. Expect nonce errors');
      }
      // if targeting ropsten, use dappeteer default account for now
      await metamask.importPK(ETHERLIME_ACCOUNTS[etherlimeAccountIndex].privateKey);
      console.log(`imported ${ETHERLIME_ACCOUNTS[etherlimeAccountIndex].privateKey}`);
    }

    // Because of the implementation of switchNetwork not allowing for
    // custom host & ports (see https://github.com/decentraland/dappeteer/blob/7720a675d2d0c4fa10e93d33426b984cc391d4c3/src/index.ts#L149)
    // our only options are "localhost" (which defaults to 8545) or a public network such as 'ropsten'
    await metamask.switchNetwork(TARGET_NETWORK);
  }

  return {browser, metamask};
}

export async function waitForBudgetEntry(page: Page): Promise<void> {
  await page.waitForSelector('.budget-button');
}

export async function waitForFinishedOrCanceledDownload(page: Page): Promise<void> {
  await page.waitForSelector('#download-button, .DownloadLink');
}

export async function waitForEmptyBudget(page: Page): Promise<void> {
  // eslint-disable-next-line no-undef
  await page.waitForFunction(() => !document.querySelector('.domain-budget-table'), {
    timeout: TX_WAIT_TIMEOUT
  }); // wait for my tx, which could be slow if on a real blockchain);
}

export async function waitAndApproveBudget(page: Page): Promise<void> {
  console.log('Approving budget');

  const approveBudgetButton = '.approve-budget-button';
  const walletIFrame = page.frames()[1];
  await waitForAndClickButton(page, walletIFrame, approveBudgetButton);
}

export async function waitAndApproveMetaMask(
  page: Page,
  metamask: dappeteer.Dappeteer
): Promise<void> {
  console.log('Approving metamask');

  const connectWithMetamaskButton = '#connect-with-metamask-button';

  const walletIFrame = page.frames()[1];
  await waitForAndClickButton(page, walletIFrame, connectWithMetamaskButton);
  await metamask.approve();
  await page.bringToFront();
}

export async function waitForTransactionIfNecessary(page: Page): Promise<void> {
  const walletIFrame = page.frames()[1];
  try {
    await walletIFrame.waitForSelector('#wait-for-transaction', {timeout: 1000});
  } catch (e) {
    if (e instanceof puppeteer.errors.TimeoutError) return;
    else throw e;
  }
  console.log('Waiting for transaction to be mined');
  await waitForWalletToBeHidden(page);
}

export async function waitAndApproveDepositWithHub(
  page: Page,
  metamask: dappeteer.Dappeteer
): Promise<void> {
  console.log('Making deposit with hub');
  const walletIFrame = page.frames()[1];
  console.log('Waiting for #please-approve-transaction');
  console.time('#please-approve-transaction');
  await walletIFrame.waitForSelector('#please-approve-transaction', {timeout: TX_WAIT_TIMEOUT * 3}); // longer timeout here because blockchain is slow
  console.timeEnd('#please-approve-transaction');

  await metamask.confirmTransaction({gas: 20, gasLimit: 50000});
  await page.bringToFront();
}

export async function waitAndApproveDeposit(
  page: Page,
  metamask: dappeteer.Dappeteer
): Promise<void> {
  console.log('Making deposit');
  await page.waitFor(2000); // no prompt when direct funding
  await metamask.confirmTransaction({gas: 20, gasLimit: 50000});
  await page.bringToFront();
}

export async function waitAndApproveWithdraw(
  page: Page,
  metamask: dappeteer.Dappeteer
): Promise<void> {
  console.log('withdrawing...');

  // const walletIFrame = page.frames()[1];
  // await walletIFrame.waitForSelector('#selector-does-not-exist-yet');
  await page.waitFor(5000); // there's no prompt to approve tx, since the close-ledger-and-withdraw is not a full workflow
  await metamask.confirmTransaction({gas: 20, gasLimit: 50000});
  await page.bringToFront();
}

export async function withdrawAndWait(page: Page, metamask: dappeteer.Dappeteer): Promise<void> {
  console.log('Withdrawing funds');
  const walletIFrame = page.frames()[1];
  const web3TorrentIFrame = page.frames()[0];
  await waitForAndClickButton(page, web3TorrentIFrame, '#budget-withdraw');
  await waitForAndClickButton(page, walletIFrame, '#approve-withdraw');
  await waitAndApproveWithdraw(page, metamask);
}

let doneFuncCounter = 0;
const doneWhen = (page: Page, done: string): Promise<void> => {
  const doneFunc = `done${doneFuncCounter++}`;
  const cb = `cb${doneFuncCounter}`;

  return new Promise((resolve, reject) => {
    setTimeout(() => reject(`Timed out waiting for ${done}`), 45_000);
    page
      .exposeFunction(doneFunc, resolve)
      .then(() => {
        page
          .evaluate(
            `
              ${cb} = channelStatus => {
                if (${done}) {
                  window.${doneFunc}('Done');
                  window.channelProvider.off('ChannelUpdated', ${cb});
                } 
              }
              window.channelProvider.on('ChannelUpdated', ${cb});
              `
          )
          .catch(reject);
      })
      .catch(reject);
  });
};
export const waitAndOpenChannel = (usingVirtualFunding: boolean) => async (
  page: Page
): Promise<void> => {
  if (!usingVirtualFunding) {
    console.log('Direct Funding: Waiting for create channel button');

    const createChannelButton = 'div.application-workflow-prompt > div > button';

    const walletIFrame = page.frames()[1];
    await waitForAndClickButton(page, walletIFrame, createChannelButton);
  } else {
    return;
  }
};
export const waitForNthState = async (page: Page, n = 50): Promise<void> => {
  return doneWhen(page, `parseInt(channelStatus.turnNum) >= ${n}`);
};
export const waitForClosedState = async (page: Page): Promise<void> => {
  return doneWhen(page, `channelStatus.status === 'closed'`);
};

export const waitForRunningState = async (page: Page): Promise<void> => {
  return doneWhen(page, `channelStatus.status === 'running'`);
};

export async function waitForClosingChannel(page: Page): Promise<void> {
  await waitForWalletToBeDisplayed(page);
  const closingText = 'div.application-workflow-prompt > h2';
  const closingIframeB = page.frames()[1];
  await closingIframeB.waitForSelector(closingText);
}

export async function prepareStubUploadFile(path: string, repeats: number): Promise<void> {
  const uniqueContent = Date.now();
  console.log(`Make Stub file with seed ${Date.now()}`);
  const content = `web3torrent-${uniqueContent}\n`.repeat(repeats);
  await writeFile(path, Buffer.from(content));
}

export async function takeScreenshot(tab: Page, file: string): Promise<void> {
  if (typeof SCREENSHOT_DIR === 'string') {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);
    file = path.join(SCREENSHOT_DIR, file);
    await tab.screenshot({path: `${file}.png`, fullPage: true});
    fs.writeFileSync(`${file}.html`, await tab.content());
  }
}
