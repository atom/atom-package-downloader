#!/usr/bin/env node

const fs = require('fs')
const dedent = require('dedent')
const {newIssueURL, packageURL} = require('../lib/util')

const errorFilePath = process.argv[2]
const errorDescriptions = fs.readFileSync(errorFilePath, 'utf8').split('\n\n')

let lastPackageName = null
let lastPackageErrors = []

for (const errorDescription of errorDescriptions) {
  const [filePath, variableName] = errorDescription.split('\n')
  const packageName = filePath.split('/')[1]
  const [relativePath, lineNumber] = filePath.split('/').slice(2).join('/').split(':')

  if (lastPackageName && packageName !== lastPackageName) {
    const baseURL = packageURL(lastPackageName)

    console.log('open \'' + newIssueURL(
      lastPackageName,
      'Changes required for upcoming CoffeeScript upgrade',
      dedent `
        Hi! Thanks for maintaining the ${lastPackageName} package!

        In Atom v1.12, we are going to [upgrade CoffeeScript](https://github.com/atom/atom/pull/12780) to the latest version. This upgrade entails one potentially breaking change to the language:

        > Changed strategy for the generation of internal compiler variable names. Note that this means that @example function parameters are no longer available as naked example variables within the function body.

        We think your package may be affected by this upgrade, in the following places:

        ${lastPackageErrors.map(error => {
          return `* The \`${error.variableName}\` variable [here](${baseURL}/tree/master/${error.filePath}#L${error.lineNumber})`
        }).join('\n')}

        These findings are based on linting packages with \`coffeescope\`. We could be wrong about some of them. When we release v1.12 beta, please test your package against it to make sure that it works. Let me know if you have any further questions; I will be happy to help!
      `
    ) + '\'')

    lastPackageErrors = []
  }

  lastPackageErrors.push({
    filePath: relativePath,
    lineNumber: lineNumber,
    variableName: variableName
  })

  lastPackageName = packageName
}
