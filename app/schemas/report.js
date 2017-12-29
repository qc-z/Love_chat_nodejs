'use strict'
  
var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed
  
/**
 * Report Schema
 */

var ReportSchema = new Schema({
  userid: {type: ObjectId, ref: 'User'},
  reportUserid: {type: ObjectId, ref: 'User'},
  content: String,
  enable: {
    type: String,
    default: 'ing'
  },
  imgUrl: String,
  auditResult: String,
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

ReportSchema.pre('save', function(next) {
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

module.exports = ReportSchema