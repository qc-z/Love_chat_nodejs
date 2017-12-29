'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

/**
 * Wish Schema
 */

var WishSchema = new Schema({
  userid: {type: ObjectId, ref: 'User'},
  nickname: String,
  user: {},
  mobile: String,
  sex: String,
  avatar: String,
  content: String,
  imgUrl:String,
  Forwarding:{
    type: Number,
    default: 0
  },
  auditStatus: {
    type: String,
    default: 'ing'
  },
  auditContent: {
    content: {
      type: String,
      default: 'ing'
    },
    imgUrl: {
      type: String,
      default: 'ing'
    }
  },
  auditReson: {
    content: String,
    imgUrl: String
  },
  vipLevel: String,
  isLove: {
    type: String,
  },
  loved: [],
  auditAt: {
    type: Date
  },
  created:String,
  sortAt:{
    type: Date
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
WishSchema.pre('save', function(next) {
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

module.exports = WishSchema
