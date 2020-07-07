export default async function teardown() {
  await (global as any).__GANACHE_SERVER__.close();
}
