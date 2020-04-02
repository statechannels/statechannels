/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {Page} from 'puppeteer';
import * as fs from 'fs';

function prepareUploadFile(path: string): void {
  // Write deterministic content to the test file.
  const content = 'web3torrent\n'.repeat(100000);
  const buf = Buffer.from(content);
  fs.writeFile(path, buf, err => {
    if (err) {
      console.log(err);
      throw new Error('Failed to prepare the upload file');
    }
  });
}

export async function uploadFile(page: Page): Promise<string> {
  await page.waitForSelector('input[type=file]');
  // Generated from command: openssl rand -out random.txt -base64 $(( 2**20 * 3/4 * 4 ))
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

  await page.waitFor(3000);

  const downloadLink = await page.$eval('#download-link', a => a.getAttribute('href'));

  return downloadLink ? downloadLink : '';
}

export async function startDownload(page: Page, url: string): Promise<void> {
  await page.goto(url);
  const downloadButton = '#download-button';
  await page.waitForSelector(downloadButton);
  await page.waitFor(2000);
  await page.click(downloadButton);
}

export async function cancelDownload(page: Page): Promise<void> {
  await page.click('#cancel-download-button');
}
