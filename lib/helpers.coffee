require 'es6-shim'
fs = require 'fs'
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
  logProgress = ->
    console.log "#{++progress}/#{packages.length}"

  new Promise (resolve, reject) ->
    async.eachLimit packages, 10,
      (pack, callback) ->
        clonePath = "#{packagesDirPath}/#{pack.name}"

        if fs.existsSync(clonePath)
          child_process.exec "git pull", cwd: clonePath, (error) ->
            console.error(error.message) if error?
            logProgress()
            callback()
        else
          command = "git clone --depth=1 \"#{pack.repository.url}\" \"#{clonePath}\""
          child_process.exec command, (error) ->
            console.error(error.message) if error?
            logProgress()
            callback()
      (error) ->
        if error?
          reject(error)
        else
          resolve()
