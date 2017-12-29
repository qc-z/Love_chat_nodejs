'use strict'

var mongoose = require('mongoose')
var AgentuserSchema = require('../schemas/agentuser')
var Agentuser = mongoose.model('Agentuser', AgentuserSchema)

module.exports = Agentuser
