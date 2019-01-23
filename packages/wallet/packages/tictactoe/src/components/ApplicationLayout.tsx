import React from 'react';
import NavigationBarContainer from "../containers/NavigationBarContainer";

import MAGMO_LOGO from '../images/magmo_logo.svg';

export const ApplicationLayout = (props) => {
  return (
    <div className="w-100">
      <NavigationBarContainer />

      <div className="container centered-container w-100 mb-5">
        {props.children}
      </div>

      <div className="footer-logo-container">
        <img src={MAGMO_LOGO} className="magmo-logo"/> <br/>
            <small className="text-white">
                Something not working? Email us at <a href="mailto:oops@magmo.com">oops@magmo.com</a>
            </small>
      </div>

    </div>
  );
};
