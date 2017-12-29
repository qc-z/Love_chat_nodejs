'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Chat = mongoose.model('Chat')
const Trace = mongoose.model('Trace')
const Chatbox = mongoose.model('Chatbox')
const Report = mongoose.model('Report')
const Im = require('../libs/im')
// const xss = require('xss')
const jpush = require('../service/jpush')
// const role = require('../libs/role')
// const config = require('../../config/config')

/**
 * @api {post} /setAvatar  设置某张公开照片为头像
 * @apiName user setAvatar
 * @apiGroup Photo
 * @apiPermission User
 *
 * @apiDescription 设置某张公开照片为头像
 *
 * @apiParam {String} addr 要设置为头像的公开照地址
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/setAvatar
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
exports.setAvatar = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

	let addr = this.request.body.addr || ''
	let userid = this.session.user.userId || ''

	if(!addr) {
		return (this.body = {
      ret: 0,
      err: '头像地址不能为空'
    })
	}

	let user = yield User.findOne({_id: userid}).exec()

	if(!user.avatar) {
		user.completion += 12
	}

	if(addr) {
		user.avatar = addr
		console.log('USER========',user)
		yield user.save()
	}

	this.body = {
		ret: 1,
		msg: 'ok'
	}

}

/**
 * @api {get} /careList  用户关注列表
 * @apiName care list
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户关注列表
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/careList
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Object}   care  我喜欢
 * @apiSuccess {Object}   cared  喜欢我
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "care": [{user1},{user2}],
 *       "cared": [{user1},{user2}]
 *     }
 */
exports.careList = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

	let userid = this.session.user.userId || ''
	let _user = yield User.findOne({_id: userid}, {sex: 1}).exec()

	let trace = yield Trace.findOne({userid: userid}).exec()
	
	let care = trace.care || []
	let cared = trace.cared || []

	let _care = []
	let _cared = []

	if(care.length > 0) {
		for (let i = care.length - 1; i >= 0; i--) {
			let user = yield User.findOne({_id:  care[i], isActive: {$ne: 'no'}},{avatar: 1, nickname: 1, auditContent: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1}).exec()
			if(user) {
				_care.push(user)
			}
		}
	}

	if(cared.length > 0) {
		for (let i = cared.length - 1; i >= 0; i--) {
			let user = yield User.findOne({_id:  cared[i], isActive: {$ne: 'no'}},{avatar: 1, nickname: 1, auditContent: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1}).exec()
			if(user) {
				_cared.push(user)
			}
		}
	}
		
	if(_care.length !== 0) {
    for (var i = 0; i < _care.length; i++) {
      if(_care[i].auditContent && _care[i].auditContent.nickname && _care[i].auditContent.nickname !== '1') {
        if(_care[i].oldName) {
          _care[i].nickname = _care[i].oldName
        }else{
          if(_user.sex == 1) {
            _care[i].nickname = '魅力甜心'
          }else if(_user.sex == 2) {
            _care[i].nickname = '成功男士'
          }
        }
      }
    }
  }

	if(_cared.length !== 0) {
    for (var i = 0; i < _cared.length; i++) {
      if(_cared[i].auditContent && _cared[i].auditContent.nickname && _cared[i].auditContent.nickname !== '1') {
        if(_cared[i].oldName) {
          _cared[i].nickname = _cared[i].oldName
        }else{
          if(_user.sex == 1) {
            _cared[i].nickname = '魅力甜心'
          }else if(_user.sex == 2) {
            _cared[i].nickname = '成功男士'
          }
        }
      }
    }
  }



	this.body = {
		ret: 1,
		care: _care,
		cared: _cared
	}

}

