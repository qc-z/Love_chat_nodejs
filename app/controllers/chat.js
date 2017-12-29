'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Chat = mongoose.model('Chat')
const Sensitive = mongoose.model('Sensitive')
const Chatbox = mongoose.model('Chatbox')
const Trace = mongoose.model('Trace')
const moment = require('moment')
const jpush = require('../service/jpush')
const role = require('../libs/role')
const config = require('../../config/config')


exports.index = function *(next) {
	let id = '171976fa8ab7b1e0406'
	let userId = '5964397c4e42f4222c6f83b5'
	let msg = '约不约，美女'
	if(this.query.id) {
		id = this.query.id
	}
	if(this.query.userId) {
		userId = this.query.userId
	}
	if(this.query.msg) {
		msg = this.query.msg
	}
	// let result = yield jpush.chat('ios', '171976fa8ab7b1e0406', '我是土著', '中文试试能不能收到', true, '596462040446aa25c2de0efd')
	let result = yield jpush.chat('ios', id, msg, msg, true, userId)
	this.body = {
		ret: '0',
		err: result
	}
}

/**
 * @api {post} /replyPhotoPri  回复查看私照
 * @apiName reply PhotoPri
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 用户回复是否同意查看让对方查看私照
 *
 * @apiParam {String} id 用户id，回复谁就是谁的ID
 * @apiParam {String} reply yes 表示同意，no 表示拒绝
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/replyPhotoPri
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok"
 *     }
 */
exports.replyPhotoPri = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

	let id = this.request.body.id || ''
	let reply = this.request.body.reply
	let userid = this.session.user.userId
	let state
	if(reply == 'yes') {
		state = 'yes'
	}
	if(reply == 'no') {
		state = 'no'
	}	

	let user = yield User.findOne({_id: userid}, {nickname: 1, oldName: 1, sex: 1}).exec()

	if(reply == 'yes') {
		let trace = yield Trace.findOne({userid: id}).exec()
		if(trace.photoPri) {
			if(trace.photoPri.indexOf(userid) == -1) {
				trace.photoPri.push(userid)
				trace.markModified('photoPri')
				yield trace.save()
			}
		} else {
			trace.photoPri = []
			trace.photoPri.push(userid)
			yield trace.save()
		}

		let _trace = yield Trace.findOne({userid: userid}).exec()
		if(_trace.photoPried) {
			if(_trace.photoPried.indexOf(id) == -1) {
				_trace.photoPried.push(id)
				_trace.markModified('photoPried')
				yield _trace.save()
			}
		} else {
			_trace.photoPri = []
			_trace.photoPried.push(id)
			yield _trace.save()
		}
	}

	// 推送通知对方，已经同意查看私照
	let userTo = yield User.findOne({_id: id}).exec()
	let result
	if(userTo.platform && userTo.registration_id) {
		let notice = user.nickname + '私照请求已通过，到主页即可查看'
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = '有成功人士私照请求已通过，到主页即可查看'
      }
      if(user.sex == '2') {
        notice = '有魅力甜心私照请求已通过，到主页即可查看'
      }
    }

		let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
		try {
			let boss = 'no'
	    if(userTo.from == 'boss') {
	      boss = 'yes'
	    }
			result = yield jpush.replyPhotoPri(userTo.platform, userTo.registration_id, notice, notice, reply, id, msgNum, boss)
		} catch(_err) {
			console.log(_err)
		}
		console.log('推送结果', result)
	}
	let chats = yield Chat.find({toid: userid, fromid: id, msgType:'requirePhotoPri'}).exec()
	if(chats && chats.length > 0) {
		for (var i = chats.length - 1; i >= 0; i--) {
			chats[i].photo = reply
			yield chats[i].save()
		}
	}


	this.body = {
		ret: 1,
		msg: 'ok',
		state:state
	}

}

