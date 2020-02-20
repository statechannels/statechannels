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
      <LayoutHeader {...props} />
    </Router>
  );

  return {props, component};
}

describe('<LayoutHeader />', () => {
  let component: Enzyme.ReactWrapper;
  let props: RouteComponentProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    props = mock.props;
  });

  it('renders the header with the logo and the upload button', () => {
    expect(component.find('.logo-container > .logo')).not.toBeNull();
    expect(component.find('.header-content > .actions-container')).not.toBeNull();
    expect(component.find('.header-content > .actions-container .button')).not.toBeNull();
  });
});
