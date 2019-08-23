import React, { useState, useContext } from 'react';
import ReactDOM from "react-dom";
import "./styles.css";
import webtorrent from "./webtorrent-ilp/webtorrent-custom";

const initialState = { working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0, torrent: null };

const onProgress = (status, setStatus) => (torrent = initialState, action = "Sharing", done = true) => {
  setStatus({ ...status, working: done ? "Done/Idle" : action, downloadSpeed: torrent.downloadSpeed, uploadSpeed: torrent.uploadSpeed, numPeers: torrent.numPeers, torrent })
}

function upload (client, files, setMagnet, onProgress) {

  client.seed(files, function (torrent) {
    setMagnet(torrent.magnetURI);
    const peersConected = []
    torrent.on("wire", (wire) => {
      console.log("UI - WIRE");
      wire.on('first_request', (peerAccount) => {
        console.log("UI - WIRE", peerAccount, "()-> first request");
        if (!peersConected.some(account => account === peerAccount)) {
          console.log('UI - PIRATE WIRE', peerAccount);
          peersConected.push(peerAccount);
          client.sendNotice(torrent, wire);
          setTimeout(() => { client.retractNotice(torrent, wire, peersConected[0]); }, 5000);
        } else {
          console.log('UI - LEGIT WIRE', peerAccount);
        }

      })
    });
    setInterval(() => onProgress(torrent, "Seeding", false), 1000);
  });
};

function download (client, torrentOrigin, onProgress) {
  var torrentId = torrentOrigin || "https://webtorrent.io/torrents/sintel.torrent";
  console.log('------> RESTARRRRRT', { ilp_account: client.ilp_account, peerId: client.peerId })

  client.add(torrentId, (torrent) => {
    console.log("UI - Download Started ", { ilp_account: torrent.client.ilp_account, peerId: torrent.client.peerId }, { ilp_account: client.ilp_account, peerId: client.peerId });
    const logger = setInterval(() => { onProgress(torrent, "Leeching", false) }, 2000);

    torrent.on("notice", (wire, notice) => {
      if (notice === 'start') {
        console.log()
        console.log('about to destroy', client.ilp_account)

        client.destroy();
        client = new webtorrent({ ilp_acccount: client.ilp_account });
        download(client, torrentOrigin, onProgress);
      }
    })


    console.log('UI - Download live from ', torrent.wires[0].peerId);
    torrent.on("done", () => {
      console.log('Done!', "File downloaded: " + torrent.files[0].name, arguments)
      clearInterval(logger);
      // clearInterval(resumer);
      onProgress(initialState, "Done/Idle");
    });


  });
};

function toggleAllLeechers (client, status) {
  client.unchokeWire(status.torrent.wires);
  console.log("UI - unchokeWire", status.torrent.wires);
};

function App () {
  const client = useContext(WebTorrentContext);
  const [status, setStatus] = useState({ working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0, torrent: undefined });
  const [seedMagnet, setSeedMagnet] = useState("");
  const [torrentData, setTorrentData] = useState({});

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
        <input type="file" name="upload" onChange={(event) => upload(client, event.target.files, setSeedMagnet, onProgress(status, setStatus))} />
        <button onClick={() => { toggleAllLeechers(client, status) }}>TOGGLE</button>
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
        <button onClick={() => download(client, leechMagnet, onProgress(status, setStatus), setTorrentData, torrentData)}>START DOWNLOAD</button>
      </div>
    </div>
  );
}
const wt = new webtorrent({ ilp_acccount: Math.floor(Math.random() * 99999999999999999) })
const WebTorrentContext = React.createContext({});
const rootElement = document.getElementById("root");
ReactDOM.render(<WebTorrentContext.Provider value={wt}><App /></WebTorrentContext.Provider>, rootElement);
