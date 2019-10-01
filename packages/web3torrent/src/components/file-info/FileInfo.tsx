import React from "react";
import { FormButton } from "../form";
import "./FileInfo.scss";
import { ProgressBar } from "./progress-bar/ProgressBar";

export type FileInfoProps = { file: any };

const FileInfo: React.FC<FileInfoProps> = ({ file }: FileInfoProps) => {
  return (
    <>
      <section className={`fileInfo ${file.link ? " with-link" : ""}`}>
        <span className="fileName">{file.filename}</span>
        <span className="fileSize">{file.size}Mb</span>
        {file.status ? <span className="fileStatus">{file.status}</span> : false}
        <span className="fileCost">Est. cost ${file.cost}</span>
        {file.link ? (
          <a href={file.link} className="fileLink">
            Share Link
          </a>
        ) : (
          false
        )}
      </section>
      {!file.downloaded ? (
        false
      ) : (
        <section className="downloadingInfo">
          <ProgressBar
            downloaded={file.downloaded}
            size={file.size}
            status={file.downloaded !== file.size ? "Downloading" : "Completed"}
          />
          <p>
            ETA 1m30s. 500Kbits/s down, 500Kbits/s up <br />
            Connected to <strong>10</strong> peers.
          </p>
          {file.downloaded !== file.size ? (
            false
          ) : (
            <FormButton name="save-download" onClick={() => null}>
              Save Download
            </FormButton>
          )}
        </section>
      )}
      {!file.peersConnected ? (
        false
      ) : (
        <section className="uploadingInfo">
          <p>
            Total Received: <strong>$1.34</strong>
            <br />
            <strong>{file.peersConnected}</strong> Peers connected
          </p>
        </section>
      )}
    </>
  );
};

export { FileInfo };
