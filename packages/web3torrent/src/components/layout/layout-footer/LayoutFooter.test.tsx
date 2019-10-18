import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory} from 'history';
import React from 'react';
import {MemoryRouter as Router, RouteComponentProps} from 'react-router-dom';
import {LayoutFooter} from './LayoutFooter';

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
      <LayoutFooter {...props} />
    </Router>
  );

  return {props, component};
}

describe('<LayoutFooter />', () => {
  let component: Enzyme.ReactWrapper;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
  });

  it('renders the header with the logo and the upload button', () => {
    expect(component.find('footer')).not.toBeNull();
    expect(component.find('footer-logo')).not.toBeNull();
  });
});
