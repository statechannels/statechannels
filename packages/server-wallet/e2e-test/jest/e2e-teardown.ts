module.exports = async (): Promise<void> => {
  console.log(`\n[e2e-teardown.ts] Terminating Pong server ...`);
  (global as any).server.close();
};
