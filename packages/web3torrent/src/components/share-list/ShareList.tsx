import React from "react";
import { ShareFile } from "./share-file/ShareFile";
import "./ShareList.scss";

export type ShareListProps = { files: any[] };

const ShareList: React.FC<ShareListProps> = ({ files }: ShareListProps) => {
  return (
    <table className="share-list">
      <tbody>{files.length ? files.map(file => <ShareFile file={file} />) : false}</tbody>
    </table>
  );
};

export { ShareList };