/**
 * @api {post} /requirePhotoPri  请求查看私照
 * @apiName require PhotoPri
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 请求查看对方私照。
 *
 * @apiParam {String} to 对方（接收方）的用户 ID 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/requirePhotoPri
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   msg 'ok'
 * @apiSuccess {String}   acess true 表示可以发送请求查看私照，false 不允许
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": 'ok',
 *			 "acess": true
 *     }
 */
exports.requirePhotoPri = function *(next) {

	if(!this.session.user) {
		return (this.body = {
			ret: 0,
			err: '用户没有登录'
		})
	}

	let to = this.request.body.to
	let _id = this.session.user.userId || ''
	let user = yield User.findOne({_id: _id}).populate({path: 'traceid'}).exec()
	let userTo = yield User.findOne({_id: to}).exec()

	if(userTo.isActive == 'no') {
    return (this.body = {
      ret: 5,
      err: '该用户已经被封号处理'
    })
  }

	if(user.isActive == 'no') {
		delete this.session.user
    return (this.body = {
      ret: 5,
      err: '你已经被封号处理'
    })
  }


	let isHate = false
	let isHated = false

	if(user.traceid.hate && user.traceid.hate && user.traceid.hate.length > 0) {
    let hates = user.traceid.hate
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      if(to.toString() === hateid.toString()) {
        isHate = true
      }
    }
  }

  if(isHate) {
  	return (this.body = {
			ret: 5,
			msg: '你已把对方屏蔽，无法发送，取消屏蔽后尝试'
		})
  }

  if(user.traceid.hated && user.traceid.hated && user.traceid.hated.length > 0) {
    let hates = user.traceid.hated
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      if(to.toString() === hateid.toString()) {
        isHated = true
      }
    }
  }

  if(isHated) {
  	return (this.body = {
			ret: 6,
			msg: '你已被对方屏蔽，无法发送'
		})
  }


	// 查看对方是否有读信息的权限
	if(!userTo) {
		return (this.body = {
			ret: 0,
			err: '你所发送的对象不存在'
		})
	}

	// 查看用户是否有发送信息的权限
	let acess = yield role.checkSendRole(user)
	console.log('requirePhotoPri====', acess)

	if(acess.ret !== 1) {
		return (this.body = {
			ret: acess.ret,
			acess: false,
			msg: acess.err
		})
	}

	if(user.traceid && user.traceid.photoPri && user.traceid.photoPri.length > 0) {
		if(user.traceid.photoPri.indexOf(to) > -1) {
			return (this.body = {
				ret: 2,
				msg: '该用户已经允许你查看私照'
			})
		}
	}

	// 给重复发送做限制
	let chats = yield Chat.find({fromid: _id, toid: to, msgType: 'requirePhotoPri'}).sort({'meta.createdAt': -1}).exec()
	let _chat = chats[0]
	let now = new Date().getTime() - 3600000

	if(_chat && _chat.meta.createdAt.getTime() > now) {
		let time = moment(_chat.meta.createdAt).format('HH:mm:ss')
		let lessTime = _chat.meta.createdAt.getTime() - now
		lessTime  = lessTime / 60000
		lessTime = Math.floor(lessTime)
		return (this.body = {
				ret: 3,
				lessTime: lessTime,
				msg: '你在' + time + '已经请求过， 请' + lessTime + '分钟后在尝试'
			})
	}




	let newchat = new Chat({
		fromid: _id,
		toid: to,
		msgType: 'requirePhotoPri',
		content: '请求查看私照'
	})

	yield newchat.save()

	let msg = '请求查看私照'
	let chatbox = yield Chatbox.findOne({userid: _id, to: to}).exec()
	if(chatbox) {
		chatbox.content = msg
	} else {
		chatbox = new Chatbox({
			userid: _id,
			to: to,
			content: msg
		})
	}

	yield chatbox.save()

	let chatboxTo = yield Chatbox.findOne({userid: to, to: _id}).exec()
	if(chatboxTo) {
		chatboxTo.content = msg
	} else {
		chatboxTo = new Chatbox({
			userid: to,
			to: _id,
			content: msg
		})
	}

	yield chatboxTo.save()



	let acessTo = yield role.checkReadRole(userTo)

	let _acessTo = acessTo.ret == 1 ? true : false

	let result
	if(userTo.platform && userTo.registration_id) {
		let notice = user.nickname + '请求查看您的私照'
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = '有成功人士请求查看您的私照'
      }
      if(user.sex == '2') {
        notice = '有魅力甜心请求查看您的私照'
      }
    }
		let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
		try {
			let boss = 'no'
	    if(userTo.from == 'boss') {
	      boss = 'yes'
	    }
			result = yield jpush.requirePhotoPri(userTo.platform, userTo.registration_id, notice, notice, _acessTo, _id, msgNum, boss)
		} catch(_err) {
			console.log(_err)
		}
		console.log('推送结果', result)
	}

	let _acess = acess.ret == 1 ? true : false

	this.body = {
		ret: 1,
		msg: 'ok',
		acess: _acess
	}
}

