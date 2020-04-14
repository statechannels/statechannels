/* eslint-disable @typescript-eslint/no-non-null-assertion */
import puppeteer, {Page} from 'puppeteer';
import * as dappeteer from 'dappeteer';
import fs from 'fs';

import {waitAndApproveBudget, setUpBrowser, loadDapp, waitForBudgetEntry} from './helpers';

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

export async function uploadFile(page: Page, handleBudgetPrompt: boolean): Promise<string> {
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

  const browser = await dappeteer.launch(puppeteer);
  const metamask = await dappeteer.getMetamask(browser);
  // await metamask.addNetwork('http://localhost:8547'); // does not seem to work
  await metamask.switchNetwork('localhost'); // defaults to 8545. In production, replace with 'ropsten'

  console.log('Waiting on pages');
  const web3tTab = (await browser.pages())[0];

  console.log('Loading dapp');
  await loadDapp(web3tTab, 0, true);

  await web3tTab.goto('http://localhost:3000/file/new', {waitUntil: 'load'}); // TODO replace with deployed app

  console.log('A uploads a file');

  await uploadFile(web3tTab, true);

  await waitForBudgetEntry(web3tTab);
}

script();
