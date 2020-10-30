var fs = require('fs');

fs.writeFileSync(
  'lib/src/version.js',
  `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WALLET_VERSION = void 0;
exports.WALLET_VERSION = '${process.env.npm_package_name}@${process.env.npm_package_version}';
//# sourceMappingURL=version.js.map`
);
