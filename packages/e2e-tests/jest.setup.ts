import waitOn from 'wait-on';
import {APP_URL, WALLET_URL} from './puppeteer/constants';

export default async (): Promise<void> => {
  const resources = [APP_URL, WALLET_URL];
  const opts = {resources, delay: 1000, interval: 2000, timeout: 120000};
  try {
    console.log('Waiting for servers');
    await waitOn(opts);
    console.log('Servers started');
    // once here, all resources are available
  } catch (err) {
    console.error(err);
  }
};
