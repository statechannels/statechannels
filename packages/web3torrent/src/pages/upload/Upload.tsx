import React from "react";
import { RouteComponentProps } from "react-router-dom";
import "./Upload.scss";

const Upload: React.FC<RouteComponentProps> = () => {
  return (
    <section className="section fill">
      <div className="jumbotron-upload"></div>
      {/* TODO: Add File Selector and Start Button */}
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </p>
      </div>
    </section>
  );
};

export default Upload;
