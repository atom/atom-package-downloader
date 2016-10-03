#!/usr/bin/env node

const fs = require('fs')
const url = require('url')
const path = require('path')
const async = require('async')
const spawn = require('child_process').spawn
const util = require('../lib/util')

const allPackages = require(util.metadataPath)
let completedPackageCount = 0

async.eachLimit(
  allPackages,
  10,
  (pack, done) => {
    const packageRepoPath = path.join(util.packagesDirPath, pack.name)

    fs.exists(packageRepoPath, (exists) => {
      if (exists) {
        let options = {cwd: packageRepoPath}
        runGit(['fetch', 'origin'], options, () => {
          runGit(['reset', '--hard', 'origin/HEAD'], options, succeed)
        })
      } else if (pack.repository && pack.repository.url) {
        const packageURL = url.format(Object.assign(url.parse(pack.repository.url), {
          auth: util.dummyAuthString
        }))
        runGit(['clone', '--depth=1', packageURL, packageRepoPath], null, succeed)
      } else {
        fail({message: 'Missing repository URL'})
      }
    })

    function runGit (args, options, callback) {
      let child = spawn('git', args, Object.assign({stdio: 'ignore'}, options))
      child.on('error', fail)
      child.on('exit', callback)
    }

    function succeed () {
      proceed()
      done()
    }

    function fail (error) {
      proceed()
      console.error('  ' + error.message)
      done()
    }

    function proceed () {
      completedPackageCount++
      console.log(completedPackageCount + '/' + allPackages.length + ' - ' + pack.name)
    }
  },

  (error) => {
    if (error) {
      console.error(error)
      return
    }

    console.log(`Cloned all packages to ${util.packagesDirPath}`)
  }
)
