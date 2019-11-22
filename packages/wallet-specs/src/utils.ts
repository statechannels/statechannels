import * as fs from 'fs';

export function saveConfig(
  config: any,
  { guards, actions }: { guards?: any; actions?: any }
) {
  const pretty = (o: any) =>
    JSON.stringify(o, (key, val) => {
      return typeof val === 'function' ? val.toString() : val;
    });

  fs.writeFile(
    `protocol.config.js`,
    `
const config = ${pretty(config)}
const guards = ${pretty(guards || {})}
const customActions = ${pretty(actions || {})}
const machine = Machine(config, {guards, actions: customActions})
    `,
    (err: any) => ({})
  );
  console.log('saved');

  fs.writeFile(`protocol.config.json`, pretty(config), (err: any) => ({}));
}
