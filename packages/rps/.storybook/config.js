import {configure} from '@storybook/react';

function loadStories() {
  require('../src/__stories__');
  // TODO ^ create an index.tsx file in this location
  // You can require as many stories as you need.
}
configure(loadStories, module);
