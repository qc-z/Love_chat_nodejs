'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var ErrorSchema = new Schema({
  ip: String,
  method: String,
  referer: String,
  stack: String,
  status: Number,
  url: String,
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

ErrorSchema.pre('save', function(next) {
  if (this.isNew) {
    this.meta.createdAt = this.meta.updatedAt = Date.now()
  }
  else {
    this.meta.updatedAt = Date.now()
  }

  next()
})

module.exports = ErrorSchema