/**
 * @api {post} /sendmsg  发送聊天信息
 * @apiName send msg
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 发送聊天信息接口,必须登录以后才能调用此接口。
 *
 * @apiParam {String} to 对方（接收方）的用户 ID 
 * @apiParam {String} msg 发送内容
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/sendmsg
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {String}   msgid 消息ID，用来调用消息是否 阅读 的接口，
 * @apiSuccess {Object}   result   推送结果 {sendno: '12322', msg_id: 'msg_id'}
 * @apiSuccess {String}   acess  是否有发送权限 true or false, 没有权限则不发送
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": {fromid: xx, toid: xx, content: msg, ...},
 *       "result": {sendno: '12322', msg_id: 'msg_id'},
 *       "acess": true
 *     }
 */
exports.sendmsg = function *(next) {

	if(!this.session.user) {
		return (this.body = {
			ret: 0,
			err: '用户没有登录'
		})
	}

	let msg = this.request.body.msg
	let to = this.request.body.to || ''
	let _id = this.session.user.userId || ''

	if(!_id || !to || msg === '' || to === 'null' || to === 'undefined') {
		return (this.body = {
			ret: 0,
			err: 'msg 或者 to 不能为空'
		})
	}

	let sensitive = yield Sensitive.findOne({content: msg}).exec()
	console.log('sensitive===', sensitive)

	if(sensitive) {
    return (this.body = {
      ret: 5,
      err: msg + '为敏感信息不允许发送'
    })
  }


	let user = yield User.findOne({_id: _id}).populate({path: 'traceid'}).exec()

	let userTo = yield User.findOne({_id: to}).populate({path: 'traceid'}).exec()
	if(!userTo) {
		return (this.body = {
			ret: 0,
			err: '你所发送的对象不存在'
		})
	}

	if(userTo.isActive == 'no') {
    return (this.body = {
      ret: 5,
      err: '该用户已经被封号处理'
    })
  }

	if(user.isActive == 'no') {
		delete this.session.user
    return (this.body = {
      ret: 5,
      err: '你已经被封号处理'
    })
  }

	let isHate = false
	let isHated = false

	if(user.traceid.hate && user.traceid.hate && user.traceid.hate.length > 0) {
    let hates = user.traceid.hate
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      if(to.toString() === hateid.toString()) {
        isHate = true
      }
    }
  }

  if(isHate) {
  	return (this.body = {
			ret: 5,
			msg: '你已把对方屏蔽，无法发送，取消屏蔽后尝试'
		})
  }

  if(user.traceid.hated && user.traceid.hated && user.traceid.hated.length > 0) {
    let hates = user.traceid.hated
    for (var i = 0; i < hates.length; i++) {
      let hateid = hates[i]
      if(to.toString() === hateid.toString()) {
        isHated = true
      }
    }
  }

  if(isHated) {
  	return (this.body = {
			ret: 6,
			msg: '你已被对方屏蔽，无法发送'
		})
  }

	// 查看用户是否有发送信息的权限
	let acess = yield role.checkSendRole(user)
	console.log('sendmsg====', acess)

	if(acess.ret !== 1) {
		return (this.body = {
			ret: acess.ret,
			acess: false,
			msg: acess.err
		})
	}

	let newchat = new Chat({
		fromid: _id,
		toid: to,
		content: msg
	})

	yield newchat.save()

	let chatbox = yield Chatbox.findOne({userid: _id, to: to}).exec()
	if(chatbox) {
		chatbox.content = msg
	} else {
		chatbox = new Chatbox({
			userid: _id,
			to: to,
			content: msg
		})
	}

	yield chatbox.save()

	let chatboxTo = yield Chatbox.findOne({userid: to, to: _id}).exec()
	if(chatboxTo) {
		chatboxTo.content = msg
	} else {
		chatboxTo = new Chatbox({
			userid: to,
			to: _id,
			content: msg
		})
	}

	yield chatboxTo.save()

	// 查看对方是否有读信息的权限


	let acessTo = yield role.checkReadRole(userTo)


	let _acessTo = acessTo.ret == 1 ? true : false

	if(_acessTo) {
		if(user.vip && user.vip.role) {
			let trace = yield Trace.findOne({userid: to}, {targetChat: 1}).exec()
			// 如果你在对方的当前聊天框里面，直接返回对面已读你的消息
			if(trace.targetChat === _id) {
				let notice = userTo.nickname + 'read you message'
				let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
				newchat.readed = true
				yield newchat.save()
				// try {
				// 	yield jpush.readChat(user.platform, user.registration_id, 　notice, user.nickname, userTo._id, msgNum)
				// } catch(_err) {
				// 	console.log(_err)
				// }
			}
		}
	}

	let result
	if(userTo.platform && userTo.registration_id) {
		let notice = user.nickname + '给您发了一条消息'
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = '有成功人士给您发了一条消息'
      }
      if(user.sex == '2') {
        notice = '有魅力甜心给您发了一条消息'
      }
    }
		let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
		if(!_acessTo) {
			// notice = '你收到一条新消息，请升值VIP后查看'
			msg = '你收到一条新消息，请升级会员后查看'
		}
		try {
			let sound = userTo.traceid.soundChat
			let boss = 'no'
	    if(userTo.from == 'boss') {
	      boss = 'yes'
	    }
			result = yield jpush.chat(userTo.platform, userTo.registration_id, notice, msg, _acessTo, _id, msgNum, sound, boss)
		} catch(_err) {
			console.log(_err)
		}
		console.log('推送结果', result)
	}

	let _acess = acess.ret == 1 ? true : false

	this.body = {
		ret: 1,
		msgid: newchat._id,
		result: result,
		acess: _acess
	}
}

