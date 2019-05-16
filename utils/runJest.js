module.exports = {
  runJest: function() {
    const jest = require("jest");
    let argv = process.argv.slice(2);
    let watch = false;
    let runInBand = false;
    // Watch unless on CI, in coverage mode, or explicitly running all tests
    if (
      !process.env.CI &&
      argv.indexOf("--coverage") === -1 &&
      argv.indexOf("--watchAll") === -1 &&
      argv.indexOf("--all") === -1
    ) {
      watch = true;
    }
    if (argv.indexOf("--runInBand") > -1) {
      runInBand = true;
    }
    let project = ".";
    // This allows us to specify different config files to run jest with.
    // Unfortunately its a bit awkward.

    if (argv.indexOf("-c") > -1 || argv.indexOf("--config") > -1) {
      const { resolve } = require("path");

      const index =
        argv.indexOf("-c") > -1 ? argv.indexOf("-c") : argv.indexOf("-config");
      if (argv.length >= index + 1) {
        project = resolve(process.cwd(), argv[index + 1]);
      }
    }

    // TODO: Figure figure out how jest parses out CLI arguments into a config object
    return jest.runCLI(
      {
        runInBand,
        watch
      },
      [project]
    );
  }
};
