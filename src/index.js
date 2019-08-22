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
    console.log("index Upload Started ", torrent);
    torrent.on("wire", (wire) => {
      console.log("index Wire!", wire);
      wire.on('unchoke', () => {
        console.log('index upload unchoked', arguments)
      })
      wire.on('choke', () => {
        console.log('index upload choke', arguments)
        torrent.resume()
      })
    });
    setInterval(() => onProgress(torrent, "Seeding", false), 1000);
  });
};

function download (client, torrentOrigin, onProgress) {
  var torrentId = torrentOrigin || "https://webtorrent.io/torrents/sintel.torrent";
  client.add(torrentId, function (torrent) {
    console.log("index Download Started ", torrent);
    const intervalHandle = setInterval(() => { onProgress(torrent, "Leeching", false) }, 2000);
    const intervalHandleB = setInterval(() => {
      console.log('index checking for permission', torrent.wires[0] && !torrent.wires[0].wt_ilp.amForceChoking);
      if (torrent.wires[0] && torrent.wires[0].wt_ilp.amForceChoking) {
        torrent.resume();
      } else if (!torrent.wires[0]) {
        client.remove(torrentOrigin);
        clearInterval(intervalHandleB)
        download(client, torrentOrigin, onProgress);
      }
    }, 1000);

    torrent.on("done", () => {
      clearInterval(intervalHandleB)
      clearInterval(intervalHandle);
      onProgress(initialState, "Done/Idle");
      console.log('Done!', "File downloaded: " + torrent.files[0].name)
    });

    torrent.on('ready', function () { console.log('index download ready') })
    torrent.on('wire', function () { console.log('index download wire') })
    torrent.on('choke', function () { console.log('index download choke') })

    client.on('ready', function () { console.log('index download ready') })
    client.on('wire', function () { console.log('index download wire') })
    client.on('choke', function () { console.log('index download choke') })
  });
};

function toggleAllLeechers (client, status) {
  const wires = status.torrent.wires;
  console.log("index toggleAllLeechers", wires);
  client.unchokeWire(wires[0]);
};

function App () {
  const client = useContext(WebTorrentContext);
  const [status, setStatus] = useState({ working: "Done/Idle", verb: "from", numPeers: 0, downloadSpeed: 0, uploadSpeed: 0, torrent: undefined });
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
        <button onClick={() => download(client, leechMagnet, onProgress(status, setStatus))}>START DOWNLOAD</button>
      </div>
    </div>
  );
}
const wt = new webtorrent()
const WebTorrentContext = React.createContext({});
const rootElement = document.getElementById("root");
ReactDOM.render(<WebTorrentContext.Provider value={wt}><App /></WebTorrentContext.Provider>, rootElement);
