/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {Page} from 'puppeteer';

export async function uploadFile(page: Page): Promise<string> {
  await page.waitForSelector('input[type=file]');
  const fileToUpload = 'file.pdf';

  // https://pub.dev/documentation/puppeteer/latest/puppeteer/FileChooser-class.html
  // Not clear why puppeteer FileChooser won't work out of box. We are doing it manually for now.
  const inputUploadHandle = await page.$('input[type=file]');
  await inputUploadHandle!.uploadFile(fileToUpload);
  await inputUploadHandle!.evaluate(upload => {
    // eslint-disable-next-line no-undef
    upload.dispatchEvent(new Event('change', {bubbles: true}));
  });

  await page.waitFor(3000);

  const downloadLink = await page.$eval(
    '#root > main > section > section.torrentInfo > div:nth-child(2) > a',
    a => a.getAttribute('href')
  );

  return downloadLink ? downloadLink : '';
}

export async function startDownload(page: Page, url: string): Promise<void> {
  await page.goto(url);
  const downloadButton = '#root > main > section > button';
  await page.waitForSelector(downloadButton);
  await page.waitFor(2000);
  await page.click(downloadButton);
}

export async function cancelDownload(page: Page): Promise<void> {
  await page.click('#root > main > section > section.downloadingInfo > button');
}
