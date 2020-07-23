const TestEnvironment = require('jest-environment-node');

class ExpressEnvironment extends TestEnvironment {
  constructor(config, context) {
    const cloneconfig = Object.assign({}, config);
    // eslint-disable-next-line
    cloneconfig.testURL = process.env.SERVER_ADDRESS;
    super(cloneconfig, context);
  }

  async setup() {
    this.global.jsdom = this.dom;
    await super.setup();
  }

  async teardown() {
    this.global.jsdom = null;
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = ExpressEnvironment;
