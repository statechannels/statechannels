import * as fs from 'fs';
import serialize from 'serialize-javascript';

export function saveConfig(
  config: any,
  { guards, actions }: { guards?: any; actions?: any }
) {
  const path = process.cwd();
  const dirName = path.substring(path.lastIndexOf('/') + 1);
  const filename = `../../../src/protocols/${dirName}/protocol.config.js`;

  fs.writeFile(
    filename,
    `
const config = ${serialize(config)}
const guards = ${serialize(guards || {})}
const customActions = ${serialize(actions || {})}
const machine = Machine(config, {guards, actions: customActions})
    `,
    (err: any) => ({})
  );
}
