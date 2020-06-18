/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 // Example:
 const first = '%cbittorrent-protocol %c[5e0cb699] handshake i=%s p=%s exts=%o%c +11s';
 const args = [
   'color: #9900CC',
   'color: inherit',
   '2045f638f8d12ad7d95c4876b2ebd851664e7579',
   '2d5757303030372d31485472334634724c586b62',
   {dht: false},
   'color: #9900CC'
 ];
 parseBittorrentLog(first, ...args)
 ```
 {"time":1592443875126,"msg":"handshake +11s","name":"bittorrent-protocol","wireId":"5e0cb699","params":{"i":"2045f638f8d12ad7d95c4876b2ebd851664e7579","p":"2d5757303030372d31485472334634724c586b62","exts":{"dht":false}}}
 ```
*/
export const parseBittorrentLog = (
  logLine: string,
  ...values: (string | object | number)[]
): any => {
  // Webtorrent uses debug.
  // Debug makes calls to console.log with format arguments
  // See
  // https://github.com/webtorrent/bittorrent-protocol/blob/master/index.js#L4
  // https://github.com/webtorrent/bittorrent-protocol/blob/master/index.js#L729-L732
  // Examples:
  // bittorrent-protocol [95adde64] new wire +0ms
  // bittorrent-protocol [5e0cb699] handshake i=2045f638f8d12ad7d95c4876b2ebd851664e7579 p=2d5757303030372d31485472334634724c586b62 exts={dht: false} +11s

  /**
   * ----- Remove these things from the log line
   * %s → Formats the value as a string
   * %i or %d → Formats the value as an integer
   * %f → Formats the value as a floating point value
   * %o → Formats the value as an expandable DOM element. As seen in the Elements panel
   * %O → Formats the value as an expandable JavaScript object
   * %c → Applies CSS style rules to the output string as specified by the second parameter
   */
  let idx = -1;
  const replacer = (match: '%s' | '%i' | '%d' | '%f' | '%o' | '%O' | '%c'): string => {
    idx++;
    switch (match) {
      case '%c':
        // Remove colours
        return '';
      case '%o':
      case '%O':
        // Serialize objects
        return JSON.stringify(values[idx]);
      case '%d':
      case '%i':
      case '%f':
        // Convert numbers
        return values[idx].toString();
      case '%s':
        // Replace strings
        return values[idx] as string;
    }
  };
  const formatted = logLine.replace(/%(s|i|d|f|o|O|c)/g, replacer as any);

  const [tag, id, ...rest] = formatted.split(' ');

  // This is specific to bittorrent-protocol's use of debug:
  // it uses key=val to log things like "index=3" or "ext={dht: true}"
  const isParam = (item: string): boolean => item.includes('=');

  const msg = rest.filter(s => !isParam(s)).join(' ');
  const wireId = id.slice(1, id.length - 1);

  const baseLog: Record<string, string | number> = {msg, name: tag, wireId};

  return formatted
    .split(' ')
    .filter(isParam)
    .reduce((result, param) => {
      const [key, val] = param.split('=');
      try {
        // If it's an object, deserialize it
        result[key] = JSON.parse(val);
      } catch (e) {
        // else it's a string
        result[key] = val;
      }

      return result;
    }, baseLog);
};
