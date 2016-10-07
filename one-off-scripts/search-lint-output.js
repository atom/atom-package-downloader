#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const coffeelintOutputPath = process.argv[2]
const packagesPath = path.resolve('.')
const lines = fs.readFileSync(coffeelintOutputPath, 'utf8').split('\n')
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const match = line.match(/#(\d+).*Undefined identifier "(\w+)"./)
  if (match) {
    const lineNumber = match[1]
    const variableName = match[2]
    if (variableName !== 'emit') {
      let filePath
      for (let j = i - 1; j >= 0; j--) {
        const previousLine = lines[j]
        const index = previousLine.indexOf('packages/')
        if (index !== -1) {
          filePath = previousLine.substring(index)
          break
        }
      }

      try {
        const fileContent = fs.readFileSync(path.join(packagesPath, filePath), 'utf8')
        const hasUndefinedInstanceVariable =
          fileContent.includes(`@${variableName}`) ||
          (fileContent.includes('class') && fileContent.includes(`${variableName}:`))
        if (hasUndefinedInstanceVariable) {
          console.log(`${filePath}:${lineNumber}`)
          console.log(variableName)
          console.log()
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}
