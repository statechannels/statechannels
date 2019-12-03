process.env.BABEL_ENV = "development";
process.env.NODE_ENV = "development";

require("../config/env");

const {startSharedGanache} = require("@statechannels/devtools");

void (async () => {
  await startSharedGanache();
})();
