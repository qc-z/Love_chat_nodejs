'use strict'

var mongoose = require('mongoose')
var HotloadSchema = require('../schemas/hotload')
var Hotload = mongoose.model('Hotload', HotloadSchema)

module.exports = Hotload