/**
 * @api {get} /readMsg  获取和某个人的聊天内容
 * @apiName read msg
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 根据用户ID获取和他聊天内容包括历史记录的接口,必须登录以后才能调用此接口。
 *
 * @apiParam {String} userId 聊天对象的用户 _id 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/readMsg
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Object}   chatTo  聊天对象的个人信息,头像，昵称，年龄等
 * @apiSuccess {Object}   chats  聊天记录 [{fromid:'xx', toid:'xx', msgType: 'text'..]
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 				 "chatTo": {nickname: 'chengge', age: 18, ..}
 *       "chats": [{
						fromid: xxx, 			// 发送方用户_id
					  toid: xxx,				// 接收方用户 _id
					  msgType: 'text',	// 消息类型
					  content: String,	// 消息内容
					  readed: false,		// 对方是否已经阅读消息
					  meta: {
					    createdAt: '2017-07-12T08:37:22.946Z', // 消息发送时间
					    updatedAt: '2017-07-12T08:37:22.946Z'  // 不管它
					  }
 				 },{第二条消息},{第三条消息}]
 *     }
 */
exports.readMsg = function *(next) {
	if(!this.session.user) {
		return (this.body = {
			ret: 0,
			err: '用户没有登录'
		})
	}

	// 打开的 对话对象的 用户id
	let chatId = this.query.userId

	let userId = this.session.user.userId

	if(!chatId) {
		return (this.body = {
			ret: 0,
			err: '用户聊天对象id 不存在'
		})
	}

	let user = yield User.findOne({_id: userId}).exec()

	let acess = yield role.checkReadRole(user)


	// 打开的 对话对象的 聊天记录
	let _chats = yield Chat.find({$or:[{fromid: chatId, toid: userId}, {fromid: userId, toid: chatId}]}).sort({'meta.createdAt': 1}).exec()
	let chats = yield Chat.find({fromid: chatId, toid: userId}).exec()

	if(chats && chats.length > 0) {
		for(let index in chats) {
			if(!chats[index].readed) {
				chats[index].readed = true
				yield chats[index].save()
			}
		}
	}


	if(acess.ret !== 1) {
		let chatAll
		if(acess.ret == 4) {
			chatAll = yield Chat.find({toid: userId}).sort({'meta.createdAt': 1}).exec()
			for (let i = 0; i < chatAll.length; i++) {
				if(i > 9) {
					chatAll[i].content = '查看10条信息权限已用完，请升级为会员'
				}
			}
		}

		for (let i = 0; i < _chats.length; i++) {
			if(_chats[i].toid.toString() === userId.toString()) {
				if(acess.ret == 4 && chatAll) {
					for (let j = 0; j < chatAll.length; j++) {
						if(_chats[i]._id.toString() === chatAll[j]._id.toString()) {
							_chats[i].content = chatAll[j].content
						}
					}
				}
				else {
					_chats[i].content = '你没权限查看消息，请升级为会员'
				}
			}
		}
	}

	let chat = yield User.findOne({_id: chatId}).populate({path: 'traceid'}).exec()
	// // 判断是否有看对方已读的权限，如果有，就通知，发消息的人，你的消息已读
	
	if(chat.auditContent && chat.auditContent.nickname && (chat.auditContent.nickname == 0 || chat.auditContent.nickname == 2)) {
				if(chat.oldName) {
					chat.nickname = chat.oldName
				}else{
					if(user.sex == 1) {
						chat.nickname = '魅力甜心'
					}else if(user.sex == 2) {
						chat.nickname = '成功男士'
					}
				}
				
			}

	if(chat.vip && chat.vip.role) {
		let notice = user.nickname + '阅读了您的消息'
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = '有成功人士阅读了您的消息'
      }
      if(user.sex == '2') {
        notice = '有魅力甜心阅读了您的消息'
      }
    }
		let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
		try {
			let sound = chat.traceid.soundChat
			let boss = 'no'
	    if(chat.from == 'boss') {
	      boss = 'yes'
	    }
			jpush.readChat(chat.platform, chat.registration_id, notice, user.nickname, user._id, msgNum, sound, boss)
		} catch(_err) {
			console.log(_err)
		}
	}

	let trace = yield Trace.findOne({userid: userId}).exec()
	// 保存用户的当前聊天对象
	trace.targetChat = chatId
	yield trace.save()

	// let uchats = yield Chat.find({fromid: userId, toid: chatId}).exec()

	// if(uchats && uchats.length > 0) {
	// 	chats = chats.concat(uchats)
	// 	chats = chats.sort(function(a, b) {
	// 		let at = new Date(a.meta.createdAt)
	// 		at = at.getTime()
	// 		let bt = new Date(b.meta.createdAt)
	// 		bt = bt.getTime()
	// 		return at > bt
	// 	})
	// }
	// console.log(_chats)

	this.body = {
		ret: 1,
		user: user,
		chatTo: chat,
		chats: _chats
	}
}

