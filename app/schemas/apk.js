'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.Types.ObjectId
var Mixed = Schema.Types.Mixed

/**
 * Code Schema
 */

var ApkSchema = new Schema({
  //唯一id，表示每个发行版本的唯一id
  id: String,
  //渠道号的别名，每个渠道号取拼音或英文首字母，比如：app store=as 应用宝=yyb 小米=xm 360=360= 华为=hw ..等，如遇到重名，则写全拼，由后台添加
  prrv: String,
  //英文字符串，表示渠道号的别名，每个渠道号取拼音或英文首字母，比如：app store=as 应用宝=yyb 小米=xm 360=360= 华为=hw ..等，如遇到重名，则写全拼，由后台添加
  vest: String,
  //版本号
  versionName: String,
  //版本更新次数
  versionCode: Number,
  //编码表示男性或者女性的支付开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
  pay: String,
  //编码表示男性或者女性的邀请码开关，比如00 01 10 11 第一位表示男性 第二位表示女性，如：00 男和女都关，11 男和女都开, 01 男的关女的开
  coupon: String,
  // , 邀请码必填，分男女
  couponBitian: String,
  // yes or no , 邀请码 yes 是必填，no 是选填
  couponNeed: String,
  //是否显示伪会员数据开关, 由于会员列表完全是由后端控制，app不需要改
  shiel: String,
  //下载地址
  download: String,
  // 版本状态 ， ing 表示审核版本，success 表示正式版本
  status: String,
  // 是否隐藏VIP
  vipHide: String,
  // 支付方式隐藏
  alipay: String,
  weixin: String,
  applepay: String,
  gpay: String,
  // 邀请码英文提示
  entips: String,
  // 邀请码繁体提示
  fttips: String,
  //是否强制更新
  updateHard: String,
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

ApkSchema.pre('save', function(next) {
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

module.exports = ApkSchema
