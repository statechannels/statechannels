import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

// Load environment variables from .env
import './env';

Enzyme.configure({adapter: new Adapter()});