/**
 * @api {post} /userCare  用户关注操作
 * @apiName user care
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户关注操作
 *
 * @apiParam {String} id 用户id，关注谁就是谁的ID
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/userCare
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
exports.care = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

  if (!this.request.body.id) {
    return (this.body = {
      ret: 0,
      err: 'id 不能为空'
    })
  }

	let id = this.request.body.id || ''
	let userid = this.session.user.userId || ''

	let trace = yield Trace.findOne({userid: id}).exec()
	if(trace.cared) {
		if(trace.cared.indexOf(userid) === -1) {
			trace.cared.push(userid)
			trace.careNum = trace.careNum + 1
			yield trace.save()
		}
	} else {
		trace.cared = [userid]
		trace.careNum = trace.careNum + 1
		yield trace.save()
	}

	let _trace = yield Trace.findOne({userid: userid}).exec()
	if(_trace.care) {
		if(_trace.care.indexOf(id) === -1) {
			_trace.care.push(id)
			yield _trace.save()
		}
	} else {
		_trace.care = [id]
		yield _trace.save()
	}

	let result
	let user = yield User.findOne({_id: userid},{nickname: 1, oldName: 1, sex: 1,auditContent: 1}).exec()
	let userTo = yield User.findOne({_id: id},{platform: 1, registration_id: 1, nickname: 1, oldName: 1, traceid: 1}).populate({path: 'traceid'}).exec()
	if(userTo.platform && userTo.registration_id) {
		let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
	      if(user.auditContent && user.auditContent.nickname && user.auditContent.nickname !== '1') {
	        if(user.oldName) {
	          user.nickname = user.oldName
	        }else{
	          if(user.sex == 1) {
	            user.nickname = '有魅力甜心'
	          }else if(user.sex == 2) {
	            user.nickname = '有成功男士'
	          }
	        }
	      }
		let notice = '有'+user.nickname + '关注了你'
    

    // 通知中心
   //  let _notice = new Notice({
   //  	userid: userTo._id,
   //  	content: notice
	  // })
	  // yield _notice.save()

		let sound =  userTo.traceid.soundCare
		let boss = 'no'
    if(userTo.from == 'boss') {
      boss = 'yes'
    }
		result = yield jpush.care(userTo.platform, userTo.registration_id, notice, notice, true, id, msgNum, sound, boss)
		console.log('推送结果', result)
	}

	this.body = {
		ret: 1,
		pushResult: result,
		msg: 'ok'
	}
}
/**
 * @api {post} /uncare  用户取消关注操作
 * @apiName user uncare
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户取消关注操作
 *
 * @apiParam {String} id 用户id，关注谁就是谁的ID
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/uncare
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
exports.uncare = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

	let id = this.request.body.id || ''
	let userid = this.session.user.userId || ''

	let trace = yield Trace.findOne({userid: id}).exec()
	if(trace.cared) {
		if(trace.cared.indexOf(userid) > -1) {
			let index = trace.cared.indexOf(userid)
			trace.cared.splice(index, 1)
			trace.careNum = trace.careNum - 1
			if(trace.careNum < 0) {
				trace.careNum = 0
			}
			yield trace.save()
		}
	}

	let _trace = yield Trace.findOne({userid: userid}).exec()
	if(_trace.care) {
		if(_trace.care.indexOf(id) > -1) {
			let index = _trace.care.indexOf(id)
			_trace.care.splice(index, 1)
			yield _trace.save()
		}
	}


	this.body = {
		ret: 1,
		msg: 'ok'
	}

}

/**
 * @api {post} /userHate  用户拉黑操作
 * @apiName user hate
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户拉黑操作
 *
 * @apiParam {String} id 用户id，拉黑谁就是谁的ID
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/userHate
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
exports.hate = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let id = this.request.body.id
	let userid = this.session.user.userId

	// 删除聊天盒子记录
	let chatbox = yield Chatbox.findOne({userid: userid, to: id}).exec()
	if(chatbox) {
		yield chatbox.remove()
	}

	let chatboxTo = yield Chatbox.findOne({userid: id, to: userid}).exec()
	if(chatboxTo) {
		yield chatboxTo.remove()
	}

	let trace = yield Trace.findOne({userid: id}).exec()
	if(trace) {
		if(trace.hated && trace.hated.length > 0) {
			if(trace.hated.indexOf(userid) === -1) {
				trace.hated.push(userid)
				yield trace.save()
			}
		} else {
			trace.hated = [userid]
			yield trace.save()
		}
	}


	//从浏览列表里面去掉
	if(trace) {
		if(trace.browsed && trace.browsed.length > 0) {
			if(trace.browsed.indexOf(userid) > -1) {
				trace.browsed.splice(trace.browsed.indexOf(userid), 1)
				trace.markModified('browsed')
				yield trace.save()
			}
		}
	}
	// 从关注列表里面去掉
	if(trace) {
		if(trace.care && trace.care.length > 0) {
			if(trace.care.indexOf(userid) > -1) {
				trace.care.splice(trace.care.indexOf(userid), 1)
				trace.markModified('care')
				yield trace.save()
			}
		}
	}
	if(trace) {
		if(trace.cared && trace.cared.length > 0) {
			if(trace.cared.indexOf(userid) > -1) {
				trace.cared.splice(trace.cared.indexOf(userid), 1)
				trace.markModified('cared')
				yield trace.save()
			}
		}
	}
	//从私照权限去掉
	if(trace) {
		console.log('trace.photoPri======',trace.photoPri)

		if(trace.photoPri && trace.photoPri.length > 0) {

			if(trace.photoPri.indexOf(userid) > -1) {
				trace.photoPri.splice(trace.photoPri.indexOf(userid), 1)
				trace.markModified('photoPri')
				yield trace.save()
			}
		}
	}
	if(trace) {
		if(trace.photoPried && trace.photoPried.length > 0) {
			if(trace.photoPried.indexOf(userid) > -1) {
				trace.photoPried.splice(trace.photoPried.indexOf(userid), 1)
				trace.markModified('photoPried')
				yield trace.save()
			}
		}
	}
	let _trace = yield Trace.findOne({userid: userid}).exec()
	if(_trace) {
		if(_trace.hate && _trace.hate.length > 0) {
			if(_trace.hate.indexOf(id) === -1) {
				_trace.hate.push(id)
				yield _trace.save()
			}
		} else {
			_trace.hate = [id]
			yield _trace.save()
		}
	}
	//从私照权限去掉
	if(_trace) {
		if(_trace.photoPried && _trace.photoPried.length > 0) {
			if(_trace.photoPried.indexOf(id) > -1) {
				console.log('LOVE_trace.photoPried====',_trace.photoPried)
				_trace.photoPried.splice(_trace.photoPried.indexOf(id), 1)
				_trace.markModified('photoPried')
				yield _trace.save()
			}
		}
	}
	if(_trace) {
		if(_trace.photoPri && _trace.photoPri.length > 0) {
			if(_trace.photoPri.indexOf(id) > -1) {
				console.log('LOVE_trace.photoPri====',_trace.photoPri)
				_trace.photoPri.splice(_trace.photoPri.indexOf(id), 1)
				_trace.markModified('photoPri')
				yield _trace.save()
			}
		}
	}

	//从关注列表里面去掉
	if(_trace) {
		if(_trace.care && _trace.care.length > 0) {
			if(_trace.care.indexOf(id) > -1) {
				_trace.care.splice(_trace.care.indexOf(id), 1)
				_trace.markModified('care')
				yield _trace.save()
			}
		}
	}
	if(_trace) {
		if(_trace.cared && _trace.cared.length > 0) {
			if(_trace.cared.indexOf(id) > -1) {
				_trace.cared.splice(_trace.cared.indexOf(id), 1)
				_trace.markModified('cared')
				yield _trace.save()
			}
		}
	}
	//从浏览列表里面去掉
	if(_trace) {
		if(_trace.browsed && _trace.browsed.length > 0) {
			if(_trace.browsed.indexOf(id) > -1) {
				_trace.browsed.splice(_trace.browsed.indexOf(id), 1)
				_trace.markModified('browsed')
				yield _trace.save()
			}
		}
	}
	

	let chats = yield Chat.find({toid: userid, fromid: id}).exec()
	if(chats && chats.length > 0) {	
		for (var i = 0; i < chats.length; i++) {
			let chat = chats[i]
			yield chat.remove()
		}
	}

	let _chats = yield Chat.find({toid: id, fromid: userid}).exec()
	if(_chats && _chats.length > 0) {	
		for (var i = 0; i < _chats.length; i++) {
			let chat = _chats[i]
			yield chat.remove()
		}
	}


	// im 拉黑
  try {
    let aaa = yield Im.addBlocksUser({username: userid, usernameTo: id})
    if(aaa.ret == 2) {
      Im.addBlocksUser({username: userid, usernameTo: id})
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }

	this.body = {
		ret: 1,
		msg: 'ok'
	}
}

/**
 * @api {post} /unHate  用户解除拉黑
 * @apiName user unHate
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户解除拉黑
 *
 * @apiParam {String} id 用户id，用户解除拉黑谁就是谁的ID
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/userHate
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
exports.unHate = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let id = this.request.body.id
	let userid = this.session.user.userId


	let trace = yield Trace.findOne({userid: id}).exec()
	if(trace){
		if(trace.hated && trace.hated.length > 0) {
			if(trace.hated.indexOf(userid) > -1) {
				trace.hated.splice(trace.hated.indexOf(userid), 1)
				trace.markModified('hated')
				yield trace.save()
			}
		}
	}
	let _trace = yield Trace.findOne({userid: userid}).exec()
	if(_trace){
		if(_trace.hate && _trace.hate.length > 0) {
			if(_trace.hate.indexOf(id) > -1) {
				_trace.hate.splice(_trace.hate.indexOf(id), 1)
				_trace.markModified('hate')
				yield _trace.save()
			}
		}
	}

	// im 拉黑
  try {
    let aaa = yield Im.delBlocksUser({username: userid, usernameTo: id})
    if(aaa.ret == 2) {
      Im.delBlocksUser({username: userid, usernameTo: id})
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }

	this.body = {
		ret: 1,
		msg: 'ok'
	}
}


/**
 * @api {post} /report 举报某人
 * @apiName report
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 举报某人
 *
 * @apiParam {String} content 他长得丑
 * @apiParam {String} imgUrl 图片阿里云地址
 * @apiParam {String} id 举报对象id
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/report
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
exports.report = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let userid = this.session.user.userId || ''
	let content = this.request.body.content
	let imgUrl = this.request.body.imgUrl
	let id = this.request.body.id || ''
	console.log('report====', this.request.body)


	let _user = yield User.findOne({_id: id}).exec()
	if(!_user) {
		return (this.body = {
      ret: 0,
      err: '该举报对象不存在'
    })
	}


	let report = {
		userid: userid,
		content: content,
		reportUserid: id,
		imgUrl: imgUrl,
		auditResult: ''
	}

	let newReport = new Report(report)

	yield newReport.save()

	this.body = {
		ret: 1,
		msg: 'ok'
	}

}

/**
 * @api {post} /careSet 设置关注
 * @apiName care set
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户设置是否被别人关注
 *
 * @apiParam {Boolean} status true 是可以被关注，false 是不能被别人关注
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/careSet
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
exports.careSet = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let userid = this.session.user.userId || ''
	let status = this.query.status

	let trace = yield Trace.findOne({userid: userid}).exec()

	trace.careSet = status
	yield trace.save()

	this.body = {
		ret: 1,
		msg: 'ok'
	}

}

/**
 * @api {post} /soundCare 设置关注提醒
 * @apiName soundCare set
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 设置关注提醒声音的关闭和打开
 *
 * @apiParam {Boolean} status true 开声音，false 关声音
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/soundCare
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
exports.soundCare = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	console.log('this.request.body=====', this.request.body)
	let userid = this.session.user.userId || ''
	let status = this.request.body.status

	status = status == 'yes' ? true : false


	let trace = yield Trace.findOne({userid: userid}).exec()


	trace.soundCare = status

	yield trace.save()

	this.body = {
		ret: 1,
		msg: 'ok'
	}

}

/**
 * @api {post} /soundChat 设置消息提醒
 * @apiName soundChat set
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 设置消息提醒声音的关闭和打开
 *
 * @apiParam {Boolean} status true 开声音，false 关声音
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/soundChat
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
exports.soundChat = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
  console.log('this.request.body=====', this.request.body)
	let userid = this.session.user.userId || ''
	let status = this.request.body.status

	status = status == 'yes' ? true : false

	let trace = yield Trace.findOne({userid: userid}).exec()

	trace.soundChat = status
	yield trace.save()

	this.body = {
		ret: 1,
		msg: 'ok'
	}
}


/**
 * @api {post} /listSet 设置是否投放
 * @apiName list set
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户设置是否投放到搜索列表
 *
 * @apiParam {Boolean} status true 投放，false 是不投放
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/listSet
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
exports.listSet = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let userid = this.session.user.userId || ''
	let status = this.request.body.status

	let trace = yield Trace.findOne({userid: userid}).exec()

	trace.listSet = status
	yield trace.save()

	this.body = {
		ret: 1,
		msg: 'ok'
	}

}


/**
 * @api {post} /feedback 意见反馈
 * @apiName feedback
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 意见反馈
 *
 * @apiParam {String} info 反馈描述
 * @apiParam {String} photo 反馈照片
 * @apiParam {String} mobile 反馈手机
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/feedback
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
exports.feedback = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }


	let userid = this.session.user.userId || ''

	let info = this.request.body.info || ''
	let email = this.request.body.email || ''
	let photo = this.request.body.photo || ''
	let mobile = this.request.body.mobile || ''


	let trace = yield Trace.findOne({userid: userid}).exec()

	let feedback = {
		info: info,
		photo: photo,
		email: email,
		mobile: mobile,
		reply: ''
	}

	trace.feedback = feedback

	trace.markModified('feedback')

	yield trace.save()

	this.body = {
		ret: 1,
		msg: 'ok'
	}

}

/**
 * @api {get} /hateList  拉黑列表
 * @apiName hateList
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 该用户拉黑了谁
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/hateList
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Object}   hates  拉黑列表
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "hates": [{user1},{user2}]
 *     }
 */
