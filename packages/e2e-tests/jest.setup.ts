import waitOn from 'wait-on';

export default async (): Promise<void> => {
  const resources = ['http://localhost:3000', 'http://localhost:3055'];
  const opts = {resources, delay: 5000, interval: 2000, timeout: 120000};
  try {
    console.log('Waiting for servers');
    await waitOn(opts);
    console.log('Servers started');
    // once here, all resources are available
  } catch (err) {
    console.error(err);
  }
};
