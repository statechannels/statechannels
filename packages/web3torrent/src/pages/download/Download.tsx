import React from "react";
import { RouteComponentProps } from "react-router-dom";
import { FileInfo } from "../../components/file-info/FileInfo";
import { FormButton } from "../../components/form";
import "./Download.scss";

const Download: React.FC<RouteComponentProps> = () => {
  return (
    <section className="section fill">
      <FileInfo file={{ filename: "Sample_1.dat", size: 350, seeders: 27, peers: 350, cost: 0.5 }} />
      <FormButton name="download" onClick={() => null}>
        Start Download
      </FormButton>
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </p>
      </div>
    </section>
  );
};

export default Download;