exports.hateList = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

	let userid = this.session.user.userId || ''
	let _user = yield User.findOne({_id: userid}, {sex: 1}).exec()

	let trace = yield Trace.findOne({userid: userid}).exec()

	let _hates = []
	let hates = trace.hate || []

	if(hates.length > 0) {
		for (let i = hates.length - 1; i >= 0; i--) {
			let user = yield User.findOne({_id:  hates[i], isActive: {$ne: 'no'}},{avatar: 1, nickname: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1, lovePrice: 1, addr: 1}).exec()
			if(user) {
				_hates.push(user)
			}	
		}
	}

	if(_hates.length !== 0) {
    for (var i = 0; i < _hates.length; i++) {
      if(_hates[i].auditContent && _hates[i].auditContent.nickname && _hates[i].auditContent.nickname !== '1') {
        if(_hates[i].oldName) {
          _hates[i].nickname = _hates[i].oldName
        }else{
          if(_user.sex == 1) {
            _hates[i].nickname = '魅力甜心'
          }else if(_user.sex == 2) {
            _hates[i].nickname = '成功男士'
          }
        }
      }
    }
  }


	this.body = {
		ret: 1,
		hates: _hates
	}

}

/**
 * @api {get} /browseList  浏览历史
 * @apiName browse/browsed lists
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 返回浏览历史
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/browseList
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Object}   browse  我浏览的
 * @apiSuccess {Object}   browsed  浏览我的
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "browse": [{user1},{user2}],
 *       "browsed": [{user1},{user2}]
 *     }
 */
