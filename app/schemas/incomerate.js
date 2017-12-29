'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed


/**
 * Incomerate Schema
 */

var IncomerateSchema = new Schema({
  createrid: {type: ObjectId, ref: 'Mngagent'},
  tax: Number,
  bossRate: Number,
  channelRate: Number,
  salesRate: Number,
  meta: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
})

IncomerateSchema.pre('save', function(next) {
  if (this.isNew) {
    if (!this.meta.createdAt) {
      this.meta.createdAt = this.meta.updatedAt = Date.now()
    }
  }
  else {
    this.meta.updatedAt = Date.now()
  }
  next()
})


module.exports = IncomerateSchema


