import React, { useState, useContext } from 'react';
import ReactDOM from "react-dom";
import "./styles.css";
import webtorrent from "./webtorrent-ilp/webtorrent-custom";

const initialState = { working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0 };

const onProgress = (status, setStatus) => (torrent = initialState, action = "Sharing", done = true) => {
  setStatus({ ...status, working: done ? "Done/Idle" : action, downloadSpeed: torrent.downloadSpeed, uploadSpeed: torrent.uploadSpeed, numPeers: torrent.numPeers })
}

function upload (client, files, setMagnet, onProgress) {
  client.seed(files, function (torrent) {
    setMagnet(torrent.magnetURI);
    console.log("Client is seeding ", torrent);
    torrent.on("wire", () => {
      console.log('Wire!', arguments)
    });
    setInterval(() => onProgress(torrent, "Seeding", false), 1000);
  });
};

function download (client, torrentOrigin, onProgress) {
  var torrentId = torrentOrigin || "https://webtorrent.io/torrents/sintel.torrent";
  client.add(torrentId, function (torrent) {
    console.log("Client is leeching", torrent);
    const intervalHandle = setInterval(() => onProgress(torrent, "Leeching", false), 1000);
    torrent.on("done", () => {
      clearInterval(intervalHandle);
      onProgress(initialState, "Done/Idle");
      console.log('Done!', "File downloaded: " + torrent.files[0].name)
    });
  });
};

function App () {
  const wt = useContext(WebTorrentContext);
  const [status, setStatus] = useState({ working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0 });
  const [seedMagnet, setSeedMagnet] = useState("");
  const [leechMagnet, setLeechMagnet] = useState("");
  const { downloadSpeed, uploadSpeed, working, numPeers } = status;
  return (
    <div className="App">
      <div className="hero" id="hero">
        <h2>Status</h2>
        <div id="status">
          {status.working !== "Done/Idle" ? (
            <>
              <span className="show-leech">{working} </span>
              <span className="show-leech"> with </span>
              <code className="numPeers">{numPeers} peers</code>
              <div>
                <code id="downloadSpeed">{downloadSpeed} b/s</code>/ | <code id="uploadSpeed">{uploadSpeed} b/s</code>
              </div>
            </>
          ) : (<span className="show-leech">Done/Idle </span>)
          }

        </div>
      </div>


      <div className="hero" id="hero-seeder">
        <h2>Seeder</h2>
        <h5>Select a file to seed</h5>
        <br />
        <input type="file" name="upload" onChange={(event) => upload(wt, event.target.files, setSeedMagnet, onProgress(status, setStatus))} />
        <button onClick={() => { console.log('NOT DONE :-P') }}>STOP</button>
        {seedMagnet ? (
          <p>
            <h3>Share this to share the file</h3>
            <code>{seedMagnet}</code>
          </p>
        ) : false}
      </div>


      <div className="hero" id="hero-leecher">
        <h2>Leecher</h2>
        <h5>Insert a magnet URI to download</h5>
        <br />
        <input type="text" name="download" onChange={(event) => setLeechMagnet(event.target.value)} />
        <button onClick={() => download(wt, leechMagnet, onProgress(status, setStatus))}>START DOWNLOAD</button>
      </div>
    </div>
  );
}
const wt = new webtorrent()
const WebTorrentContext = React.createContext({});
const rootElement = document.getElementById("root");
ReactDOM.render(<WebTorrentContext.Provider value={wt}><App /></WebTorrentContext.Provider>, rootElement);