/**
 * @api {get} /getMsgs  获取你的消息盒子列表
 * @apiName msg box
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 获取你的消息盒子列表,必须登录以后才能调用此接口。
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getMsgs
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Boolean}   acess   true 或者 false；是否有查看消息的权限
 * @apiSuccess {Object}   chats  消息盒子列表
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "acess": true,
 *       "chats": [             // 消息盒子列表
		        {
		            "_id": "596444050446aa25c2de0ef5",								// 发消息给你的人的用户ID
		            "last_chat_content": "嘿，来一盘",                 // 最新一次消息内容
		            "last_chat_time": "2017-07-13T06:02:25.044Z",		// 最新一次消息时间
		            "user": {
		                "_id": "596444050446aa25c2de0ef5",
		                "vip": {                                  // vip 状态
		                    "to": "2017-07-12T08:37:22.946Z",
		                    "from": "2017-07-12T08:37:22.946Z",
		                    "role": true
		                },
		                "completion": 100  // 信息完整度
		            },
		            "unReaderNews": 14   // 未读消息数量
		        },
		        {用户2},
		        {用户3}
		    ]
 */
exports.getMsgs = function *(next) {
	if(!this.session.user) {
		return (this.body = {
			ret: 0,
			err: '用户没有登录'
		})
	}

	let userId = this.session.user.userId || ''

	let owner = yield User.findOne({_id: userId}).exec()
	let acess = yield role.checkReadRole(owner)

	let chatboxs = yield Chatbox.find({userid: userId}).populate('to', '_id nickname oldName auditContent avatar vip completion vipLevel').sort({'meta.updatedAt': -1}).exec()

	let results = []

	let nowDate = new Date().getTime()
	let	chatAll = yield Chat.find({toid: userId}).sort({'meta.createdAt': 1}).exec()

	for (let i = 0; i < chatAll.length; i++) {
		if(chatAll[i].meta && chatAll[i].meta.createdAt) {
			let createdExpr = chatAll[i].meta.createdAt.getTime() + 259200000
			if(nowDate > createdExpr && chatAll[i].readed == false) {
				chatAll[i].readed = true
				yield chatAll[i].save()
			}
		}
		if(acess.ret == 4 && i > 9) {
			chatAll[i].content = '查看10条信息权限已用完，请升级为会员'
		}
	}

	if(chatboxs && chatboxs.length > 0) {
		for (var i = 0; i < chatboxs.length; i++) {
			let chat = {}
			let chatbox = chatboxs[i]
			if(chatbox && chatbox.to && chatbox.to._id) {
				let fromid = chatbox.to._id
				let unReaderNews = yield Chat.count({toid: userId, readed: false, fromid: fromid}).exec()
				chat._id = chatbox.to._id
				chat.last_chat_time = chatbox.meta.updatedAt
				chat.last_chat_content = chatbox.content
				if(chatbox.to.auditContent && chatbox.to.auditContent.nickname && (chatbox.to.auditContent.nickname == 0 || chatbox.to.auditContent.nickname == 2)){
				if(chatbox.to.oldName) {
					chatbox.to.nickname = chatbox.to.oldName
				}else{
					if(owner.sex == 1) {
						chatbox.to.nickname = '魅力甜心'
					}else if(owner.sex == 2) {
						chatbox.to.nickname = '成功男士'
					}
				}
				
			}

			chat.user = chatbox.to
			chat.unReaderNews = unReaderNews
			if(acess.ret !== 1) {
				if(acess.ret == 4) {
					if(chatAll){
						for (let j = 0; j < chatAll.length; j++) {
							if(chat._id.toString() === chatAll[j].fromid.toString()) {
								chat.last_chat_content = chatAll[j].content
							}
						}
					}
				}
				else {
					if(chatAll){
						for (let j = 0; j < chatAll.length; j++) {
							if(chat._id.toString() === chatAll[j].fromid.toString()) {
								chat.last_chat_content = '你没权限查看消息，请升级为会员'
							}
						}
					}
				}
			}

			results.push(chat)	
			}
			
			
		}
	}

	let _acess = acess.ret == 1 ? true : false

	let msgNum = yield Chat.count({toid: userId, readed: false}).exec()
	this.body = {
		ret: 1,
		acess: _acess,
		sex: owner.sex,
		msgNum: msgNum,
		chats: results
	}
}
// exports.getMsgs = function *(next) {
// 	if(!this.session.user) {
// 		return (this.body = {
// 			ret: 0,
// 			err: '用户没有登录'
// 		})
// 	}

