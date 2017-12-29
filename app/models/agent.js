'use strict'

var mongoose = require('mongoose')
var AgentSchema = require('../schemas/agent')
var Agent = mongoose.model('Agent', AgentSchema)

module.exports = Agent
