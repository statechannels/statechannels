module.exports = {
    runJest: function () {
        const jest = require('jest');
        let argv = process.argv.slice(2);
        let watch = false;
        let runInBand = false;
        // Watch unless on CI, in coverage mode, or explicitly running all tests
        if (
            !process.env.CI &&
            argv.indexOf('--coverage') === -1 &&
            argv.indexOf('--watchAll') === -1 &&
            argv.indexOf('--all') === -1
        ) {
            watch = true;
        }
        if (argv.indexOf('--runInBand')) {
            runInBand = true;
        }
        // TODO: Figure out argVs
        return jest.runCLI({
            runInBand,
            watch
        }, ['.']);
    }
}