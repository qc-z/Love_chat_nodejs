'use strict'
  
var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed
  
/**
 * Notice Schema
 */

var NoticeSchema = new Schema({
  userid: {type: ObjectId, ref: 'User'},
  msgType: {
    type: String,
    default: 'text'
  },
  content: String,
  thatUser: {type: ObjectId, ref: 'User'},
  readed: {
    type: Boolean,
    default: false
  },
  level: {
    type: String,
    default: 'normal'
  },
  locationTime: String,
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

NoticeSchema.pre('save', function(next) {
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

module.exports = NoticeSchema
