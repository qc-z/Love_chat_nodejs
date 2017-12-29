'use strict'

var mongoose = require('mongoose')
var ApkSchema = require('../schemas/apk')
var Apk = mongoose.model('Apk', ApkSchema)

module.exports = Apk
