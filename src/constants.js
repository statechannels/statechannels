export const ClientEvents = {
  PEER_STATUS_CHANGED: 'peer_status_changed',
  CLIENT_RESET: 'client_reset',
  TORRENT_DONE: 'torrent_done',
  TORRENT_ERROR: 'torrent_error',
  TORRENT_NOTICE: 'torrent_notice'
};

export const TorrentEvents = {
  WIRE: 'wire',
  NOTICE: 'notice',
  STOP: 'stop',
  DONE: 'done',
  ERROR: 'error'
};

export const WireEvents = {
  DOWNLOAD: 'download',
  FIRST_REQUEST: 'first_request',
  REQUEST: 'request'
};

export const PaidStreamingExtensionEvents = {
  WARNING: 'warning',
  PSE_HANDSHAKE: 'pse_handshake',
  NOTICE: 'notice',
  FIRST_REQUEST: 'first_request',
  REQUEST: 'request'
};

export const PaidStreamingExtensionNotices = {
  START: 'start',
  STOP: 'stop',
  ACK: 'ack'
};
