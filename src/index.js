import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./styles.css";
import WebTorrent from "./webtorrent-custom";
import prettierBytes from "prettier-bytes";
const client = new WebTorrent()

export const InitialState = {
  working: "Done/Idle",
  verb: "from",
  numPeers: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  torrent: null,
  files: []
};

const progressLogger = (logger, status, setStatus, setMagnet) => (torrent = InitialState) => {
  clearInterval(logger);
  let torrentIsDone, isSeeder
  logger = setInterval(() => {
    torrentIsDone = torrent.done && !torrent.downloadSpeed && !torrent.uploadSpeed;
    isSeeder = torrent.created;

    setStatus({
      ...status,
      torrent, // assuming there's only ONE torrent at play
      working: torrentIsDone ? "Done/Idle" : isSeeder ? "Seeding" : "Leeching",
      downloadSpeed: prettierBytes(torrent.downloadSpeed),
      uploadSpeed: prettierBytes(torrent.uploadSpeed),
      numPeers: torrent.numPeers
    })

    if (torrentIsDone) {
      isSeeder ?
        setMagnet(torrent.magnetURI) :
        torrent.files[0].getBlobURL((err, url) => { // assuming that the torrent has only ONE file
          setStatus(Object.assign(InitialState, { url, filename: torrent.files[0].name }));
          clearInterval(logger);
        });
    }
  }, 500);
};

function App () {
  let loggerId;
  const [status, setStatus] = useState(InitialState);
  const [seedMagnet, setSeedMagnet] = useState("");
  const [leechMagnet, setLeechMagnet] = useState("");
  const log = progressLogger(loggerId, status, setStatus, setSeedMagnet);
  return (
    <div className="App">
      <div className="hero" id="hero">
        <h2>Status</h2>
        <div id="status">
          {
            status.working !== "Done/Idle" ?
              <>
                <span className="show-leech">{status.working} </span>
                <span className="show-leech"> with </span>
                <code className="numPeers">{status.numPeers} peers</code>
                <div>
                  <code id="downloadSpeed">{status.downloadSpeed}/s</code> |{" "}
                  <code id="uploadSpeed">{status.uploadSpeed}/s</code>
                </div>
              </> :
              <span className="show-leech">Done/Idle </span>
          }
        </div>
      </div>

      <div className="hero" id="hero-seeder">
        <h2>Seeder</h2>
        <h4>Select a file</h4>
        <br />
        <input type="file" onChange={event => client.seed(event.target.files, torrent => log(torrent))} />
        {
          Object.entries(client.allowedPeers).map(([infoHash, allowedPeers]) =>
            <div key={infoHash}>
              <h5>Torrent {infoHash} Clients</h5>
              {
                Object.values(allowedPeers).map(({ id, allowed }) =>
                  <button key={id}
                    className={"peerStatus-" + allowed}
                    onClick={() => client.togglePeer(infoHash, id)}>
                    {allowed ? "Allowed" : "Choking"}: {id}
                  </button>
                )
              }
            </div>
          )
        }
        <br />
        {
          !seedMagnet ?
            false :
            <div className="magnetLink" title="Copy and share this so that others can download the file" >
              <h5>Magnet Link</h5>
              {seedMagnet}
            </div>
        }
      </div>

      <div className="hero" id="hero-leecher">
        <h2>Leecher</h2>
        <h5>Insert a magnet URI to download</h5>
        <input type="text" name="download" onChange={event => setLeechMagnet(event.target.value)} />
        <br />
        {
          !!status.url ?
            <a href={status.url} download={status.filename}> Download {status.filename}</a> :
            <div>
              <button onClick={() => client.add(leechMagnet, torrent => log(torrent))}>
                START DOWNLOAD
            </button>
            </div>
        }
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
