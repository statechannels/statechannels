import React from 'react';
import NavigationBarContainer from "../containers/NavigationBarContainer";

export const ApplicationLayout = (props) => {
  return (
    <div className="w-100">
      <NavigationBarContainer />

      <div className="container centered-container w-100">
        {props.children}
      </div>
    </div>
  );
};
