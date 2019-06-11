#!/usr/bin/env node

const path = require('path')
const execFileSync = require('child_process').execFileSync

console.log('Downloading metadata')
execFileSync(process.execPath, [path.join(__dirname, 'download-metadata.js')], {stdio: 'inherit'})

console.log('Cloning packages')
execFileSync(process.execPath, [path.join(__dirname, 'clone-packages.js')], {stdio: 'inherit'})
