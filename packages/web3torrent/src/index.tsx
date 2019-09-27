import React from "react";
import ReactDOM from "react-dom";

import App from "./App";
import WebTorrentPaidStreamingClient from "./library/web3torrent-lib";

const web3torrent = new WebTorrentPaidStreamingClient();
const WebTorrentContext = React.createContext({});

ReactDOM.render(
  <WebTorrentContext.Provider value={web3torrent}>
    <App />
  </WebTorrentContext.Provider>,
  document.getElementById("root")
);
