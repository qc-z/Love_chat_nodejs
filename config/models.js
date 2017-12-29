'use strict'

var fs = require('fs')
var path = require('path')

// Model loading
var modeldir = path.join(__dirname, '../', 'app/models')
var walk = function(dir) {
  fs
    .readdirSync(dir)
    .forEach(function(file) {
      var newPath = dir + '/' + file
      var stat = fs.statSync(newPath)

      if (stat.isFile()) {
        if (/(.*)\.(js|coffee)/.test(file)) {
          require(newPath)
        }
      }
      else if (stat.isDirectory()) {
        walk(newPath)
      }
    })
}
walk(modeldir)
