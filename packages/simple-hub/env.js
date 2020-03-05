'use strict';

// FIXME: To remove @statechannels/hub's dependency on @statechannels/devtools,
// this file is a carbon copy of the file that exports configureEnvVariables in devtools.

// const {configureEnvVariables} = require('@statechannels/devtools');

const fs = require('fs');
const path = require('path');

function configureEnvVariables(monorepo = true) {
  const NODE_ENV = process.env.NODE_ENV;
  if (!NODE_ENV) {
    throw new Error('The NODE_ENV environment variable is required but was not specified.');
  }

  // https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
  let dotenvFiles = [
    `.env.${NODE_ENV}.local`,
    // Don't include `.env.local` for `test` environment
    // since normally you expect tests to produce the same
    // results for everyone
    NODE_ENV !== 'test' && `.env.local`,
    `.env.${NODE_ENV}`,
    '.env'
  ].filter(x => !!x);

  if (monorepo) {
    const monorepoDotenvFiles = dotenvFiles.slice(0);
    dotenvFiles.forEach(dotenvFile => {
      monorepoDotenvFiles.push(path.join('../..', dotenvFile));
    });
    dotenvFiles = monorepoDotenvFiles;
  }

  // Load environment variables from .env* files. Suppress warnings using silent
  // if this file is missing. dotenv will never modify any environment variables
  // that have already been set.  Variable expansion is supported in .env files.
  // https://github.com/motdotla/dotenv
  // https://github.com/motdotla/dotenv-expand
  dotenvFiles.forEach(dotenvFile => {
    if (fs.existsSync(dotenvFile)) {
      // Need to refactor away from this
      /* eslint-disable @typescript-eslint/no-var-requires */
      require('dotenv-expand')(
        require('dotenv').config({
          path: dotenvFile
        })
      );
      /* eslint-enable @typescript-eslint/no-var-requires */
    }
  });
}

configureEnvVariables(true);
