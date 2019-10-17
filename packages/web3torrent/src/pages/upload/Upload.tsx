import React, {useState} from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {getTorrentPeers, upload} from '../../clients/web3torrent-client';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {EmptyTorrent} from '../../constants';
import {Torrent} from '../../types';
import torrentStatusChecker from '../../utils/torrent-status-checker';
import {useInterval} from '../../utils/useInterval';
import './Upload.scss';

const UploadStart = ({
  setTorrent,
  torrent
}: {
  setTorrent: (torrent: Torrent) => void;
  torrent: Torrent;
}) => {
  const [file, setFile] = useState();

  return (
    <section className="section fill">
      <div className="jumbotron-upload"></div>
      <div className="upload-action-bar">
        <label htmlFor="file">Select file to upload</label>
        <input
          type="file"
          name="file"
          id="file"
          className="inputfile"
          onChange={event => setFile(event.target.files && event.target.files[0])}
        ></input>
        <FormButton
          name="start"
          onClick={async () => setTorrent({...torrent, ...(await upload(file))})}
        >
          Start
        </FormButton>
      </div>
      <div className="subtitle">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua.
        </p>
      </div>
    </section>
  );
};

const Upload: React.FC<RouteComponentProps> = () => {
  const [torrent, setTorrent] = useState(EmptyTorrent);
  const [peers, setPeers] = useState({});
  useInterval(
    () => {
      setTorrent(torrentStatusChecker(torrent, torrent.infoHash));
      setPeers(getTorrentPeers(torrent.infoHash));
    },
    torrent.status !== 'Idle' && !torrent.destroyed ? 1000 : undefined
  );

  return (
    <>
      {!torrent.length ? (
        <UploadStart torrent={torrent} setTorrent={setTorrent} />
      ) : (
        <TorrentInfo torrent={torrent} peers={peers} />
      )}
    </>
  );
};

export default Upload;