// 	let userId = this.session.user.userId || ''

// 	userId = mongoose.Types.ObjectId(userId)

// 	let owner = yield User.findOne({_id: userId}, {sex: 1, auditStatus: 1, avatar: 1, nickname: 1, completion: 1, vip: 1}).exec()
// 	let acess = yield role.checkReadRole(owner)


// 	let counts = yield Chat.aggregate([{$match: {toid: userId, readed: false}}, {$group : {_id : "$fromid", num_tutorial : {$sum : 1}}}])
// 	// let results = yield Chat.aggregate([{$match: {$or:[{toid: userId}, {fromid: userId}]}}, {$sort: {"meta.createdAt": 1}}, {$group : {_id : "$fromid", last_chat_time: {$last: "$meta.createdAt"}, last_chat_content: {$last: "$content"}, last_chat_toid: {$last: "$toid"}}}])
// 	let froms = yield Chat.aggregate([{$match: {toid: userId}}, {$sort: {"meta.createdAt": 1}}, {$group : {_id : "$fromid", last_chat_time: {$last: "$meta.createdAt"}, last_chat_content: {$last: "$content"}}}]).sort({'meta.createdAt': -1}).exec()
// 	let tos = yield Chat.aggregate([{$match: {fromid: userId}}, {$sort: {"meta.createdAt": 1}}, {$group : {_id : "$toid", last_chat_time: {$last: "$meta.createdAt"}, last_chat_content: {$last: "$content"}}}]).sort({'meta.createdAt': -1}).exec()


