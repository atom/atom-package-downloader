#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const async = require('async')
const mkdirp = require('mkdirp')
const request = require('request')
const util = require('../lib/util')

const allPackages = require(util.metadataPath)
let completedPackageCount = 0

async.eachLimit(
  allPackages,
  10,
  (pack, done) => {
    if (!pack || !pack.name || !pack.releases || !pack.releases.latest) {
      const message = pack ? pack.name + ' has no latest version' : 'empty package'
      fail({message: message})
      return
    }
    const packagePath = path.join(util.packageJsonDirPath, pack.name)
    const packageJsonPath = path.join(packagePath, 'package.json')
    const latestURL = 'https://atom.io/api/packages/' + pack.name + '/versions/' + pack.releases.latest
    request({url: latestURL, json: true}, (error, response, metadata) => {
      if (error) {
        fail(error)
        return
      }
      mkdirp.sync(packagePath)
      fs.writeFileSync(packageJsonPath, JSON.stringify(metadata, null, 2))
      succeed()
    })

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

    console.log(`Downloaded package.json for all packages to ${util.packageJsonDirPath}`)
  }
)
