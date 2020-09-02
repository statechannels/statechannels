export default async function teardown(): Promise<void> {
  await (global as any).__GANACHE_SERVER__.close();
}