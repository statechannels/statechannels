import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, MemoryHistory} from 'history';
import React from 'react';
import {Router} from 'react-router-dom';
import {RoutePath} from '../../../routes';
import {testSelector} from '../../../utils/test-utils';
import {LayoutHeader} from './LayoutHeader';

Enzyme.configure({adapter: new Adapter()});

describe('<LayoutHeader />', () => {
  let component: Enzyme.ReactWrapper;
  let history: MemoryHistory<{}>;

  beforeEach(() => {
    history = createMemoryHistory();
    component = mount(
      <Router history={history}>
        <LayoutHeader />
      </Router>
    );
  });

  it('renders the header with the logo and the upload button', () => {
    expect(component.find('.logo-container > .logo')).not.toBeNull();
    expect(component.find('.header-content > .actions-container')).not.toBeNull();
    expect(component.find('.header-content > .actions-container .button')).not.toBeNull();
  });

  it('should re-route to Upload screen upon Upload Button click', () => {
    component.find(testSelector('upload-button')).simulate('click');
    expect(history.location.pathname).toBe(RoutePath.Upload);
  });
});
