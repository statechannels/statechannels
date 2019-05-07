const pathPrefix = '../../contracts/prebuilt_contracts';
const devPathPrefix = '../../../build/contracts';
let nitroAdjudicatorArtifact = require(pathPrefix + '/NitroAdjudicator.json');

if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  nitroAdjudicatorArtifact = require(devPathPrefix + '/NitroAdjudicator.json');
}

// todo: should define type
export { nitroAdjudicatorArtifact };
