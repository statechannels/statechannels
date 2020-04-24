import {configure, addDecorator} from '@storybook/react';
import React from 'react';
import {StorybookMockContextProvider} from './mock-context-provider';

configure(require.context('../src', true, /\.stories\.tsx$/), module);

const contextWrapper = storyFn => (
  <StorybookMockContextProvider>{storyFn()}</StorybookMockContextProvider>
);

addDecorator(contextWrapper);
