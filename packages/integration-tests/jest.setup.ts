import waitOn from 'wait-on';

const WALLET_URL = 'https://localhost:3000';
export default async (): Promise<void> => {
  const resources = [WALLET_URL];
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
