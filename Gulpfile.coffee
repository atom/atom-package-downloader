require('coffee-script/register');

fs = require 'fs'
path = require 'path'
gulp = require 'gulp'

Helpers = require "./lib/helpers"

PackagesPath = path.join(__dirname, "packages")
MetadataPath = path.join(PackagesPath, "metadata.json")

gulp.task "create-packages-directory", ->
  fs.mkdirSync(PackagesPath) unless fs.existsSync(PackagesPath)

gulp.task "download-metadata", ["create-packages-directory"], (done) ->
  Helpers.getMetadata().then(
    (packages) ->
      packageJSON = JSON.stringify(packages, null, 2)
      fs.writeFileSync(MetadataPath, packageJSON)
      done()
    (error) ->
      console.log "Error downloading metadata", error
      done()
  )

gulp.task "clone-packages", ["download-metadata"], (done) ->
  packages = JSON.parse(fs.readFileSync(MetadataPath))
  Helpers.clonePackages(packages, PackagesPath).then done,
    (error) ->
      console.log("Error cloning packages", error)
      done()

gulp.task "default", ["clone-packages"]
