# Getting started

Run `yarn`

# Protocols

`protocol.ts` is used to specify the configuration of a machine, which describes how a machine operates, and what it does. Each protocol should export the following objects:

- `config`: the machine's configuration
- `mockOptions`: (optional) mock options used by the xstate visualizer
- `Init`: A type indicating the initial context required by the machine
- `machine: (store: Store, context?: Init) => StateMachine<Init, any, any>`
  - Most of the behaviour of machines depend in some way on a data store. `src/store.ts` contains `Store`, a "rough draft" of the interface of a store. The `machine` factory hooks the protocol up to an implementation `store` of `Store`. It also configures invoked services (child machines)
- `Guards`, `Actions`, `Services`, `Options`: (optional) types indicating what options are required.

# Visualization

After updating `protocol.ts`, run `yarn generateConfigs` to update `protocol.config.js`.
Configs (`protocol.config.json`) can be visualized using https://xstate.js.org/viz/.

Install [gist](https://github.com/defunkt/gist) and run `yarn uploadConfig $PROTOCOL_NAME` to save the current configuration file living in `src/protocols/$PROTOCOL_NAME/protocol.config.js`.
Make sure to run `yarn generateConfigs` prior to uploading.

# Tests

Run `yarn test` to run tests.
