const fs = require('fs')
const url = require('url')
const path = require('path')
const querystring = require('querystring')

const rootPath = path.join(__dirname, '..')
const metadataPath = path.join(rootPath, 'package-metadata.json')
const packagesDirPath = path.join(rootPath, 'packages')
const packageJsonDirPath = path.join(rootPath, 'package-json')
const dummyAuthString = 'some-user:some-password'

function packageURL (packageName) {
  const gitConfigPath = path.join(packagesDirPath, packageName, '.git', 'config')
  const gitConfig = fs.readFileSync(gitConfigPath, 'utf8')
  const gitURL = gitConfig.match(/url = (.+)/)[1]
  return url.format(Object.assign(url.parse(gitURL), {
    auth: null
  }))
}

function newIssueURL (packageName, title, body) {
  return packageURL(packageName) + '/issues/new?' + querystring.stringify({
    title: title,
    body: body
  })
}

function getDefaultBranchSha (packageName) {
  const headsDir = path.join(packagesDirPath, packageName, '.git', 'refs', 'heads')
  const branchNames = fs.readdirSync(headsDir)
  const branchName = branchNames.includes('master') ? 'master' : branchNames[0]
  return fs.readFileSync(path.join(packagesDirPath, packageName, '.git', 'refs', 'heads', branchName), 'utf8').trim()
}

module.exports = {
  rootPath,
  metadataPath,
  packagesDirPath,
  packageJsonDirPath,
  getDefaultBranchSha,
  dummyAuthString,
  packageURL,
  newIssueURL
}