exports.browseList = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

	let userid = this.session.user.userId || ''

	let trace = yield Trace.findOne({userid: userid}).exec()
	let _user = yield User.findOne({_id: userid}, {sex: 1}).exec()
	let browse = trace.browse || []
	let browsed = trace.browsed || []

	let _browse = []
	let _browsed = []

	if(browse.length > 0) {
		for (let i = browse.length - 1; i >= 0; i--) {
			let user = yield User.findOne({_id:  browse[i], isActive: {$ne: 'no'}},{avatar: 1, auditContent: 1,nickname: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1, lovePrice: 1, addr: 1}).exec()
			if(user){
				_browse.push(user)
			}
			
		}
	}

	if(browsed.length > 0) {
		for (let i = browsed.length - 1; i >= 0; i--) {
			let user = yield User.findOne({_id:  browsed[i], isActive: {$ne: 'no'}},{avatar: 1,  auditContent: 1,nickname: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1, lovePrice: 1, addr: 1}).exec()
			if(user){
				_browsed.push(user)
			}
			
		}
	}

	if(_browse.length !== 0) {
    for (var i = 0; i < _browse.length; i++) {
      if(_browse[i].auditContent && _browse[i].auditContent.nickname && _browse[i].auditContent.nickname !== '1') {
        if(_browse[i].oldName) {
          _browse[i].nickname = _browse[i].oldName
        }else{
          if(_user.sex == 1) {
            _browse[i].nickname = '魅力甜心'
          }else if(_user.sex == 2) {
            _browse[i].nickname = '成功男士'
          }
        }
      }
    }
  }


	if(_browsed.length !== 0) {
    for (var i = 0; i < _browsed.length; i++) {
      if(_browsed[i].auditContent && _browsed[i].auditContent.nickname && _browsed[i].auditContent.nickname !== '1') {
        if(_browsed[i].oldName) {
          _browsed[i].nickname = _browsed[i].oldName
        }else{
          if(_user.sex == 1) {
            _browsed[i].nickname = '魅力甜心'
          }else if(_user.sex == 2) {
            _browsed[i].nickname = '成功男士'
          }
        }
      }
    }
  }

	this.body = {
		ret: 1,
		browse: _browse,
		browsed: _browsed
	}

}

