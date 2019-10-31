async function globalTeardown() {
  await global.chain.close();
}

module.exports = globalTeardown;
