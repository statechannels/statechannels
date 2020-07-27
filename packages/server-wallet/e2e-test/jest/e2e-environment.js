const TestEnvironment = require('jest-environment-node');

class ExpressEnvironment extends TestEnvironment {
  constructor(config, context) {
    const cloneconfig = Object.assign({}, config);
    cloneconfig.testURL = process.env.SERVER_ADDRESS;
    super(cloneconfig, context);
  }

  async setup() {
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = ExpressEnvironment;
