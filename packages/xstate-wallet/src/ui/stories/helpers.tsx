import React from 'react';

import fakeApp from '../../images/fake-app.png';
import {Image} from 'rimble-ui';
import {Layout} from '../layout';

export function renderComponentInFrontOfApp(component) {
  function renderFunction() {
    return (
      <div>
        <Image src={fakeApp} />
        <Layout>{component}</Layout>
      </div>
    );
  }
  return renderFunction;
}
