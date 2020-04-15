/* eslint-disable @typescript-eslint/no-non-null-assertion */
import puppeteer, {Page} from 'puppeteer';
import * as dappeteer from 'dappeteer';
import fs from 'fs';

import {
  waitAndApproveBudget,
  setUpBrowser,
  loadDapp,
  waitForBudgetEntry,
  waitAndApproveMetaMask,
  enableSlowMo
} from './helpers';

function prepareUploadFile(path: string): void {
  const content = 'web3torrent\n'.repeat(100000);
  const buf = Buffer.from(content);
  fs.writeFile(path, buf, err => {
    if (err) {
      console.log(err);
      throw new Error('Failed to prepare the upload file');
    }
  });
}

export async function uploadFile(
  page: Page,
  handleBudgetPrompt: boolean,
  metamask: dappeteer.Dappeteer
): Promise<string> {
  await page.waitForSelector('input[type=file]');

  // Generate a /tmp file with deterministic data for upload testing
  const fileToUpload = '/tmp/web3torrent-tests-stub';
  prepareUploadFile(fileToUpload);

  // https://pub.dev/documentation/puppeteer/latest/puppeteer/FileChooser-class.html
  // Not clear why puppeteer FileChooser won't work out of box. We are doing it manually for now.
  const inputUploadHandle = await page.$('input[type=file]');
  await inputUploadHandle!.uploadFile(fileToUpload);
  await inputUploadHandle!.evaluate(upload => {
    // eslint-disable-next-line no-undef
    upload.dispatchEvent(new Event('change', {bubbles: true}));
  });

  page.evaluate(`() => {
    console.log(window.ethereum);
  }`);
  await waitAndApproveMetaMask(page, metamask);

  if (handleBudgetPrompt) {
    await waitAndApproveBudget(page);
  }

  const downloadLinkSelector = '#download-link';
  await page.waitForSelector(downloadLinkSelector);
  const downloadLink = await page.$eval(downloadLinkSelector, a => a.getAttribute('href'));

  return downloadLink ? downloadLink : '';
}

export async function startDownload(
  page: Page,
  url: string,
  handleBudgetPrompt: boolean
): Promise<void> {
  await page.goto(url);
  const downloadButton = '#download-button:not([disabled])';
  await page.waitForSelector(downloadButton);
  await page.click(downloadButton);

  if (handleBudgetPrompt) {
    await waitAndApproveBudget(page);
  }
}

export async function cancelDownload(page: Page): Promise<void> {
  await page.click('#cancel-download-button');
}

const HEADLESS = false; // TODO set true

async function script() {
  // 100ms sloMo avoids some undiagnosed race conditions
  console.log('Opening browsers');

  const browser = await dappeteer.launch(puppeteer, {
    headless: false,
    slowMo: 0,
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
  const metamask = await dappeteer.getMetamask(browser);
  await metamask.importPK('0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8'); // etherlime account 0
  // await metamask.addNetwork('http://localhost:8547'); // does not seem to work
  await metamask.switchNetwork('localhost'); // defaults to 8545. In production, replace with 'ropsten'

  console.log('Waiting on pages');
  const web3tTab = (await browser.pages())[0];
  await enableSlowMo(web3tTab, 250);

  console.log('Loading dapp');
  await loadDapp(web3tTab, 0, true);

  await web3tTab.goto('http://localhost:3000/file/new', {waitUntil: 'load'}); // TODO replace with deployed app

  console.log('A uploads a file');

  await uploadFile(web3tTab, true, metamask);

  await waitForBudgetEntry(web3tTab);
}

script();
