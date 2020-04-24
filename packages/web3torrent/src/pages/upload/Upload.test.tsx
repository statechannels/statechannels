import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router} from 'react-router-dom';
import {Status} from '../../types';

import Upload from './Upload';
import {mockMetamask} from '../../library/testing/test-utils';
import {createMockExtendedTorrent} from '../../utils/test-utils';
import {
  mockTorrentClientContext,
  MockContextProvider
} from '../../library/testing/mock-context-provider';
Enzyme.configure({adapter: new Adapter()});

const mockTorrent = createMockExtendedTorrent();

describe('<Upload />', () => {
  let component: Enzyme.ReactWrapper;

  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(() => {
    mockTorrentClientContext.upload = jest
      .fn()
      .mockImplementation(_pD => Promise.resolve({...mockTorrent, status: Status.Seeding}));

    component = mount(
      <Router>
        <MockContextProvider>
          <Upload ready={true} />
        </MockContextProvider>
      </Router>
    );

    jest.useFakeTimers();
  });

  it('should render an Upload button', () => {
    expect(component.find('input.inputfile').exists()).toBe(true);
  });

  it('should run askForFunds functions when the Upload Button is clicked', async () => {
    await act(async () => {
      await component.find('input.inputfile').simulate('change', {
        target: {
          files: ['dummyValue.something']
        }
      });
    });
    expect(mockTorrentClientContext.upload).toHaveBeenCalled();
  });
});
