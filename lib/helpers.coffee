require 'es6-shim'
fs = require 'fs'
URL = require 'url'
path = require 'path'
child_process = require 'child_process'
request = require 'request'
async = require 'async'

exports.getMetadata = ->
  url = "https://atom.io/api/packages"
  allPackages = []

  new Promise (resolve, reject) ->
    async.whilst(
      -> url?
      (callback) ->
        console.log "Fetching", url
        request {url, json: true}, (error, response, body) ->
          return callback(error) if error?
          url = response.headers.link?.match(/<([^>]+)>; rel="next"/)?[1]
          allPackages = allPackages.concat(body)
          callback()
      (error) ->
        if error?
          reject(error)
        else
          resolve(allPackages)
    )

exports.clonePackages = (packages, packagesDirPath) ->
  progress = 0

  new Promise (resolve, reject) ->
    async.eachLimit packages, 10,
      (pack, callback) ->
        clonePath = "#{packagesDirPath}/#{pack.name}"

        done = ->
          console.log "#{++progress}/#{packages.length} - #{pack.name}"
          callback()

        fs.exists clonePath, (exists) ->
          if exists
            fetch = child_process.spawn "git", ["fetch", "origin"], {cwd: clonePath, stdio: 'ignore'}
            fetch.on 'error', (error) ->
              console.error(pack.name, error.message)
              done()
            fetch.on 'exit', ->
              reset = child_process.spawn "git", ["reset", "--hard", "origin/HEAD"], {cwd: clonePath, stdio: 'ignore'}
              reset.on 'error', (error) ->
                console.error(pack.name, error.message)
                done()
              reset.on 'exit', ->
                done()

          else if pack.repository?.url?
            packageURL = URL.format(Object.assign(URL.parse(pack.repository.url), {auth: "some-user:some-password"}))
            clone = child_process.spawn('git', ['clone', '--depth=1', packageURL, clonePath], {stdio: 'ignore'})
            clone.on 'error', (error) ->
              console.error(pack.name, error.message)
              done()
            clone.on 'exit', ->
              done()

          else
            console.warn("Package '#{pack.name}' has no repository URL")
            callback()

      (error) ->
        if error?
          console.log 'error', error
          reject(error)
        else
          console.log 'success'
          resolve()