/**
 * @api {post} /delBrowse  用户删除浏览历史
 * @apiName user delBrowse
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户删除浏览历史, 也就是 我看了谁
 *
 * @apiParam {String} id 用户id，用户删除谁就是谁的ID
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/delBrowse
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
exports.delBrowse = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let id = this.request.body.id
	let userid = this.session.user.userId

	console.log('this.request.body====', this.request.header)

	let _trace = yield Trace.findOne({userid: userid}).exec()
	console.log('_trace.browse.indexOf(id)====', _trace.browse.indexOf(id))
	if(_trace){
		if(_trace.browse && _trace.browse.length > 0) {
			if(_trace.browse.indexOf(id) > -1) {
				_trace.browse.splice(_trace.browse.indexOf(id), 1)
				_trace.markModified('browse')
				yield _trace.save()
			}
		}
	}
	this.body = {
		ret: 1,
		msg: 'ok'
	}
}

/**
 * @api {post} /delBrowsed  用户删除谁看了我
 * @apiName user delBrowsed
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户删除谁看了我, 也就是 谁看了我列表
 *
 * @apiParam {String} id 用户id，用户删除谁就是谁的ID
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/delBrowsed
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
exports.delBrowsed = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }
	let id = this.request.body.id
	let userid = this.session.user.userId


	let trace = yield Trace.findOne({userid: userid}).exec()
	if(trace){
		if(trace.browsed && trace.browsed.length > 0) {
			if(trace.browsed.indexOf(id) > -1) {
				trace.browsed.splice(trace.browsed.indexOf(id), 1)
				trace.markModified('browsed')
				yield trace.save()
			}
		}
	}

	this.body = {
		ret: 1,
		msg: 'ok'
	}
}


/**
 * @api {get} /ranking  用户排行榜
 * @apiName ranking list
 * @apiGroup Trace
 * @apiPermission User
 *
 * @apiDescription 用户关注列表
 *
 * @apiParam {String} sex 用户的性别，1就是男的排行榜，2就是女的排行榜
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/ranking
 *
 * @apiSuccess {Number}   ret   1
 * @apiSuccess {Number}   ranking   我的排名
 * @apiSuccess {String}   avatar   我的头像
 * @apiSuccess {Object}   users  排行榜列表
 *
 * @apiError ret 0
 * @apiError err   err message
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "ranking": 234,
 *       "avatar": 'aliyun.com/mayava....',
 *       "users": [{user1},{user2}]
 *     }
 */
