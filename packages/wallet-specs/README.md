Configs (`protocol.config.json`) are used to generate the visualizations using https://xstate.js.org/viz/.

After updating `protocol.ts`, run `yarn generateConfig` to update `protocol.config.js`.

There is currently no way to automatically generate the visualization -- the best so far is to copy/paste `protocol.config.js` into `@xstate/viz`, and screenshot the visualization.
