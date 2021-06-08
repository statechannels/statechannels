import React from 'react';
import {Image as RimbleImage} from 'rimble-ui';

import fakeApp from '../../images/fake-app.png';
import {Layout} from '../layout';

export function renderComponentInFrontOfApp(component) {
  function renderFunction() {
    return (
      <div>
        <RimbleImage src={fakeApp} />
        <Layout>{component}</Layout>
      </div>
    );
  }
  return renderFunction;
}