exports.ranking = function *(next) {

	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户还没登录'
    })
  }

  function mathRand() { 
    var Num=''
    for(var i=0;i<4;i++) 
    { 
    Num+=Math.floor(Math.random()*10)
    }
    return Number(Num) 
  }

	let userid = this.session.user.userId || ''
	let sex = this.query.sex
	let lists = []

	let thisUser = yield User.findOne({_id: userid}, {rmbTotal: 1, avatar: 1}).exec()
	let myRanking = mathRand()
	if(sex == 1) {
		let rmbTotal = thisUser.rmbTotal
		if(thisUser.rmbTotal && thisUser.rmbTotal > 0) {
			myRanking = yield User.count({rmbTotal: {$gt: rmbTotal}, mock: false, sex: 2}).exec()
			myRanking + 1
		}
		else {
			myRanking = '∞'
		}
		lists = yield User.find({sex: 1, mock: false}, {avatar: 1, nickname: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1, rmbTotal: 1, work: 1}).sort({rmbTotal: -1}).limit(6).exec()
		
	}

	if(sex == 2) {
		let thisT = yield Trace.findOne({userid: userid}, {careNum: 1}).exec()
		let careNum = thisT.careNum
		if(careNum && careNum > 0) {
			myRanking = yield Trace.count({careNum: {$gt: careNum}, sex: 1}).exec()
			myRanking + 1
		}
		else {
			myRanking = '∞'
		}

		let traces = yield Trace.find({sex: 2}).sort({careNum: -1}).limit(6).exec()
		for (let i = traces.length - 1; i >= 0; i--) {
			let user = yield User.findOne({_id:  traces[i].userid},{avatar: 1, nickname: 1, oldName: 1, age: 1, city: 1, vip: 1, selInfo: 1, sex: 1, character: 1, work: 1}).exec()
			if(user) {
				lists.push(user)
			}
		}
	}

	this.body = {
		ret: 1,
		avatar: thisUser.avatar,
		ranking: myRanking,
		users: lists
	}

}



