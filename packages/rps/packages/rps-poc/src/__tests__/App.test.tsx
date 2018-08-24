import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { shallow } from 'enzyme';

import App from '../App';

test('App renders a router', () => {
	const wrapper = shallow(<App isAuthenticated={true}/>);
	expect(wrapper.find(BrowserRouter).length).toEqual(1);
});
