import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory} from 'history';
import React from 'react';
import {MemoryRouter as Router} from 'react-router-dom';
import {mockTorrents} from '../../constants';
import {RoutePath} from '../../routes';
import {ShareList, ShareListProps} from './ShareList';
import {calculateWei} from '../../utils/calculateWei';
import prettier from 'prettier-bytes';

function setup(withNoTorrents = false) {
  Enzyme.configure({adapter: new Adapter()});
  const history = createMemoryHistory();
  const props: ShareListProps = {
    history,
    torrents: withNoTorrents ? [] : mockTorrents
  };
  const component = mount(
    <Router>
      <ShareList {...props} />
    </Router>
  );

  return {props, component};
}

describe('<ShareList />', () => {
  let component: Enzyme.ReactWrapper;
  let props: ShareListProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    props = mock.props;
  });

  it('renders the list without crashing', () => {
    expect(component.find('table .share-list')).not.toBeNull();
  });

  it("renders the list with all it's torrents data", () => {
    const filesData = component.find('.share-file');
    expect(filesData.length).toBe(props.torrents.length);
    const firstFileData = filesData.at(0);
    expect(firstFileData.childAt(0).text()).toBe(props.torrents[0].name);
    expect(firstFileData.childAt(1).text()).toBe(prettier(props.torrents[0].length));
    expect(firstFileData.childAt(2).text()).toBe(props.torrents[0].numPeers + 'S');
    expect(firstFileData.childAt(3).text()).toBe(props.torrents[0].numPeers + 'P');
    expect(firstFileData.childAt(4).text()).toBe(calculateWei(props.torrents[0].length));
    expect(firstFileData.childAt(5).find('button')).not.toBeNull();
  });

  it('should re-route to Download/:torrent.magnetURI screen when a torrent download button is clicked', () => {
    component
      .find('.share-file')
      .at(0)
      .find('button')
      .simulate('click');
    expect(props.history.location.pathname).toBe(`${RoutePath.File}`);
    expect(props.history.location.hash).toBe(`#${props.torrents[0].magnetURI}`);
  });
});

describe('<ShareList torrents={[]}/>', () => {
  it('renders an empty list when no torrents file are set', () => {
    const mock = setup(true);
    expect(mock.component.find('table .share-list')).not.toBeNull();
    const filesData = mock.component.find('.share-file');
    expect(filesData.length).toBe(0);
  });
});
