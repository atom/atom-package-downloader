const path = require('path')

const rootPath = path.join(__dirname, '..', '..')
exports.metadataPath = path.join(rootPath, 'package-metadata.json')
exports.packagesDirPath = path.join(rootPath, 'packages')
exports.dummyAuthString = 'some-user:some-password'
