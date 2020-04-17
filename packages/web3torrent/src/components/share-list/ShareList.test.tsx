import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory, MemoryHistory} from 'history';
import React from 'react';
import {Router} from 'react-router-dom';
import {RoutePath} from '../../routes';
import {ShareList} from './ShareList';
import {calculateWei, prettyPrintWei} from '../../utils/calculateWei';
import prettier from 'prettier-bytes';
import {preseededTorrentsUI} from '../../constants';

Enzyme.configure({adapter: new Adapter()});

describe('<ShareList />', () => {
  let component: Enzyme.ReactWrapper;
  let history: MemoryHistory<{}>;

  beforeEach(() => {
    history = createMemoryHistory();
    component = mount(
      <Router history={history}>
        <ShareList torrents={preseededTorrentsUI} />
      </Router>
    );
  });

  it('renders the list without crashing', () => {
    expect(component.find('table .share-list')).not.toBeNull();
  });

  it("renders the list with all it's torrents data", () => {
    const filesData = component.find('.share-file');
    expect(filesData.length).toBe(preseededTorrentsUI.length);
    const firstFileData = filesData.at(0);
    expect(firstFileData.childAt(0).text()).toBe(preseededTorrentsUI[0].name);
    expect(firstFileData.childAt(1).text()).toBe(prettier(preseededTorrentsUI[0].length));
    expect(firstFileData.childAt(2).text()).toBe(
      prettyPrintWei(calculateWei(preseededTorrentsUI[0].length))
    );
    expect(firstFileData.childAt(5).find('button')).not.toBeNull();
  });

  it('should re-route to Download/:torrent.magnetURI screen when a torrent download button is clicked', () => {
    component
      .find('.share-file')
      .at(0)
      .find('button')
      .simulate('click');
    expect(history.location.pathname).toBe(`${RoutePath.File}${preseededTorrentsUI[0].infoHash}`);
    expect(history.location.search).toBe(
      `?name=${preseededTorrentsUI[0].name}&length=${preseededTorrentsUI[0].length}`
    );
  });
});

describe('<ShareList torrents={[]}/>', () => {
  it('renders an empty list when no torrents file are set', () => {
    const mockHistory = createMemoryHistory();
    const mockComponent = mount(
      <Router history={mockHistory}>
        <ShareList torrents={[]} />
      </Router>
    );

    expect(mockComponent.find('table .share-list')).not.toBeNull();
    const filesData = mockComponent.find('.share-file');
    expect(filesData.length).toBe(0);
  });
});
