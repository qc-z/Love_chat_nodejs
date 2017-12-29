'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

/**
 * Code Schema
 */

var CouponSchema = new Schema({
  createCodeid: {type: ObjectId, ref: 'User'},
  //后台人员添加就用后台id
  userid: {type: ObjectId, ref: 'User'},
  //邀请码绑定的业务员
  agentid: {type: ObjectId, ref: 'Agent'},
  //使用本邀请码的会员ID
  useCodeid: [],
  //邀请码生产方式
  methods: String,
  //邀请码
  content: String,
  //邀请码使用次数
  useLimit:{
    type: Number,
    default: 1
  },
  // vip 增加时间
  vipTime: {
    type: Number,
    default: 259200000
  },
  //能否使用
  isUse:{
    type: Boolean,
    default: true
  },
  meta: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    //有效期
    endAt: {
      type: Date,
      default: Date.now
    },
    //使用日期
    useAt: {
      type: Date
    }
  }
})

CouponSchema.pre('save', function(next) {
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

module.exports = CouponSchema
