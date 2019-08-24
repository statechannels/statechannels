import React, { useState, useContext } from 'react';
import ReactDOM from "react-dom";
import "./styles.css";
import webtorrent from "./webtorrent-ilp/webtorrent-custom";

const initialState = { working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0, torrent: null };

const progressLogger = (status, setStatus) => (torrent = initialState, action = "Idle", done = true, file) => {
  if (!file) {
    return setInterval(() =>
      setStatus({
        ...status,
        working: done ? "Done/Idle" :
          action,
        downloadSpeed: torrent.downloadSpeed,
        uploadSpeed: torrent.uploadSpeed,
        numPeers: torrent.numPeers
      })
      , 1000)
  } else {
    file.getBlobURL((err, url) => {
      if (err) console.error(err, url)
      setStatus({ working: done ? "Done/Idle" : action, url, filename: file.name })
    })
  }
}

const upload = (client, files, setMagnet, progressLogger, allowedPeers, updateAllowedPeers) => {
  client.seed(files, function (torrent) {
    setMagnet(torrent.magnetURI);
    torrent.on("wire", (wire) => {
      wire.on('first_request', (peerAccount) => {
        console.log("UI - NEW WIRE FROM " + peerAccount, allowedPeers);
        if ((peerAccount in allowedPeers) && !allowedPeers[peerAccount].allowed) {
          console.log('UI - ALREADY BLOCKED WIRE FROM ' + peerAccount, allowedPeers);
          client.sendNotice(wire, peerAccount);
        } else {
          console.log('UI - SEEMS LEGIT WIRE ' + peerAccount, allowedPeers);
          updateAllowedPeers({ id: peerAccount, allowed: true, wire });
        }
      })
    });
    progressLogger(torrent, "Seeding", false);
  });
};

const download = (client, torrentOrigin, progressLogger) => {
  var torrentId = torrentOrigin || "https://webtorrent.io/torrents/sintel.torrent";
  client.add(torrentId, (torrent) => {
    console.log("UI - Download Started - MY account id is", client, torrent);
    const logger = progressLogger(torrent, "Leeching", false)
    torrent.on("notice", (wire, notice) => {
      if (notice === 'start') {
        clearInterval(logger);
        client.destroy();
        client = new webtorrent({ ilp_acccount: client.ilp_account });
        download(client, torrentOrigin, progressLogger);
      }
    })
    torrent.on("done", () => {
      console.log('Done!', "File downloaded: " + torrent.files[0].name)
      clearInterval(logger);
      progressLogger(initialState, "Done/Idle", true, torrent.files[0]);
    });
  });
};

const togglePeer = (client, peerAccount, allowedPeers, updateAllowedPeers) => {
  if (!allowedPeers.hasOwnProperty(peerAccount)) {
    console.error("That peer account doesnt exist in the list");
    return;
  }
  const { wire, allowed } = allowedPeers[peerAccount];
  if (allowed) {
    client.sendNotice(wire, peerAccount);
  } else {
    client.retractNotice(wire, peerAccount);
  }
  updateAllowedPeers({ id: peerAccount, allowed: !allowed, wire });
};

const updatePeers = (allowedPeers, setAllowedPeers) => (peer) => {
  const newState = { ...allowedPeers, [peer.id]: peer };
  setAllowedPeers(newState);
  return newState;
};

function App () {
  const client = useContext(WebTorrentContext);
  const [status, setStatus] = useState({ working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0, torrent: undefined });
  const [seedMagnet, setSeedMagnet] = useState("");
  const [allowedPeers, setAllowedPeers] = useState({});

  const [leechMagnet, setLeechMagnet] = useState("");
  const { downloadSpeed, uploadSpeed, working, numPeers } = status;
  const updateAllowedPeers = updatePeers(allowedPeers, setAllowedPeers);
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
        <input type="file" name="upload"
          onChange={(event) =>
            upload(client, event.target.files, setSeedMagnet, progressLogger(status, setStatus), allowedPeers, updateAllowedPeers)
          }
        />
        {status.working !== "Done/Idle" && status.numPeers ? (
          Object.values(allowedPeers).map(({ id, allowed }) => {
            return (
              <React.Fragment key={id}>
                <br />
                <button onClick={() => { togglePeer(client, id, allowedPeers, updateAllowedPeers) }}>
                  - {id} - allowed: {JSON.stringify(allowed)}
                </button>
              </React.Fragment>)
          })) : false}
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
        <button onClick={() => download(client, leechMagnet, progressLogger(status, setStatus), allowedPeers, setAllowedPeers)}>START DOWNLOAD</button>
        <a href={status.url} download={status.filename}>Download {status.filename}</a>
      </div>
    </div>
  );
}
const wt = new webtorrent({ ilp_acccount: Math.floor(Math.random() * 99999999999999999) })
const WebTorrentContext = React.createContext({});
const rootElement = document.getElementById("root");
ReactDOM.render(<WebTorrentContext.Provider value={wt}><App /></WebTorrentContext.Provider>, rootElement);
