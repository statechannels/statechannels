/// <reference types="../src/global" />
/* eslint-disable no-console */

import * as fs from 'fs';
import path from 'path';

import serialize from 'serialize-javascript';
function saveConfig(
  config: any,
  workflowPath = '/null', // TODO: make this required
  {guards, actions}: {guards?: any; actions?: any}
): void {
  const filename = workflowPath.replace('.ts', '.config.js');
  console.log(`Saving ${filename}`);

  fs.writeFile(
    filename,
    `
const guards = ${serialize(guards || {})}
const customActions = ${serialize(actions || {})}
const config = ${serialize(config)}
const machine = Machine(config, {guards, actions: customActions})
    `,
    err => {
      if (err) throw err;
    }
  );
}

const workflowsDir = path.join(__dirname, '..', 'src', 'workflows');
const workflows = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.ts'));

for (const workflow of workflows) {
  const workflowPath = path.join(workflowsDir, workflow);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {config, mockOptions} = require(workflowPath);

  saveConfig(config, workflowPath, mockOptions || {});
}
