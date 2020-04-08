/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {Page} from 'puppeteer';
import * as fs from 'fs';

import {waitAndApproveBudget} from '../helpers';

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
