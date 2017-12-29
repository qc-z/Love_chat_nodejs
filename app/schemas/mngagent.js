'use strict'

var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var SALT_WORK_FACTOR = 10
var Schema = mongoose.Schema
// var ObjectId = Schema.Types.ObjectId
// var Mixed = Schema.Types.Mixed


/**
 * Mngagent Schema
 */

var MngagentSchema = new Schema({
  id: String,
  role: String, // business // sys
  nickname: String,
  mobile: String,
  email: String,
  password: String,
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

// MngagentSchema.index({loc: '2dsphere'})

MngagentSchema.pre('save', function(next) {
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

/**
 * Pre-save hook
 */
MngagentSchema.pre('save', function(next) {
  var mngagent = this

  // if (authTypes.indexOf(this.provider) !== -1) {
  //   return next(new Error('Invalid password'))
  // }
  if (!mngagent.isModified('password')) return next()

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if (err) return next(err)
    bcrypt.hash(mngagent.password, salt, function(error, hash) {
      if (error) return next(error)
      mngagent.password = hash
      next()
    })
  })
})


/**
 * Methods
 */
MngagentSchema.methods = {

  comparePassword: function(_password, password) {
    return function(cb) {
      bcrypt.compare(_password, password, function(err, isMatch) {
        cb(err, isMatch)
      })
    }
  }
}

module.exports = MngagentSchema
