'use strict'

var mongoose = require('mongoose')
var MngagentSchema = require('../schemas/mngagent')
var Mngagent = mongoose.model('Mngagent', MngagentSchema)

module.exports = Mngagent
