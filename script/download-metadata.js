#!/usr/bin/env node

const fs = require('fs')
const async = require('async')
const request = require('request')
const util = require('../lib/util')

const NEXT_PAGE_URL_REGEX = /<([^>]+)>; rel="next"/
const LAST_PAGE_URL_REGEX = /<([^>]+)>; rel="last"/

const allPackages = []
const packageNames = new Set()
let pageCount = null
let nextPageURL = 'https://atom.io/api/packages?sort=downloads&order=desc&page=1'

async.whilst(
  () => nextPageURL,

  (done) => {
    process.stdout.write(`Fetching ${nextPageURL}`)
    if (pageCount !== null) process.stdout.write(` (${pageCount} pages)`)
    process.stdout.write('\n')

    request({url: nextPageURL, json: true}, (error, response, packages) => {
      if (error) {
        done(error)
        return
      }

      nextPageURL = null

      if (response.headers.link) {
        const nextLinkMatch = response.headers.link.match(NEXT_PAGE_URL_REGEX)
        if (nextLinkMatch) nextPageURL = nextLinkMatch[1]

        const lastLinkMatch = response.headers.link.match(LAST_PAGE_URL_REGEX)
        if (lastLinkMatch) pageCount = lastLinkMatch[1].match(/page=(\d+)/)[1]
      }

      for (const pack of packages) {
        // atom.io seems to return some of the same packages multiple times
        if (packageNames.has(pack.name)) continue
        packageNames.add(pack.name)

        delete pack.versions
        allPackages.push(pack)
      }

      done()
    })
  },

  (error) => {
    if (error) {
      console.error(error)
      return
    }

    fs.writeFileSync(util.metadataPath, JSON.stringify(allPackages, null, 2))
    console.log(`Wrote package metadata to ${util.metadataPath}`)
  }
)
