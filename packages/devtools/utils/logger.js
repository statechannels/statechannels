var fs = require("fs");

var Logger = (exports.Logger = {});
var infoStream = fs.createWriteStream("info.log");
var errorStream = fs.createWriteStream("error.log");
var debugStream = fs.createWriteStream("debug.log");

Logger.info = function(msg) {
  infoStream.write(msg + "\n");
};

Logger.log = function(msg) {
  infoStream.write(msg + "\n");
};

Logger.debug = function(msg) {
  debugStream.write(msg + "\n");
};

Logger.error = function(msg) {
  errorStream.write(msg + "\n");
};
