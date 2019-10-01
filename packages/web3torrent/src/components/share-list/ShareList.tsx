import React from "react";
import { RoutePath } from "../../routes";
import { ShareFile } from "./share-file/ShareFile";
import "./ShareList.scss";

export type ShareListProps = { files: any[]; history: any };

const ShareList: React.FC<ShareListProps> = ({ files, history }) => {
  return (
    <table className="share-list">
      <tbody>
        {files.length
          ? files.map(file => (
              <ShareFile
                file={file}
                key={file.filename}
                goTo={route => history.push(`${RoutePath.Download}/${route}`)}
              />
            ))
          : false}
      </tbody>
    </table>
  );
};

export { ShareList };
