'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Trace = mongoose.model('Trace')
const Coupon = mongoose.model('Coupon')
const xlsx = require('node-xlsx')
const moment = require('moment')
const facepp = require('../libs/facepp')

exports.fixImg = function *(next) {
  let users = yield User.find({mock: true}).exec()

  function function_name(src) {
    var _src = src + '?x-oss-process=image/info'
    return new Promise(function(resolve, reject) {
       let x,y,w,h,mw,mh
        request(_src).then(function(data) {
            try{
              data = JSON.parse(data)
            } catch(errr) {
              data = data
            }
        　　mw = data.ImageWidth.value
            mw = Number(mw)
        　　mh = data.ImageHeight.value
            mh = Number(mh)
            if(mh > mw) {
                h = mw
                w = mw
                x = 0
                y = (mh - mw)/2
            } else {
                h = mh
                w = mh
                y = 0
                x = (mw - mh)/2
            }
            x = Math.floor(x)
            y = Math.floor(y)
            w = Math.floor(w)
            h = Math.floor(h)
            console.log(x,y,w,h)
            resolve(src + '?x-oss-process=image/crop,x_'+ x +',y_'+ y +',w_'+ w +',h_' + h)
          })
        })
    }

  for (let i = users.length - 1; i >= 0; i--) {
    let user = users[i]

    if(user.photoPri.length > 0) {
      for (let i = user.photoPri.length - 1; i >= 0; i--) {
        console.log('user.photoPri[i].addr===', user.photoPri[i].addr)
        let pri = user.photoPri[i].addr
        user.photoPri[i].addr = yield function_name(pri)
      }
    }

    if(user.photoPub.length > 0) {
      for (let i = user.photoPub.length - 1; i >= 0; i--) {
        let pri = user.photoPub[i].addr
        user.photoPub[i].addr = yield function_name(pri)
        console.log('user.photoPub[i].addr===', user.photoPub[i].addr)
      }
    }

    user.markModified('photoPub')
    user.markModified('photoPri')
    yield user.save()
  }

  this.body = {
    ret: '1',
    err: 90
  }
}

exports.exportCoupon = function *(next) {
  if(this.query.key !== 'areyoukittyme') {
    return this.body = {
      ret: 0,
      msg: 'getOut'
    }
  }
  let coupons = yield Coupon.find().exec()

  let startestArrs = [['邀请码', '生成时间', '到期时间', '可使用次数']]
  for(let i in coupons) {
    let startestArr = []
    startestArr.push(coupons[i].content)
    startestArr.push(moment(coupons[i].meta.createdAt).format('YYYY-MM-DD HH:mm'))
    startestArr.push(moment(coupons[i].meta.endAt).format('YYYY-MM-DD HH:mm'))
    startestArr.push(coupons[i].useLimit)
    startestArrs.push(startestArr)
  }

  var buffer = xlsx.build([{name: '邀请码', data: startestArrs}]) // returns a buffer
  var excelname = 'coupons.xlsx'

  this.set('Content-disposition', 'attachment; filename=' + excelname)
  this.set('Content-type', 'application/vnd.openxmlformats')

  this.body = buffer
}

exports.coupon = function *(next) {
  if(this.query.key !== 'areyoukittyme') {
    return this.body = {
      ret: 0,
      msg: 'getOut'
    }
  }

  function createInviteCode() {
    let s = []
    let chars = 'qwertyuiopasdfghjklzxcvbnm'
    for (let i = 0; i < 4; i++) {
        s[i] = chars.substr(Math.floor(Math.random() * 26), 1)
    }
    let code = s.join('')
    let num = '0123456789'
    let number = num.substr(Math.floor(Math.random() * 10), 1)
    return code+number
  }

  for (let i = 10; i >= 1; i--) {
    let newCode = new Coupon({
      //默认系统管理员
      methods: 'admin',
      content: createInviteCode(),
      useLimit: 1000,
      meta: {
        //有效期一年
        endAt: '2017-09-05T12:00:00.829Z'
      }
    })
    yield newCode.save()
  }

  for (let i = 200; i >= 1; i--) {
    let newCode = new Coupon({
      //默认系统管理员
      methods: 'admin',
      content: createInviteCode(),
      useLimit: 1,
      meta: {
        //有效期一年
        endAt: '2017-09-20T12:00:00.829Z'
      }
    })
    yield newCode.save()
  }

  this.body = {
    ret: '1',
    err: 90
  }
}

