import React, {ReactElement} from 'react';
import ReactDOM from 'react-dom';
import {Spinner} from './Spinner';

describe('<Spinner />', () => {
  let container: HTMLDivElement;
  let spinner: HTMLDivElement;

  const render = (element: ReactElement) => {
    ReactDOM.render(element, container);
    spinner = container.querySelector('div.spinner') as HTMLDivElement;
  };

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders without crashing', () => {
    render(<Spinner />);
    expect(spinner).toBeDefined();
  });

  it('renders a spinner with default properties', () => {
    render(<Spinner />);
    expect(spinner.className.trim()).toBe(
      'spinner spinner--circle spinner--color-black spinner--hidden'
    );
  });

  it('renders a visible button when visible prop is true', () => {
    render(<Spinner visible={true} />);
    expect(spinner.className.trim()).toBe('spinner spinner--circle spinner--color-black');
  });

  it('renders a spinner with alternative style', () => {
    render(<Spinner type="dots" />);
    expect(spinner.className.trim()).toBe('spinner spinner--loading spinner--hidden');
  });

  it('renders a spinner with alternative style', () => {
    render(<Spinner type="dots" visible={true} />);
    expect(spinner.className.trim()).toBe('spinner spinner--loading');
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
});
