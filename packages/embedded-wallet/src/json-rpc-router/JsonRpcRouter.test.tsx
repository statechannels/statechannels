import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React, {ReactNode} from 'react';
import {act} from 'react-dom/test-utils';
import {simulateMessage} from '../test-utils';
import {JsonRpcRoute} from './JsonRpcRoute';
import {JsonRpcRouter} from './JsonRpcRouter';

Enzyme.configure({adapter: new Adapter()});

const mockJsonRpcRouter = (children: ReactNode): ReactWrapper => {
  return mount(<JsonRpcRouter>{children}</JsonRpcRouter>);
};

const FooComponent: React.FC = () => <label data-foo-rendered>Foo</label>;
const Foo2Component: React.FC = () => <label data-foo2-rendered>Foo</label>;
const BarComponent: React.FC = () => <label data-bar-rendered>Bar</label>;

describe('JsonRpcRouter', () => {
  let router: ReactWrapper;

  beforeEach(() => {
    router = mockJsonRpcRouter(
      <>
        <JsonRpcRoute method="foo" component={FooComponent} />
        <JsonRpcRoute method="foo" component={Foo2Component} />
        <JsonRpcRoute method="bar" component={BarComponent} />
      </>
    );
  });

  it('should render FooComponent when receiving `foo` via postMessage', async () => {
    await act(async () => {
      await simulateMessage(router, {jsonrpc: '2.0', method: 'foo'});
    });

    expect(router.find('[data-foo-rendered]').exists()).toEqual(true);
    expect(router.find('[data-bar-rendered]').exists()).toEqual(false);
  });

  it('should render FooComponent and Foo2Component when receiving `foo` via postMessage', async () => {
    await act(async () => {
      await simulateMessage(router, {jsonrpc: '2.0', method: 'foo'});
    });

    expect(router.find('[data-foo-rendered]').exists()).toEqual(true);
    expect(router.find('[data-foo2-rendered]').exists()).toEqual(true);
    expect(router.find('[data-bar-rendered]').exists()).toEqual(false);
  });

  it('should render Barponent when receiving `bar` via postMessage', async () => {
    await act(async () => {
      await simulateMessage(router, {jsonrpc: '2.0', method: 'bar'});
    });

    expect(router.find('[data-bar-rendered]').exists()).toEqual(true);
    expect(router.find('[data-foo-rendered]').exists()).toEqual(false);
  });

  it('should render nothing when receiving a non-registered request', async () => {
    await act(async () => {
      await simulateMessage(router, {jsonrpc: '2.0', method: 'vader'});
    });

    expect(router.find('[data-bar-rendered]').exists()).toEqual(false);
    expect(router.find('[data-foo-rendered]').exists()).toEqual(false);
  });

  it('should wrap the handling component in a <main> tag', async () => {
    await act(async () => {
      await simulateMessage(router, {jsonrpc: '2.0', method: 'bar'});
    });

    expect(router.find("main[data-test-selector='handler:bar']").exists()).toEqual(true);
  });
});
