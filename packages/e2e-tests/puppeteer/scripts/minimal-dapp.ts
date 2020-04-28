/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {setUpBrowser, setupLogging} from '../helpers';

(async (): Promise<void> => {
  if (require.main === module) {
    console.log('Opening browser');
    const {browser} = await setUpBrowser(false, 0);

    console.log('Waiting on pages');
    const web3tTabA = (await browser.pages())[0];

    console.log('Setting up logging...');
    await setupLogging(web3tTabA, 0, 'minimal-dapp', true);

    await web3tTabA.goto('http://bbc.com', {waitUntil: 'load'});
    await web3tTabA.bringToFront();
    console.log('completed!');
  }
})();
