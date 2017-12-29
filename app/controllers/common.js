'use strict'

const mongoose = require('mongoose')
// const User = mongoose.model('User')
const Notice = mongoose.model('Notice')
const moment = require('moment')


/**
 * @api {get} /noticeList  用户通知列表
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
