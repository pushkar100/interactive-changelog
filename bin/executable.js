#!/usr/bin/env node
var args = Array.from(process.argv)
var lastSummer = require('../dist/index')
lastSummer.init(args[2], args[3])
