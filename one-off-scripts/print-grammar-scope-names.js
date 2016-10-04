'use strict'

const CSON = require('season')
const fs = require('fs')
const glob = require('glob')
const path = require('path')

console.log('Collecting grammar scope names... This might take a while.')
const packagesPath = path.resolve('.')
const grammarPaths = glob.sync(path.join(packagesPath, 'packages', '**', 'grammars', '*.{json,cson}'))
let scopes = []
for (const grammarPath of grammarPaths) {
  try {
    const fileContent = fs.readFileSync(grammarPath)
    const content = grammarPath.endsWith('.cson') ? CSON.parse(fileContent) : JSON.parse(fileContent)
    scopes = scopes.concat(getScopes(content, 0))
  } catch (e) {
    console.error(`Skipping ${grammarPath}. Error: ${e}`)
  }
}

console.log('[');
let currentRow = ' '
for (let scope of Array.from(new Set(scopes)).sort()) {
  if (` ${currentRow}'${scope}',`.length > 80) {
    console.log(currentRow)
    currentRow = `  '${scope}',`
  } else {
    currentRow += ` '${scope}',`
  }
}
console.log(currentRow.slice(0, -1))
console.log(']')

function getScopes (object, isPattern) {
  const CSSClassNameRegExp = /^[_a-zA-Z]+[_a-zA-Z0-9-]*$/g
  let names = []
  for (const key of Object.keys(object)) {
    const value = object[key]
    const type = Object.prototype.toString.apply(value)
    if (type === '[object String]' && (key === 'scopeName' || (isPattern && key === 'name'))) {
      names = names.concat(value.split('.').filter(v => CSSClassNameRegExp.test(v)))
    } else if (type === '[object Array]' || type === '[object Object]') {
      names = names.concat(
        getScopes(value, isPattern || key === 'beginCaptures' || key === 'endCaptures' || key === 'patterns')
      )
    }
  }
  return names
}
