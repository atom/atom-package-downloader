#!/usr/bin/env node

const fs = require('fs')
const glob = require('glob')
const path = require('path')
const babel = require('babel-core')

var PREFIXES = [
  '/** @babel */',
  '"use babel"',
  '\'use babel\'',
  '/* @flow */'
]
const packagesPath = path.resolve('.')
const filePaths = glob.sync(path.join(packagesPath, 'packages', '**', '*.js'))
const options = JSON.parse(fs.readFileSync(path.join(packagesPath, '.babelrc')))
const plugins = []
for (const [pluginName, pluginOptions] of options['plugins']) {
  plugins.push([require.resolve(`babel-plugin-${pluginName}`), pluginOptions])
}
options['plugins'] = plugins

for (const filePath of filePaths) {
  if (!filePath.includes('node_modules/')) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8')
      if (PREFIXES.some((p) => fileContent.startsWith(p))) {
        babel.transform(fileContent, options)
        // console.log(filePath)
      }
    } catch (e) {
      if (!e.message.includes('EISDIR')) {
        console.warn('ERROR: ' + filePath)
        console.warn(e.message)
        // break
      }
    }
  }
}
