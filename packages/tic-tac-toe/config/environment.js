'use strict';

module.exports = function(environment) {
  console.log(`TTT Address environment.js: ${process.env.TTT_CONTRACT_ADDRESS}`);
  let ENV = {
    modulePrefix: '@statechannels/tic-tac-toe',
    environment,
    rootURL: '/',
    locationType: 'auto',
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false
      }
    },
    TARGET_NETWORK: process.env.TARGET_NETWORK,
    WALLET_URL: process.env.WALLET_URL,
    TTT_CONTRACT_ADDRESS: process.env.TTT_CONTRACT_ADDRESS, // Need to inject this similar to start.js
    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },
    firebase: {
      databaseURL: `https://${process.env.FIREBASE_PROJECT_TTT}.firebaseio.com`,
      projectId: process.env.FIREBASE_PROJECT_TTT
    }
  };

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    // here you can enable a production-specific feature
  }

  return ENV;
};
