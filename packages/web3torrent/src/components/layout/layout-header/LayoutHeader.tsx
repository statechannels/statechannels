import React from "react";
import { FormButton } from "../../form";

import { RouteComponentProps } from "react-router-dom";
import { RoutePath } from "../../../routes";

import "./LayoutHeader.scss";

const LayoutHeader: React.FC<RouteComponentProps> = props => {
  return (
    <header className="header">
      <nav className="header-content">
        <div className="header-logo"></div>
        <div className="actions-container">
          <FormButton name="setup" onClick={() => props.history.push(RoutePath.Root)}>
            Upload
          </FormButton>{" "}
        </div>
      </nav>
    </header>
  );
};

export { LayoutHeader };
