'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

/**
 * Chatbox Schema
 */

var ChatboxSchema = new Schema({
  userid: {type: ObjectId, ref: 'User'}, // 自己id
  to: {type: ObjectId, ref: 'User'}, // 对方id
	content: String,
	readed: Boolean,
  unReaderNews: Number,
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

ChatboxSchema.pre('save', function(next) {
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

module.exports = ChatboxSchema
