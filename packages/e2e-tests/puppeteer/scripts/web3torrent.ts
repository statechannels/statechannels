/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {Page} from 'puppeteer';

import {
  prepareStubUploadFile,
  setUpBrowser,
  setupLogging,
  waitAndApproveBudget,
  waitAndApproveMetaMask,
  waitForBudgetEntry,
  waitAndApproveDepositWithHub,
  waitForAndClickButton
} from '../helpers';
import {Dappeteer} from 'dappeteer';
import {TX_WAIT_TIMEOUT} from '../constants';

export async function uploadFile(
  page: Page,
  handleBudgetPrompt: boolean,
  metamask: Dappeteer,
  filePath = '/tmp/web3torrent-tests-stub'
): Promise<string> {
  // https://pub.dev/documentation/puppeteer/latest/puppeteer/FileChooser-class.html
  // Not clear why puppeteer FileChooser won't work out of box. We are doing it manually for now.')
  const inputUploadHandle = await page.waitForSelector('input:not([disabled])[type=file]');

  if (filePath === '/tmp/web3torrent-tests-stub') {
    // By default, generate a /tmp stub file with deterministic data for upload testing
    await prepareStubUploadFile(filePath);
  }
  await inputUploadHandle.uploadFile(filePath);
  await inputUploadHandle.evaluate(upload => {
    // eslint-disable-next-line no-undef
    upload.dispatchEvent(new Event('change', {bubbles: true}));
  });

  await waitAndApproveMetaMask(page, metamask);

  if (handleBudgetPrompt) {
    await waitAndApproveBudget(page);
    await waitAndApproveDepositWithHub(page, metamask);
  }

  const downloadLinkSelector = '#download-link';
  await page.waitForSelector(downloadLinkSelector, {timeout: TX_WAIT_TIMEOUT}); // wait for my tx, which could be slow if on a real blockchain
  const downloadLink = await page.$eval(downloadLinkSelector, a => a.getAttribute('href'));

  return downloadLink ? downloadLink : '';
}

export async function startDownload(
  page: Page,
  url: string,
  handleBudgetPrompt: boolean,
  metamask: Dappeteer
): Promise<void> {
  await page.goto(url);
  await page.bringToFront();
  const downloadButton = '#download-button:not([disabled])';
  await page.waitForSelector(downloadButton);
  await page.click(downloadButton);

  await waitAndApproveMetaMask(page, metamask);

  if (handleBudgetPrompt) {
    await waitAndApproveBudget(page);
  }
}

export async function cancelDownload(page: Page): Promise<void> {
  await waitForAndClickButton(page, page, '#cancel-download-button');
}

/**
 * Useful for local testing. Run with:
 *
 * yarn puppeteer:dev
 
 */
(async (): Promise<void> => {
  if (require.main === module) {
    // 100ms sloMo avoids some undiagnosed race conditions
    console.log('Opening browser');

    const {browser, metamask} = await setUpBrowser(false, 6, 0);

    console.log('Waiting on pages');
    const web3tTabA = (await browser.pages())[0];

    console.log('Setting up logging...');
    await setupLogging(web3tTabA, 0, 'seed-download', true);

    await web3tTabA.goto('http://localhost:3000/upload', {waitUntil: 'load'});
    await web3tTabA.bringToFront();

    await uploadFile(web3tTabA, true, metamask);

    await waitForBudgetEntry(web3tTabA);
  }
})();
