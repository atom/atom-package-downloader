#!/usr/bin/env node

const fs = require('fs')
const temp = require('temp')
const dedent = require('dedent')
const {execFile} = require('child_process')
const {newIssueURL, packageURL} = require('../lib/util')

process.on('unhandledRejection', console.error)

function callPattern(variableName, methodName) {
  return `\\b\\w*${variableName}([A-Z]\\w+)?\\.${methodName}\\b`
}

const ASYNC_METHODS = {
  'Pane.close': callPattern('pane', 'close'),
  'TextBuffer.save': callPattern('buffer', 'save'),
  'TextEditor.save': callPattern('editor', 'save'),
  'Pane.saveItem' : callPattern('pane', 'saveItem'),
  'Pane.saveItemAs': callPattern('pane', 'saveItemAs'),
  'Pane.saveActiveItem': callPattern('pane', 'saveActiveItem'),
  'Pane.saveActiveItemAs': callPattern('pane', 'saveActiveItemAs'),
  'Pane.saveItems': callPattern('pane', 'saveItems'),
  'Pane.close': callPattern('pane', 'close'),
  'Workspace.saveActivePaneItem': callPattern('workspace', 'saveActivePaneItem'),
  'Workspace.saveActivePaneItemAs': callPattern('workspace', 'saveActivePaneItemAs'),
}

let searchPromise
let resultsPath = process.argv[2]
if (resultsPath) {
  process.stderr.write(`reading search results from ${resultsPath}\n`);
  searchPromise = Promise.resolve(JSON.parse(fs.readFileSync(resultsPath)))
} else {
  searchPromise = Promise.all(Object.keys(ASYNC_METHODS).map((method) => {
    return new Promise(resolve => {
      const pattern = ASYNC_METHODS[method]
      execFile(
        'ag',
        [
          pattern,
          'packages',
          '--group',
          '--file-search-regex',
          '(js|coffee|ts)x?$',
        ],
        (error, stdout, stderr) => {
          const files = []
          for (let chunk of stdout.split('\n\n')) {
            chunk = chunk.trim()
            if (chunk) {
              const lines = chunk.split('\n')
              files.push({
                path: lines[0],
                method: method,
                matches: lines.slice(1).map(line => parseInt(line)).filter(Number.isFinite)
              })
            }
          }
          process.stderr.write(`found ${files.length} files calling ${method}\n`);
          resolve(files)
        }
      )
    })
  })).then(resultArrays => {
    const results = resultArrays.concat.apply([], resultArrays)
    resultsPath = temp.openSync().path
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
    process.stderr.write(`wrote search results to ${resultsPath}\n`)
    return results
  })
}

searchPromise.then(results => {
  const packageResults = {}
  const packageURLsByName = {}

  for (const result of results) {
    const pathComponents = result.path.split('/')
    const packageName = pathComponents[1]
    let packageResult = packageResults[packageName]
    if (!packageResult) {
      packageResult = packageResults[packageName] = {
        url: packageURL(packageName),
        methodCallSites: {}
      }
    }

    if (!packageResult.methodCallSites[result.method]) {
      packageResult.methodCallSites[result.method] = []
    }

    for (let match of result.matches) {
      packageResult.methodCallSites[result.method].push({
        path: pathComponents.slice(2).join('/'),
        line: match
      })
    }
  }

  let i = 0

  for (const packageName in packageResults) {
    const result = packageResults[packageName]
    if (result.url.startsWith('https://github.com/atom/')) continue

    if (i <= 200) {
      i++
      continue
    }

    console.log('open $\'' + newIssueURL(
      packageName,
      'Changes required due to TextBuffer.save becoming async in Atom 1.19',
`
Hi! Thanks for maintaining the ${packageName} package!

In Atom v1.19, we will release a [major change](https://github.com/atom/atom/pull/14435) to Atom's core text buffer data structure. As part of this change, we have made \`TextBuffer.save\` asynchronous; rather than blocking until the save is complete, it now immediately returns a \`Promise\` that *resolves* when the save is complete. Because of this, a few other Atom APIs that *use* \`save\` have similarly become async:

${
  Object.keys(ASYNC_METHODS)
    .map(method => '* `' + method + '`')
    .join('\n')
}

#### Effects on this package

We think this package could be impacted by this upgrade because it calls the changed methods in the following places:

${
  Object.keys(result.methodCallSites)
    .map(method => {
      const callSites = result.methodCallSites[method]
      return '* `' + method + '`\n' + callSites.map(callSite => {
        return `  * [here](${result.url}/tree/master/${callSite.path}#L${callSite.line})`
      }).join('\n')
    }).join('\n')
}

We found these calls using a regex search, so this list might be incomplete, and it might contain some false positives.

#### What to do about the change

It should be pretty easy to adjust your package code and/or tests to work with the new async behavior, and to simultaneously keep it working with older versions of Atom. Here are some examples of pull requests we opened on our bundled packages to cope with the change:

* https://github.com/atom/autocomplete-plus/pull/852
* https://github.com/atom/whitespace/pull/155
* https://github.com/atom/symbols-view/pull/222
* https://github.com/atom/status-bar/pull/193
* https://github.com/atom/tabs/pull/448

Please let me know if you have any questions. I would be happy to help!

`
    ).replace("'", "\\'") + '\';\n')

    i++
  }
})