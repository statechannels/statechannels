# Configurations

`protocol.ts` is used to specify the configuration of a machine, which describes how a machine operates, and what it does.

# Visualization

After updating `protocol.ts`, run `yarn generateConfig` to update `protocol.config.js`.
Configs (`protocol.config.json`) are used to generate the visualizations using https://xstate.js.org/viz/.
There is currently no way to automatically generate the visualization -- the best so far is to copy/paste `protocol.config.js` into `@xstate/viz`, and screenshot the visualization.

# Machines

`machine.ts` should export a sample implementation of a machine.
That means that actions and guards need to be defined, and supplied as [options](https://xstate.js.org/docs/guides/machines.html#options) to the machine.
