#!/usr/bin/env node

const fs = require('fs')
const temp = require('temp')
const dedent = require('dedent')
const {execFile} = require('child_process')
const {newIssueURL, packageURL, getDefaultBranchSha} = require('../lib/util')

process.on('unhandledRejection', console.error)

function callPattern(variableName, methodName) {
  return `\\b\\w*${variableName}([A-Z]\\w+)?(\(\))?\\.${methodName}\\b`
}

const METHODS = {
  'TextBuffer.onDidChange': callPattern('buffer', 'onDidChange'),
  'TextEditor.onDidChange': callPattern('editor', 'onDidChange'),
}

let searchPromise
let resultsPath = process.argv[2]
if (resultsPath) {
  process.stderr.write(`reading search results from ${resultsPath}\n`);
  searchPromise = Promise.resolve(JSON.parse(fs.readFileSync(resultsPath)))
} else {
  searchPromise = Promise.all(Object.keys(METHODS).map((method) => {
    return new Promise(resolve => {
      const pattern = METHODS[method]
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

  let i = -1

  for (const packageName in packageResults) {
    const result = packageResults[packageName]
    if (result.url.startsWith('https://github.com/atom/')) continue
    i++

    if (i <= 100) continue

    const defaultBranchSha = getDefaultBranchSha(packageName)

    console.log('open $\'' + newIssueURL(
      packageName,
      'Changes to TextEditor.onDidChange and TextBuffer.onDidChange coming in Atom 1.23',
`
Hi! Thanks for maintaining the ${packageName} package!

In Atom v1.23, we will [some](https://github.com/atom/text-buffer/pull/273) [changes](https://github.com/atom/text-buffer/pull/274) that may affect your package.

The methods \`TextEditor.onDidChange\` and \`TextBuffer.onDidChange\` will now call their callbacks *less frequently*. Previously, these callbacks would get called once for each individual change to the buffer. So if you had 5 cursors and typed a character, they would get called 5 times. Now, they will only get called once, and the event that is passed to them will contain information about *all 5* of the changes that have occurred.

The same properties that have always existed on the \`TextBuffer.onDidChange\` events (\`oldRange\`, \`newRange\`, \`oldText\`, and \`newText\`) will still be there, and they will now reflect the sum of *all* changes that have occurred. But now there will be an additional property called \`changes\`, which will contain an array of more fine-grained objects describing the *individual* changes. We encourage you to use this property instead of the old ones.

#### Effects on this package

It looks like this package calls the changed methods in the following places:

${
  Object.keys(result.methodCallSites)
    .map(method => {
      const callSites = result.methodCallSites[method]
      return '* `' + method + '`\n' + callSites.map(callSite => {
        return `  * [here](${result.url}/blob/${defaultBranchSha}/${callSite.path}#L${callSite.line})`
      }).join('\n')
    }).join('\n')
}

We found these calls using a regex search, so this list might be incomplete, and it might contain some false positives.

#### What to do about the change

It is likely that you do not need to do anything. The old event properties will continue to work.

However, you may be able to handle changes more accurately and efficiently by using the \`changes\` field of the events rather than the old properties. The \`changes\` field does not exist in Atom 1.22 unless you use the \`TextBuffer.onDidChangeText\` method. In Atom 1.23 and above though, \`.onDidChange\` and \`.onDidChangeText\` will become identical, having both the old properties and the new \`changes\` property.

Please let me know if you have any questions. I would be happy to help!
`
    ).replace("'", "\\'") + '\';\n')
  }
})
