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
const Msg = require('../libs/role').msg

const redis = require('redis')
const wrapper = require('co-redis')

const online = redis.createClient()
const onlineCo = wrapper(online)



/**
 * @api {get} /boss/getMsgs  获取你的消息盒子列表
 * @apiName msg box
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 获取你的消息盒子列表,必须登录以后才能调用此接口。
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getMsgs
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
		            "_id": "596444050446aa25c2de0ef5",				 // 发消息给你的人的用户ID
		            "last_chat_content": "嘿，来一盘",                 // 最新一次消息内容
		            "last_chat_time": "2017-07-13T06:02:25.044Z",	 // 最新一次消息时间
		            "user": {
		                "_id": "596444050446aa25c2de0ef5",
		                "vip": {                                     // vip 状态
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
			err: Msg(this.session.user.lan, 1)
		})
	}

	let userId = this.session.user.userId || ''

	let owner = yield User.findOne({_id: userId}).exec()
	let acess = yield role.checkReadRole(owner, this.session.user.lan)

	let chatboxs = yield Chatbox.find({userid: userId}).populate('to', '_id nickname oldName auditContent avatar oldAvatar vip completion vipLevel online').sort({'meta.updatedAt': -1}).exec()

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
			chatAll[i].content = Msg(this.session.user.lan, 50)
		}
	}

	// 在线标签
	let onlines = yield onlineCo.keys('*')

	if(chatboxs && chatboxs.length > 0) {
		for (var i = 0; i < chatboxs.length; i++) {
			let chat = {}
			let chatbox = chatboxs[i]
			if(chatbox && chatbox.to && chatbox.to._id) {
				let fromid = chatbox.to._id
				let unReaderNews = yield Chat.count({toid: userId, readed: false, fromid: fromid}).exec()
				chat._id = chatbox.to._id
				chat._delid = chatbox._id
				chat.toid = chatbox.to
				// console.log('ID=====',chatbox)
				chat.last_chat_time = chatbox.meta.updatedAt
				chat.last_chat_content = chatbox.content
				if(chatbox.to.auditContent && chatbox.to.auditContent.nickname && (chatbox.to.auditContent.nickname == 0 || chatbox.to.auditContent.nickname == 2)){
				if(chatbox.to.oldName) {
					chatbox.to.nickname = chatbox.to.oldName
				}else{
					if(owner.sex == 1) {
						chatbox.to.nickname = Msg(this.session.user.lan, 83)
					}else if(owner.sex == 2) {
						chatbox.to.nickname = Msg(this.session.user.lan, 82)
					}
				}

				if(onlines.indexOf(chat._id.toString()) > -1) {
					chat.online = 'yes'
					chatbox.to.online = 'yes'
				}
				
			}

			chat.user = chatbox.to
			chat.unReaderNews = unReaderNews
			if(acess.ret !== 1 && chatAll) {
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
								chat.last_chat_content = Msg(this.session.user.lan, 51)
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



/**
 * @api {get} /boss/readMsg  获取和某个人的聊天内容
 * @apiName read msg
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 根据用户ID获取和他聊天内容包括历史记录的接口,必须登录以后才能调用此接口。
 *
 * @apiParam {String} userId 聊天对象的用户 _id 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/readMsg
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
			err: Msg(this.session.user.lan, 51)
		})
	}

	// 打开的 对话对象的 用户id
	let chatId = this.query.userId

	let userId = this.session.user.userId

	if(!chatId) {
		return (this.body = {
			ret: 0,
			err: Msg(this.session.user.lan, 50)
		})
	}

	let user = yield User.findOne({_id: userId}).exec()

	let acess = yield role.checkReadRole(user, this.session.user.lan)


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
					chatAll[i].content = Msg(this.session.user.lan, 50)
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
					_chats[i].content = Msg(this.session.user.lan, 51)
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
						chat.nickname = Msg(this.session.user.lan, 83)
					}else if(user.sex == 2) {
						chat.nickname = Msg(this.session.user.lan, 82)
					}
				}
				
			}

	if(chat.vip && chat.vip.role) {
		let notice = user.nickname + Msg(this.session.user.lan, 53)
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = Msg(this.session.user.lan, 54)
      }
      if(user.sex == '2') {
        notice = Msg(this.session.user.lan, 55)
      }
    }
		let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
		try {
			let sound = chat.traceid.soundChat
			let boss = 'no'
	    if(chat.from == 'boss') {
	      boss = 'yes'
	    }
			jpush.readChat(chat.platform, chat.registration_id, notice, notice, user._id, msgNum, sound, boss)
		} catch(_err) {
			console.log(_err)
		}
	}

	let trace = yield Trace.findOne({userid: userId}).exec()
	// 保存用户的当前聊天对象
	trace.targetChat = chatId
	yield trace.save()
	this.body = {
		ret: 1,
		user: user,
		chatTo: chat,
		chats: _chats
	}
}


/**
 * @api {post} /boss/sendmsg  发送聊天信息
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
exports.sendMsg = function *(next) {
	if(!this.session.user) {
		return (this.body = {
			ret: 0,
			err: Msg(this.session.user.lan, 50)
		})
	}
	let msg = this.request.body.msg
	let to = this.request.body.to || ''
	let _id = this.session.user.userId || ''

	if(!_id || !to || msg === '' || to === 'null' || to === 'undefined') {
		return (this.body = {
			ret: 0,
			err: Msg(this.session.user.lan, 56)
		})
	}

	let sensitive = yield Sensitive.findOne({content: msg}).exec()

	if(sensitive) {
    return (this.body = {
      ret: 5,
      err: msg + Msg(this.session.user.lan, 57)
    })
  }


	let user = yield User.findOne({_id: _id}).populate({path: 'traceid'}).exec()

	let userTo = yield User.findOne({_id: to}).populate({path: 'traceid'}).exec()
	if(!userTo) {
		return (this.body = {
			ret: 0,
			err: Msg(this.session.user.lan, 52)
		})
	}

	if(userTo.isActive == 'no') {
    return (this.body = {
      ret: 5,
      err: Msg(this.session.user.lan, 58)
    })
  }

	if(user.isActive == 'no') {
		delete this.session.user
    return (this.body = {
      ret: 5,
      err: Msg(this.session.user.lan, 59)
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
			err: Msg(this.session.user.lan, 60)
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
			err: Msg(this.session.user.lan, 61)
		})
  }

	// 查看用户是否有发送信息的权限
	let acess = yield role.checkSendRole(user, this.session.user.lan)
	console.log('sendmsg====', acess)

	if(acess.ret !== 1) {
		return (this.body = {
			ret: acess.ret,
			acess: false,
			err: acess.err
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


	let acessTo = yield role.checkReadRole(userTo, this.session.user.lan)

	console.log('acessTo====', acessTo)

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
		let notice = user.nickname + Msg(this.session.user.lan, 114)
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = Msg(this.session.user.lan, 62)
      }
      if(user.sex == '2') {
        notice = Msg(this.session.user.lan, 63)
      }
    }
		let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
		if(!_acessTo) {
			// notice = '你收到一条新消息，请升值VIP后查看'
			msg = Msg(this.session.user.lan, 64)
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
 * @api {post} /boss/msgReaded  用户读了一条消息
 * @apiName msgReaded
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 用户读了一条消息
 *
 * @apiParam {String} id 用户id，用户读了谁的消息，就是谁的用户ID
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/msgReaded
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
 *       "err": "删除成功"
 *     }
 */
