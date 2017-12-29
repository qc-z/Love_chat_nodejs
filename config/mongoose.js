'use strict'

var mongoose = require('mongoose')
var autoinc = require('../app/libs/mongoose-id-autoinc')

/**
 * Connect to database
 */
module.exports = function (config) {
  if (config.app.env === 'development') {
    mongoose.set('debug', true)
  }

  var connect = function () {
    var opts = {
      server: {
        socketOptions: {
          keepAlive: 1
        }
      }
    }

    autoinc.init(mongoose.connect(config.db, opts))
  }

  connect()

  mongoose.connection.on('disconnected', function () {
    connect()
  })
  mongoose.connection.on('error', function (err) {
    console.error(err)
  })
  mongoose.connection.once('open', function callback () {
    console.log('Connected to MongoDB', config.db)
  })
}
