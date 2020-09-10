fs = require('fs');
path = require('path');

// strip out uneeded entries from artifacts
function stripArtifacts() {
  const files = fs.readdirSync(path.resolve(__dirname, '../build/contracts'));
  console.log('Stripping uneeded entries from the following artifacts: ', files);
  for (file in files) {
    let artifact = require(path.resolve(__dirname, '../build/contracts/' + files[file]));
    // delete artifact['ast']; // we need this to generate documentation
    delete artifact['legacyAst'];
    delete artifact['source'];
    fs.writeFileSync(
      path.resolve(__dirname, '../build/contracts/' + files[file]),
      JSON.stringify(artifact, null, 2)
    );
  }
}

stripArtifacts();