exports.msgReaded = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 1)
    })
  }
	let id = this.request.body.id
	if(!id) {
		return (this.body = {
	      ret: 0,
	      err: Msg(this.session.user.lan, 65)
	    })
	}

	let user = yield User.findOne({_id: id}).exec()
	let userid = this.session.user.userId

	let chats = yield Chat.find({fromid: id, toid: userid}).exec()
	if(chats && chats.length > 0) {	
		for (var i = 0; i < chats.length; i++) {
			let chat = chats[i]
			if(!chat.readed) {
				chat.readed = true
				yield chat.save()
			}
		}
	}
	let notice = user.nickname + Msg(this.session.user.lan, 53)
  if(!user.nickname) {
    if(user.sex == '1') {
      notice = Msg(this.session.user.lan, 54)
    }
    if(user.sex == '2') {
      notice = Msg(this.session.user.lan, 55)
    }
  }
	try {
		let msgNum = yield Chat.count({toid: id, readed: false}).exec()
		let boss = 'no'
    if(user.from == 'boss') {
      boss = 'yes'
    }
		yield jpush.readChat(user.platform, user.registration_id, notice, notice, userid, msgNum, true, boss)
	} catch(_err) {
		console.log(_err)
	}



	this.body = {
		ret: 1,
		err:'ok'
	}
}


