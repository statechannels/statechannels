import React from "react";
import "./FileInfo.scss";

export type FileInfoProps = { file: any };

const FileInfo: React.FC<FileInfoProps> = ({ file }: FileInfoProps) => {
  return (
    <section className="fileInfo">
      <span className="fileName">{file.filename}</span>
      <span className="fileSize">{file.size}Mb</span>
      <span className="fileCost">Est. cost ${file.cost}</span>
    </section>
  );
};

export { FileInfo };
