import React from "react";
import { RoutePath } from "../../routes";
import { ShareFile } from "./share-file/ShareFile";
import "./ShareList.scss";
import { History } from "history";
import { Torrent } from "../../types";

export type ShareListProps = { torrents: Torrent[]; history: History };

const ShareList: React.FC<ShareListProps> = ({ torrents, history }) => {
  return (
    <table className="share-list">
      <tbody>
        {torrents.length
          ? torrents.map(file => (
              <ShareFile file={file} key={file.name} goTo={route => history.push(`${RoutePath.Download}/${route}`)} />
            ))
          : false}
      </tbody>
    </table>
  );
};

export { ShareList };
