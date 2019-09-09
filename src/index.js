import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./styles.css";
import WebTorrent, { ClientEvents } from "./webtorrent-custom";
import prettierBytes from "prettier-bytes";

const initialState = {
  working: "Done/Idle",
  verb: "from",
  numPeers: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  torrent: null,
  files: []
};
const initialClient = new WebTorrent({ pseAccount: Math.floor(Math.random() * 99999999999999999) })

const progressLogger = (logger, status, setStatus) => (torrent = initialState, action = "Idle", torrentIsDone, torrrentFile) => {
  clearInterval(logger);
  logger = setInterval(() => {
    torrentIsDone = torrent && torrent.done && !torrent.downloadSpeed && !torrent.uploadSpeed;
    torrrentFile = torrent && torrent.files && torrent.files[0];

    setStatus({
      ...status,
      working: torrentIsDone ? "Done/Idle" : action,
      downloadSpeed: prettierBytes(torrent.downloadSpeed),
      uploadSpeed: prettierBytes(torrent.uploadSpeed),
      numPeers: torrent.numPeers
    })

    if (torrentIsDone && !torrent.created && torrrentFile && torrrentFile.done) {
      torrrentFile.getBlobURL((err, url) => {
        setStatus(Object.assign(initialState, { url, filename: torrrentFile.name }));
        clearInterval(logger);
      });
    }
  }, 500);
};

const upload = (client, files, setMagnet, progressLogger, setAllowedPeers) => {
  client.on(ClientEvents.PEER_STATUS_CHANGED, ({ allowedPeers }) => setAllowedPeers(allowedPeers))
  client.seed(files, (torrent) => {
    setMagnet(torrent.magnetURI);
    progressLogger(torrent, "Seeding");
  });
};

const download = (client, torrentOrigin, progressLogger, setClient) => {
  var torrentId = torrentOrigin || "https://webtorrent.io/torrents/sintel.torrent";
  client.on(ClientEvents.CLIENT_RESET, torrent => progressLogger(torrent, "Leeching"));
  client.add(torrentId, torrent => progressLogger(torrent, "Leeching"));
};


function App () {
  let logger;
  const [client, setClient] = useState(initialClient);
  const [status, setStatus] = useState(initialState);
  const [seedMagnet, setSeedMagnet] = useState("");
  const [allowedPeers, setAllowedPeers] = useState({});
  const [leechMagnet, setLeechMagnet] = useState("");

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
          onChange={event =>
            upload(
              client,
              event.target.files,
              setSeedMagnet,
              progressLogger(logger, status, setStatus),
              setAllowedPeers
            )
          }
        />
        {
          Object.values(allowedPeers).map(({ id, allowed }) => {
            return (
              <React.Fragment key={id}>
                <br />
                <button onClick={() => client.togglePeer(id)}>
                  {id} - {allowed ? "" : "NOT"} Allowed
                </button>
              </React.Fragment>
            );
          })
        }
        {seedMagnet ? (
          <p>
            <h3>Share this to share the file</h3>
            <code>{seedMagnet}</code>
          </p>
        ) : (
            false
          )}
      </div>

      <div className="hero" id="hero-leecher">
        <h2>Leecher</h2>
        <h5>Insert a magnet URI to download</h5>
        <br />
        <input
          type="text"
          name="download"
          onChange={event => setLeechMagnet(event.target.value)}
        />
        <br />

        {!!status.url ?
          <>
            <br />
            <a href={status.url} download={status.filename}>Download {status.filename}</a>
          </>
          : <button
            onClick={() =>
              download(
                client,
                leechMagnet,
                progressLogger(logger, status, setStatus),
                setClient
              )
            }
          >
            START DOWNLOAD
        </button>}

      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
