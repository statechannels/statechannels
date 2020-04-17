import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {TorrentFile} from 'webtorrent';
import {createMockTorrentUI} from '../../../utils/test-utils';
import {DownloadLink} from './DownloadLink';
import {mockMetamask} from '../../../library/testing/test-utils';

Enzyme.configure({adapter: new Adapter()});

const mockTorrent = createMockTorrentUI({
  downloaded: 128913,
  done: true,
  files: [({getBlobURL: resolve => resolve(null, 'blob')} as unknown) as TorrentFile]
});

describe('<DownloadLink />', () => {
  let component: Enzyme.ReactWrapper;

  beforeAll(() => {
    mockMetamask();
    document.execCommand = jest.fn(() => true);
    component = mount(<DownloadLink torrent={createMockTorrentUI()} />);
  });

  it('by default should be hidden', () => {
    expect(component.find('.button').exists()).toBe(false);
  });
});

describe('<DownloadLink Complete/>', () => {
  let component: Enzyme.ReactWrapper;

  beforeAll(async () => {
    await act(async () => {
      component = await mount(<DownloadLink torrent={mockTorrent} />);
    });
  });

  it('can show a Save Download link when finished', async () => {
    const downloadLink = component.find('.button');
    expect(downloadLink.exists()).toEqual(true);
    expect(downloadLink.prop('download')).toEqual(mockTorrent.name);
    expect(downloadLink.text()).toEqual('Save Download');
  });
});
