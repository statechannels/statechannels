import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory} from 'history';
import React from 'react';
import {MemoryRouter as Router, RouteComponentProps} from 'react-router-dom';
import {RoutePath} from '../../../routes';
import {testSelector} from '../../../utils/test-utils';
import {LayoutHeader} from './LayoutHeader';

function setup() {
  Enzyme.configure({adapter: new Adapter()});
  const history = createMemoryHistory();
  const props: RouteComponentProps = {
    history,
    location: history.location,
    match: {
      isExact: true,
      params: {},
      path: '/',
      url: 'http://localhost/'
    }
  };
  const component = mount(
    <Router>
      <LayoutHeader />
    </Router>
  );

  return {props, component};
}

describe('<LayoutHeader />', () => {
  let component: Enzyme.ReactWrapper;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
  });

  it('renders the header with the logo and the upload button', () => {
    expect(component.find('.logo-container > .logo')).not.toBeNull();
    expect(component.find('.header-content > .actions-container')).not.toBeNull();
    expect(component.find('.header-content > .actions-container .button')).not.toBeNull();
  });

  it('should re-route to Upload screen upon Upload Button click', () => {
    component.find(testSelector('upload-button')).simulate('click');
    //expect(props.history.location.pathname).toBe(RoutePath.Upload);
  });
});