/**
 * @api {post} /boss/delMsg  用户删除消息盒子
 * @apiName delMsg
 * @apiGroup Chat
 * @apiPermission User
 *
 * @apiDescription 用户删除某一条消息
 *
 * @apiParam {String} id 消息id，删除的那条消息id
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/boss/delMsg
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
 *       "err": "删除成功"
 *     }
 */
exports.delMsg = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: Msg(this.session.user.lan, 1)
    })
  }
	let id = this.request.body.id
	let userid = this.session.user.userId
	if(!id) {
		return (this.body = {
	      ret: 0,
	      err: Msg(this.session.user.lan, 65)
	    })
	}
	// 删除聊天盒子记录
	let chatbox = yield Chatbox.findOne({_id: id}).exec()
	if(!chatbox) {
		return (this.body = {
	      ret: 0,
	      err: Msg(this.session.user.lan, 66)
	    })
	}

	let otherId = chatbox.to

	let formChats = yield Chat.find({fromid:userid,toid:otherId}).exec()
	let toChats = yield Chat.find({toid:userid,fromid:otherId}).exec()
	if(formChats && formChats.length > -1) {
		for (let i = 0; i < formChats.length; i++) {
	      formChats[i].fromdel = 'yes'
	      yield formChats[i].save()
	    }		
	}
	if(toChats && toChats.length > -1) {
		for (let i = 0; i < toChats.length; i++) {
	      toChats[i].todel = 'yes'
	      yield toChats[i].save()
	    }		
	}
	
	yield chatbox.remove()
	this.body = {
		ret: 1,
		err:Msg(this.session.user.lan, 67)
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
      err: Msg(this.session.user.lan, 1)
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
		let notice = user.nickname + Msg(this.session.user.lan, 68)
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = Msg(this.session.user.lan, 69)
      }
      if(user.sex == '2') {
        notice = Msg(this.session.user.lan, 70)
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
		err: 'ok',
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
			err: Msg(this.session.user.lan, 1)
		})
	}

	let to = this.request.body.to
	let _id = this.session.user.userId || ''
	let user = yield User.findOne({_id: _id}).populate({path: 'traceid'}).exec()
	let userTo = yield User.findOne({_id: to}).exec()

	if(userTo.isActive == 'no') {
    return (this.body = {
      ret: 5,
      err: Msg(this.session.user.lan, 58)
    })
  }

	if(user.isActive == 'no') {
		delete this.session.user
    return (this.body = {
      ret: 5,
      err: Msg(this.session.user.lan, 59)
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
			err: Msg(this.session.user.lan, 60)
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
			err: Msg(this.session.user.lan, 61)
		})
  }


	// 查看对方是否有读信息的权限
	if(!userTo) {
		return (this.body = {
			ret: 0,
			err: Msg(this.session.user.lan, 52)
		})
	}

	// 查看用户是否有发送信息的权限
	let acess = yield role.checkSendRole(user, this.session.user.lan)
	console.log('requirePhotoPri====', acess)

	if(acess.ret !== 1) {
		return (this.body = {
			ret: acess.ret,
			acess: false,
			err: acess.err
		})
	}

	if(user.traceid && user.traceid.photoPri && user.traceid.photoPri.length > 0) {
		if(user.traceid.photoPri.indexOf(to) > -1) {
			return (this.body = {
				ret: 2,
				err: Msg(this.session.user.lan, 71)
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
				err: Msg(this.session.user.lan, 77) + time + Msg(this.session.user.lan, 78) + lessTime + Msg(this.session.user.lan, 79)
			})
	}




	let newchat = new Chat({
		fromid: _id,
		toid: to,
		msgType: 'requirePhotoPri',
		content: Msg(this.session.user.lan, 72)
	})

	yield newchat.save()

	let msg = Msg(this.session.user.lan, 72)
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



	let acessTo = yield role.checkReadRole(userTo, this.session.user.lan)

	let _acessTo = acessTo.ret == 1 ? true : false

	let result
	if(userTo.platform && userTo.registration_id) {
		let notice = user.nickname + Msg(this.session.user.lan, 73)
    if(!user.nickname) {
      if(user.sex == '1') {
        notice = Msg(this.session.user.lan, 74)
      }
      if(user.sex == '2') {
        notice = Msg(this.session.user.lan, 75)
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
	}

	let _acess = acess.ret == 1 ? true : false

	this.body = {
		ret: 1,
		err: 'ok',
		acess: _acess
	}
}

