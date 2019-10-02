import React, {useState} from 'react';
import {RouteComponentProps} from 'react-router-dom';
import {FormButton} from '../../components/form';
import {TorrentInfo} from '../../components/torrent-info/TorrentInfo';
import {Torrent} from '../../types';
import './Upload.scss';

const UploadStart = ({
  setTorrent,
  torrent
}: {
  setTorrent: (torrent: Torrent) => void;
  torrent: Torrent;
}) => {
  return (
    <section className="section fill">
      <div className="jumbotron-upload"></div>
      <div className="upload-action-bar">
        <label htmlFor="file">Select file to upload</label>
        <input type="file" name="file" id="file" className="inputfile"></input>
        <FormButton
          name="start"
          onClick={() => setTorrent({...torrent, uploaded: 250, length: 350})}
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
  const [torrent, setTorrent] = useState({
    name: 'File_1.dat',
    length: 0,
    numSeeds: 27,
    numPeers: 4,
    cost: 0.5,
    downloaded: 0,
    files: [],
    status: 'Seeding',
    magnetURI: '#'
  } as Torrent);
  return (
    <>
      {!torrent.length ? (
        <UploadStart torrent={torrent} setTorrent={setTorrent} />
      ) : (
        <TorrentInfo torrent={torrent} />
      )}
    </>
  );
};

export default Upload;