exports.faceTest = function *(next) {
  if(this.query.key !== 'luban7hao') {
    return this.body = {
      ret: 0,
      msg: 'getOut'
    }
  }

  let query = {
    nickname: {$exists: true},
    avatar: {$exists: true},
    mock:false
  }

  let users = yield User.find(query, {avatar: 1}).exec()
  for (let i = 0; i < users.length; i++) {
    let score
    try {
      score = yield facepp.faceTest(users[i].avatar) 
    }
    catch(err) {
      console.log(err)
      score = Math.random().toFixed(1) * 10 + 65
    }
    users[i].faceScore = Number(score.toFixed(1))
    yield users[i].save()
  }

  this.body = {
    ret: '1',
    user: users
  }
}


exports.index = function *(next) {

  if(this.query.ranking == 'yes') {
    let traces = yield Trace.find().populate({path: 'userid'}).exec()
    for (let i = 0; i < traces.length; i++) {
      let trace = traces[i]
      if(trace.userid && trace.cared) {
        trace.sex = trace.userid.sex
        trace.careNum = trace.cared.length || 0
        yield trace.save()
      }
    }
  }

  if(this.query.auditContent == 'yes') {
    let users = yield User.find().exec()

    for (let i = 0; i < users.length; i++) {
      let user = users[i]
      if(user.auditContent) {
        if(user.auditContent.work == 'true') {
          user.auditContent.work = '1'
        }
        else if(user.auditContent.work == 'false') {
          user.auditContent.work = '0'
        }
        if(user.auditContent.nickname == 'true') {
          user.auditContent.nickname = '1'
        }
        else if(user.auditContent.nickname == 'false') {
          user.auditContent.nickname = '0'
        }
        if(user.auditContent.selfInfo == 'true') {
          user.auditContent.selfInfo = '1'
        }
        else if(user.auditContent.selfInfo == 'false') {
          user.auditContent.selfInfo = '0'
        }
        if(user.auditContent.character == 'true') {
          user.auditContent.character = '1'
        }
        else if(user.auditContent.character == 'false') {
          user.auditContent.character = '0'
        }
        if(user.auditContent.looking == 'true') {
          user.auditContent.looking = '1'
        }
        else if(user.auditContent.looking == 'false') {
          user.auditContent.looking = '0'
        }
        yield user.save()
      }
    }
  }

  if(this.query.vipLevel == 'yes') {
    let users = yield User.find().exec()
    for (let i = 0; i < users.length; i++) {
      let user = users[i]
      if(!user.vipLevel || user.vipLevel == 'vip0') {
        if(user.vip && user.vip.role) {
          user.vipLevel = 'vip1'
        } else {
          user.vipLevel = 'vip0'
        }
        yield user.save()
      }
    }
  }

  if (this.query.mock == 'yes') {
    let users = yield User.find({mock: false}).exec()
    let ineed = ['经济帮助', '浪漫旅行', '温馨约会', '情感补充', '恋爱婚姻', '人生指导', '浪漫旅行', '温馨约会', '情感补充', '恋爱婚姻']
    let hopeful = ['玩伴关系', '激情关系', '情人关系', '恋爱关系', '婚姻关系', '玩伴关系', '激情关系', '情人关系', '恋爱关系', '婚姻关系']


    for (let i = 0; i < users.length; i++) {
      let user = users[i]
      let random = Math.floor(Math.random() * 10)
      if(!user.iNeed) {
        user.iNeed = ineed[random]
      }
      if(!user.hopeful) {
        user.hopeful = hopeful[random]
      }
      if(!user.afford) {
        user.afford = ineed[random]
      }
      yield user.save()
    }
  }

  if(this.query.addr == 'yes') {
    let users = yield User.find({mock: false}).exec()
    for (let i = 0; i < users.length; i++) {
      let user = users[i]
      let addr = user.addr
      if(addr) {
        let addrs = addr.split('-')
        if(addrs.length == 2) {
          user.province = addrs[0]
          user.city = addrs[1]
        }
        yield user.save()
      }
    }
  }

	this.body = {
		ret: '0',
		err: 90
	}
}

