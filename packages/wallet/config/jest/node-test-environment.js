const NodeJSEnvironment = require("jest-environment-node");

require("dotenv-extended").load();

// This environment runs for _every test suite_.

class NodeEnvironment extends NodeJSEnvironment {
    constructor(config) {
        super(config);
    }

    async setup() {
        await super.setup();

        this.global.contracts = global["contracts"];
    }


    async teardown() {
        await super.teardown();
    }

    runScript(script) {
        return super.runScript(script);
    }
}

module.exports = NodeEnvironment;
