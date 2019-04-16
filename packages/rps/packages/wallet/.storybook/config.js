import { configure } from '@storybook/react';

const req = require.context('../src', true, /stories\.tsx?$/);

function loadStories() {
  require('../src/__stories__');
  req.keys().map(req);
  // You can require as many stories as you need.
}
configure(loadStories, module);
