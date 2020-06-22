import {setUpBrowser, setupFakeWeb3} from '@statechannels/e2e-tests/puppeteer/helpers';
import {uploadFile} from '@statechannels/e2e-tests/puppeteer/scripts/web3torrent';
import {
  APP_URL as WEB3TORRENT_URL,
  HEADLESS,
  FAKE_WEB3_PK
} from '@statechannels/e2e-tests/puppeteer/constants';

export async function persistentSeeder(): Promise<void> {
  console.log('Opening browser');
  const {browser, metamask} = await setUpBrowser(HEADLESS);

  console.log('Waiting on pages');
  const web3tTabA = (await browser.pages())[0];

  await setupFakeWeb3(web3tTabA, -1, FAKE_WEB3_PK);

  await web3tTabA.goto(WEB3TORRENT_URL + '/upload', {waitUntil: 'load'});
  await web3tTabA.bringToFront();

  const url = await uploadFile(web3tTabA, true, metamask, {filePath: './nitro-protocol.pdf'});
  console.log(`seeding: go to ${url}`);
}

if (require.main === module) {
  persistentSeeder();
}
