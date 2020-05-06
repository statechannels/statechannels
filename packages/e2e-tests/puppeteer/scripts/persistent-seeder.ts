import {setUpBrowser, setupLogging} from '../helpers';
import {uploadFile} from './web3torrent';
import {APP_URL as WEB3TORRENT_URL} from '../constants';

export async function persistentSeeder(): Promise<void> {
  console.log('Opening browser');
  const {browser, metamask} = await setUpBrowser(false, 0);

  console.log('Waiting on pages');
  const web3tTabA = (await browser.pages())[0];

  console.log('Setting up logging...');
  await setupLogging(web3tTabA, 0, 'minimal-dapp', true);

  await web3tTabA.goto(WEB3TORRENT_URL + '/upload', {waitUntil: 'load'});
  await web3tTabA.bringToFront();

  const url = await uploadFile(web3tTabA, true, metamask, './nitro-protocol.pdf');
  console.log(`seeding: go to ${url}`);
}

if (require.main === module) {
  persistentSeeder();
}
