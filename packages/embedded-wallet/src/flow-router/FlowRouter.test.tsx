import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Switch} from 'react-router';
import {BrowserRouter} from 'react-router-dom';
import {FlowRouter} from './FlowRouter';

Enzyme.configure({adapter: new Adapter()});

describe('FlowRouter', () => {
  let router: ReactWrapper;

  beforeEach(() => {
    router = mount(<FlowRouter initialPath="/my-flow" />);
  });

  it('should contain a BrowserRouter', () => {
    expect(router.find(BrowserRouter).exists()).toEqual(true);
  });

  it('should contain a Switch to implement the auto-redirect', () => {
    expect(router.find(Switch).exists()).toEqual(true);
  });

  it('should auto-redirect to the initial path', () => {
    expect(window.location.href).toMatch(/my-flow$/);
  });
});
