'use strict'

var mongoose = require('mongoose')
var IncomerateSchema = require('../schemas/incomerate')
var Incomerate = mongoose.model('Incomerate', IncomerateSchema)

module.exports = Incomerate
