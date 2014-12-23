require('coffee-script/register');

fs = require 'fs'
path = require 'path'
gulp = require 'gulp'

Helpers = require "./lib/helpers"

PackagesPath = path.join(__dirname, "packages")
MetadataPath = path.join(PackagesPath, "metadata.json")

gulp.task "create-packages-directory", ->
  fs.mkdirSync(PackagesPath) unless fs.existsSync(PackagesPath)

gulp.task "download-metadata", ["create-packages-directory"], ->
  Helpers.getMetadata().then(
    (packages) ->
      packageJSON = JSON.stringify(packages, null, 2)
      fs.writeFileSync(MetadataPath, packageJSON)
    (error) ->
      console.log "Error downloading metadata", error
  )

gulp.task "clone-packages", ->
  packages = JSON.parse(fs.readFileSync(MetadataPath))
  Helpers.clonePackages(packages, PackagesPath).then(
    ->
      console.log 'Done cloning packages'
    (error) ->
      console.log("Error cloning packages", error)
  )

gulp.task "default", ["download-metadata", "clone-packages"]
