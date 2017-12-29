'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const schedule = require('node-schedule')
const redis = require('redis')
const wrapper = require('co-redis')
const moment = require('moment')
const Notice = mongoose.model('Notice')
const Pay = mongoose.model('Pay')

const online = redis.createClient()
const onlineCo = wrapper(online)


// 每天定时清除用户浏览次数记录
schedule.scheduleJob('0 0 * * *', function() {
  console.log('===delete global.browse===', new Date())
  delete global.browse
})

// 每天定时清除用户过期的VIP
schedule.scheduleJob('0 0 * * *', function() {
	console.log('===delete vip expire===', new Date())

  User.find({vipLevel: {$in: ['vip1', 'vip2', 'vip3', 'vip4']}}, function(err, users) {

    for (let i = 0; i < users.length; i++) {
      let existUser = users[i]
      if(existUser.vip) {
        let now = new Date().getTime()
        let to = new Date(existUser.vip.to).getTime()
        if(to < now) {
          existUser.vip.role = false
          existUser.vipLevel = 'vip0'
          existUser.save()
        }
      }
    }
  })
})


/**
 * @api {post} /boss/heartbeat  心跳包
 * @apiName heartbeat
 * @apiGroup Online
 * @apiPermission User
 *
 * @apiDescription 每 10秒发一次心跳包 判断这个用户 活跃状态, 用户登录以后发，不用传参数
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/heartbeat
 *
 * @apiSuccess {Object}   data 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *        ret: 1, // 1 成功 0 失败
 *        err: ok
 *     }
 */
exports.heartbeat = function *(next) {

	// let id = this.request.body.id
	// if(!id) {
	// 	return (this.body = {
	// 		ret: 0,
	// 		err: 'id 必填'
	// 	})
	// }

  if(!this.session.user) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }
  let id = this.session.user.userId

	yield onlineCo.set(id, 'online', 'EX', 15)

	this.body = {
		ret: 1,
		err: 'ok'
	}
}

/**
 * @api {get} /boss/logout  退出登录
 * @apiName logout
 * @apiGroup Online
 * @apiPermission User
 *
 * @apiDescription 退出登录后，session 会移除，在线状态转为离线
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/logout
 *
 * @apiSuccess {Object}   data 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *        ret: 1, // 1 成功 0 失败
 *        err: ok
 *     }
 */
exports.logout = function *(next) {
	if(!this.session.user) {
		return (this.body = {
			ret: 1,
			err: 'ok'
		})
	}
	yield onlineCo.del(this.session.user.userId)
  delete this.session.user

	this.body = {
		ret: 1,
		err: 'ok'
	}
}

exports.getOnline = function *(next) {

	let onlines = yield onlineCo.keys('*')
	let aa = yield onlineCo.get('aa')
	console.log('onlines=====', onlines)
	console.log('aa=====', aa)
	this.body = {
		ret: 1,
		onlines: onlines,
		aa: aa
	}
}


/**
 * @api {post} /boss/noticedel  用户删除通知
 * @apiName notice del
 * @apiGroup Common
 * @apiPermission User
 *
 * @apiDescription 用户删除通知
 *
 * @apiParam {String} id   消息 id
 * @apiParam {String} all   'yes' 表示删除所有
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/noticedel
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Number}   unreadNum   10 未读消息数
 * @apiSuccess {String}   err ok
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "unreadNum": 11,
 *       "err": 'ok'
 *     }
 */
exports.noticedel = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

  let id = this.request.body.id || ''
  let all = this.request.body.all || ''

  let userid = this.session.user.userId || ''

  if(all == 'yes') {
  	let notices = yield Notice.find({userid: userid}).exec()
	  if(notices && notices.length > 0) {
	  	for (let i = 0; i < notices.length; i++) {
	  		yield notices[i].remove()
	  	}
	  }
  }
  else {
	  let notice = yield Notice.findOne({_id: id, userid: userid}).exec()
	  if (!notice) {
	    return (this.body = {
	      ret: 0,
	      err: '改消息不存在'
	    })
	  }
	  yield notice.remove()
  }

  let unreads = yield Notice.find({userid: userid, readed: false}).exec()

  let unreadNum = unreads.length




  this.body = {
    ret: 1,
    unreadNum: unreadNum,
    err: 'ok'
  }

}

/**
 * @api {get} /boss/paylist  用户支付列表
 * @apiName pay list
 * @apiGroup Common
 * @apiPermission User
 *
 * @apiDescription 用户通知列表
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/paylist
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Object}   list [{notice1}, {notice2}]  通知支付列表
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "list": [{list1},{list2}]
 *     }
 */
exports.paylist = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

  let userid = this.session.user.userId || ''

  let list = yield Pay.find({userid: userid}).sort({'meta.createdAt': -1}).exec()


  this.body = {
  	ret: 1,
  	list: list
  }

}


/**
 * @api {get} /boss/noticeList  用户通知列表
 * @apiName notice list
 * @apiGroup Common
 * @apiPermission User
 *
 * @apiDescription 用户通知列表
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/noticeList
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Number}   unreadNum   10 未读消息数
 * @apiSuccess {Object}   list [{notice1}, {notice2}]  通知消息列表
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "unreadNum": 11,
 *       "list": [{list1},{list2}]
 *     }
 */
exports.noticeList = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

  let userid = this.session.user.userId || ''

  let list = yield Notice.find({userid: userid}).sort({'meta.createdAt': -1}).limit(30).exec()

  let unreads = yield Notice.find({userid: userid, readed: false}).exec()

  let unreadNum = unreads.length

  if(unreads && unreads.length > 0) {
    for (var i = 0; i < unreads.length; i++) {
      let notice = unreads[i]
      notice.readed = true
      yield notice.save()
    }
  }

  if(list && list.length > 0) {
  	for (var i = 0; i < list.length; i++) {
  		list[i].locationTime = moment(list[i].meta.createdAt).format('YYYY-MM-DD HH:mm:ss')
  	}
  }


  this.body = {
  	ret: 1,
    unreadNum: unreadNum,
  	list: list
  }

}

/**
 * @api {get} /boss/unnotice  用户通知 未读条数
 * @apiName unnotice
 * @apiGroup Common
 * @apiPermission User
 *
 * @apiDescription 用户通知 未读条数
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/unnotice
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Number}   unreadNum   10 未读消息数
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "unreadNum": 11
 *     }
 */
exports.unnotice = function *(next) {
  if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

  let userid = this.session.user.userId || ''

  let unreads = yield Notice.count({userid: userid, readed: false}).exec()

  this.body = {
    ret: 1,
    unreadNum: unreads
  }

}






