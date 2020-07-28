const {readdir, createReadStream, writeFile} = require('fs-extra');
const {createInterface} = require('readline');
const {join, parse} = require('path');
const {exec} = require('child_process');

// copied from https://github.com/faastjs/faast.js/blob/3f498554d5a662bb3f98beab7e6d7eeeb4505f9c/build/make-docs.js

async function main() {
  await new Promise((resolve, reject) =>
    exec(
      'api-extractor run --local && api-documenter markdown -i dist -o ../nitro-protocol/docs/iframe-channel-provider-api',
      (err, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    )
  );

  const dir = '../nitro-protocol/docs/iframe-channel-provider-api';
  const docFiles = await readdir(dir);
  for (const docFile of docFiles) {
    try {
      const {name: id, ext} = parse(docFile);
      if (ext !== '.md') {
        continue;
      }

      const docPath = join(dir, docFile);
      const input = createReadStream(docPath);
      const output = [];
      const lines = createInterface({
        input,
        crlfDelay: Infinity
      });

      let title = '';
      lines.on('line', line => {
        let skip = false;
        if (!title) {
          const titleLine = line.match(/## (.*)/);
          if (titleLine) {
            title = titleLine[1];
          }
        }
        const homeLink = line.match(/\[Home\]\(.\/index\.md\) &gt; (.*)/);
        if (homeLink) {
          // Skip the breadcrumb for the toplevel index file.
          if (id !== 'faastjs') {
            output.push(homeLink[1]);
          }
          skip = true;
        }
        // See issue #4. api-documenter expects \| to escape table
        // column delimiters, but docusaurus uses a markdown processor
        // that doesn't support this. Replace with an escape sequence
        // that renders |.
        if (line.startsWith('|')) {
          line = line.replace(/\\\|/g, '&#124;');
        }
        if (!skip) {
          output.push(line);
        }
      });

      await new Promise(resolve => lines.once('close', resolve));
      input.close();

      const header = ['---', `id: ${id}`, `title: ${title}`, `hide_title: true`, '---'];

      await writeFile(docPath, header.concat(output).join('\n'));
    } catch (err) {
      console.error(`Could not process ${docFile}: ${err}`);
    }
  }
}

main();
