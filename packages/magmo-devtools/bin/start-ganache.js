#! /usr/local/bin/node

"use strict";
let argv = require("yargs").argv;
const { startGanache } = require("../utils/startGanache");

startGanache(argv);
