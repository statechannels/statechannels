import {setUpBrowser, setupLogging} from '../helpers';
import {uploadFile} from './web3torrent';

(async (): Promise<void> => {
  if (require.main === module) {
    console.log('Opening browser');
    const {browser, metamask} = await setUpBrowser(false, 0);

    console.log('Waiting on pages');
    const web3tTabA = (await browser.pages())[0];

    console.log('Setting up logging...');
    await setupLogging(web3tTabA, 0, 'minimal-dapp', true);

    await web3tTabA.goto('https://web3torrent.statechannels.org/upload', {waitUntil: 'load'});
    await web3tTabA.bringToFront();

    const url = await uploadFile(web3tTabA, true, metamask);
    console.log(`seeding: go to ${url}`);
  }
})();
