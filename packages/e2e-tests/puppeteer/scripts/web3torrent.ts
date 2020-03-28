import {Page} from 'puppeteer';
export async function seederUploadsAFile(page: Page): Promise<string> {
  return page.url();
}

export async function startDownload(page: Page): Promise<void> {
  page;
}

export async function cancelDownload(page: Page): Promise<void> {
  page;
}
