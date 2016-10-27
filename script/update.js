#!/usr/bin/env node

const path = require('path')
const execFileSync = require('child_process').execFileSync

console.log('Downloading metadata')
execFileSync(path.join(__dirname, 'download-metadata.js'), {stdio: 'inherit'})

console.log('Cloning packages')
execFileSync(path.join(__dirname, 'clone-packages.js'), {stdio: 'inherit'})