// 	if(froms && froms.length > 0) {
// 		for (let i = froms.length - 1; i >= 0; i--) {
// 			let from = froms[i]
// 			if(!acess) {
// 				from.last_chat_content = '你没权限查看消息，请升级为VIP'
// 			}
// 			if(tos && tos.length > 0) {
// 				for (var j = tos.length - 1; j >= 0; j--) {
// 					if(tos[j]._id && from._id && tos[j]._id.toString() === from._id.toString()) {
// 						let timeFrom = new Date(from.last_chat_time).getTime()
// 						let timeTo = new Date(tos[j].last_chat_time).getTime()
// 						if(timeTo <= timeFrom) {
// 							tos.splice(j, 1)
// 						} else {
// 							froms.splice(i, 1)
// 						}
// 					}
// 				}
// 			}
// 		}
// 	}

// 	let results = froms.concat(tos)

// 	if(results && results.length > 0) {
// 		for (let i = results.length - 1; i >= 0; i--) {
// 			let result = results[i]
// 			let user = yield User.findOne({_id: result._id}, {avatar: 1, nickname: 1, completion: 1, vip: 1}).exec()
// 			results[i].user = user
// 			if(counts && counts.length > 0) {
// 				for (let j = counts.length - 1; j >= 0; j--) {
// 					if(counts[j]._id && result._id && counts[j]._id.toString() === result._id.toString()) {
// 						console.log('counts[j].num_tutorial',counts[j].num_tutorial)
// 						results[i].unReaderNews = counts[j].num_tutorial
// 					}
// 				}
// 			} else {
// 				results[i].unReaderNews = 0
// 			}
// 		}
// 	}

// 	results.sort(function(a, b) {
// 		let c = new Date(b.last_chat_time).getTime() - new Date(a.last_chat_time).getTime()
// 		return c
// 	})

// 	let msgNum = yield Chat.count({toid: userId, readed: false}).exec()
// 	console.log(msgNum)
// 	this.body = {
// 		ret: 1,
// 		acess: acess,
// 		msgNum: msgNum,
// 		chats: results
// 	}
// }




