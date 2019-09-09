import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./styles.css";
import WebTorrent, { ClientEvents, InitialState } from "./webtorrent-custom";
import prettierBytes from "prettier-bytes";
const client = new WebTorrent()

const progressLogger = (logger, status, setStatus, setMagnet) => (torrent = InitialState) => {
  clearInterval(logger);
  let torrentIsDone, isSeeder
  logger = setInterval(() => {
    torrentIsDone = torrent.done && !torrent.downloadSpeed && !torrent.uploadSpeed;
    isSeeder = torrent.created;

    setStatus({
      ...status,
      working: torrentIsDone ? "Done/Idle" : isSeeder ? "Seeding" : "Leeching",
      downloadSpeed: prettierBytes(torrent.downloadSpeed),
      uploadSpeed: prettierBytes(torrent.uploadSpeed),
      numPeers: torrent.numPeers
    })

    if (torrentIsDone) {
      isSeeder ?
        setMagnet(torrent.magnetURI) :
        torrent.files[0].getBlobURL((err, url) => {
          setStatus(Object.assign(InitialState, { url, filename: torrent.files[0].name }));
          clearInterval(logger);
        });
    }
  }, 500);
};

const upload = (files, log, setAllowedPeers) => {
  client.on(ClientEvents.PEER_STATUS_CHANGED, ({ allowedPeers }) => setAllowedPeers(allowedPeers))
  client.seed(files, (torrent) => log(torrent));
};

function App () {
  let loggerId;
  const [status, setStatus] = useState(InitialState);
  const [seedMagnet, setSeedMagnet] = useState("");
  const [allowedPeers, setAllowedPeers] = useState({});
  const [leechMagnet, setLeechMagnet] = useState("");
  const log = progressLogger(loggerId, status, setStatus, setSeedMagnet);

  return (
    <div className="App">
      <div className="hero" id="hero">
        <h2>Status</h2>
        <div id="status">
          {status.working !== "Done/Idle" ? (
            <>
              <span className="show-leech">{status.working} </span>
              <span className="show-leech"> with </span>
              <code className="numPeers">{status.numPeers} peers</code>
              <div>
                <code id="downloadSpeed">{status.downloadSpeed}/s</code> |{" "}
                <code id="uploadSpeed">{status.uploadSpeed}/s</code>
              </div>
            </>
          ) : (
              <span className="show-leech">Done/Idle </span>
            )}
        </div>
      </div>

      <div className="hero" id="hero-seeder">
        <h2>Seeder</h2>
        <h5>Select a file to seed</h5>
        <br />
        <input
          type="file"
          name="upload"
          onChange={event => upload(event.target.files, log, setAllowedPeers)}
        />
        {Object.values(allowedPeers).map(({ id, allowed }) =>
          <button className={"peerStatus-" + allowed} key={id} onClick={() => client.togglePeer(id)}>{id}</button>
        )}
        {!seedMagnet ?
          false :
          <div className="magnetLink" title="Copy and share this so that others can download the file" >{seedMagnet}</div>
        }
      </div>

      <div className="hero" id="hero-leecher">
        <h2>Leecher</h2>
        <h5>Insert a magnet URI to download</h5>
        <input type="text" name="download" onChange={event => setLeechMagnet(event.target.value)} />
        <br />
        {!!status.url ?
          <a href={status.url} download={status.filename}> Download {status.filename}</a> :
          <div>
            <button onClick={() => client.add(leechMagnet || "https://webtorrent.io/torrents/sintel.torrent", torrent => log(torrent))}>
              START DOWNLOAD
          </button>
          </div>
        }
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
