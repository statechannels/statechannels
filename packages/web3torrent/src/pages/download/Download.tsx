import React, { useState } from "react";
import { RouteComponentProps } from "react-router-dom";
import { FileInfo } from "../../components/file-info/FileInfo";
import { FormButton } from "../../components/form";
import "./Download.scss";

const mockDownload = (file, setFile) => {
  for (let i = 0; i * 20 <= file.size + 19; i++) {
    setTimeout(() => {
      setFile({ ...file, downloaded: i * 20 > file.size ? file.size : i * 20 });
    }, i * 800);
  }
};

const Download: React.FC<RouteComponentProps> = () => {
  const [file, setFile] = useState({
    filename: "Sample_1.dat",
    size: 350,
    seeders: 27,
    peers: 350,
    cost: 0.5,
    downloaded: 0
  });

  return (
    <section className="section fill download">
      <FileInfo file={file} />
      {!file.downloaded ? (
        <>
          <FormButton name="download" onClick={() => mockDownload(file, setFile)}>
            Start Download
          </FormButton>
          <div className="subtitle">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
              dolore magna aliqua.
            </p>
          </div>
        </>
      ) : (
        false
      )}
    </section>
  );
};

export default Download;
