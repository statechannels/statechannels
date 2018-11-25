const { startGanache } = require('./utils/startGanache');
const { deployContracts } = require('./utils/deployContracts');
const { runJest } = require('./utils/runJest');

module.exports = {
    startGanache,
    deployContracts,
    runJest
};