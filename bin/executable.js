#!/usr/bin/env node
var args = Array.from(process.argv)
var lastSummer = require('../src/index')
lastSummer.init(args[2], args[3])