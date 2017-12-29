'use strict'
  
var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed
  
/**
 * Chat Schema
 */

var ChatSchema = new Schema({
  fromid: {type: ObjectId, ref: 'User'},
  toid: {type: ObjectId, ref: 'User'},
  msgType: {
    type: String,
    default: 'text'
  },
  content: String,
  readed: {
    type: Boolean,
    default: false
  },
  fromdel: {
    type: String,
    default: 'no'
  },
  todel: {
    type: String,
    default: 'no'
  },
  photo: {
    type: String,
    default: 'ing'
  },
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

ChatSchema.pre('save', function(next) {
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

module.exports = ChatSchema
