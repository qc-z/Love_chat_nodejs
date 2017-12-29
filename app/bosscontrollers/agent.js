'use strict'

const mongoose = require('mongoose')
const Agent = mongoose.model('Agent')
const Apply = mongoose.model('Apply')
const Incomeag = mongoose.model('Incomeag')
const Agentuser = mongoose.model('Agentuser')
const Mngagent = mongoose.model('Mngagent')


// 业务员 或者 系统管理员注册
exports.mngagentSignup = function *(next) {
  let body = this.request.body

  if(!body.role, !body.mobile, !body.password) {
    return (this.body = {
      ret: 0,
      err: '参数不完整'
    })
  }

  let mngagentE = yield Mngagent.findOne({mobile: body.mobile}).exec()

  if(mngagentE) {
    if(agentE) {
      return (this.body = {
        ret: 0,
        err: '该手机用户已经存在'
      })
    }
  }

  let mngagent = new Mngagent({
    role: body.role, // sys or business
    nickname: body.nickname || '',
    mobile: body.mobile,
    email: body.email || '',
    password: body.password
  })

  yield mngagent.save()

  this.session.mngagent = {
    _id: mngagent._id,
    role: mngagent.role
  }

  this.body = {
    ret: 1,
    err: 'ok'
  }
}

// 业务员 或者 系统管理员登录
exports.mngagentLogin = function *(next) {
  let body = this.request.body

  if(!body.mobile, !body.password) {
    return (this.body = {
      ret: 0,
      err: '参数不完整'
    })
  }


  const existUser = yield Mngagent.findOne({mobile: body.mobile}).exec()
  if (!existUser) {
    return (this.body = {
      ret: 0,
      err: '用户不存在'
    })
  }
  let match = yield existUser.comparePassword(body.password, existUser.password)

  if (!match) {
    return (this.body = {
      ret: 0,
      err: '密码错误'
    })
  }

  this.session.mngagent = {
    _id: existUser._id,
    role: existUser.role
  }

  this.body = {
    ret: 1,
    err: 'ok'
  }

}


// 添加总代理
exports.addAgent = function *(next) {
  if(!this.session.mngagent) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }

  let body = this.request.body

  if(!body.role, !body.mobile, !body.account, !body.password) {
  	return (this.body = {
     	ret: 0,
      err: '参数不完整'
   	})
  }


  let agentE = yield Agent.findOne({mobile: body.mobile}).exec()
  
  if(agentE) {
  	return (this.body = {
      ret: 0,
      err: '该手机用户已经存在'
    })
  }

  let agent = new Agent ({
  	id: body.id || '',
	  role: body.role,
	  nickname: body.nickname || '',
	  bossid: body.bossid,
	  remark: body.remark || '',
	  mobile: body.mobile,
	  openStatus: 'success',
	  email: body.email || '',
	  account: body.account,
	  password: body.password,
	  balance: body.balance || ''
  })

  if(this.session.mngagent.role == 'business') {
  	agent.openStatus = 'ing'

  	let category = 'addboss'
  	if(body.role == 'channel') {
  		category = 'addchannel'
  	}
  	let apply = new Apply({
  		agentid: agent._id,
		  category: category, // addchannel // addboss // upgrade
		  reasons: body.reasons || '',
		  creater: this.session.mngagent._id
  	})
  	yield apply.save()
  }

  yield agent.save()


	this.body = {
		ret: 1,
		err: 'ok'
	}
}

// 审批 申请
exports.approval = function *(next) {

	if(!this.session.mngagent) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }

  if(!this.session.mngagent.role !== 'sys') {
     return (this.body = {
       ret: 0,
       err: '没有权限'
     })
  }

	let body = this.request.body
	let id = body.id

	let apply = yield Apply.findOne({_id: id}).exec()

	apply.result = body.result
	yield apply.save()

	this.body = {
		ret: 1,
		err: 'ok'
	}

}

// 总代理 添加渠道代理 或者 分销带代理
exports.addAgentByBoss = function *(next) {

  if(!this.session.agent) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }

  if(!this.session.agent.role !== 'boss') {
     return (this.body = {
       ret: 0,
       err: '没有权限'
     })
  }

  let body = this.request.body

  if(!body.role, !body.mobile, !body.account, !body.password) {
    return (this.body = {
      ret: 0,
      err: '参数不完整'
    })
  }


  let agentE = yield Agent.findOne({$or: [{mobile: body.mobile}, {account: body.account}]}).exec()
  
  if(agentE) {
    return (this.body = {
      ret: 0,
      err: '该用户已经存在'
    })
  }

  let agent = new Agent ({
    id: body.id || '',
    role: body.role,
    nickname: body.nickname || '',
    bossid: this.session.agent._id,
    bossid: body.channelid || '',
    remark: body.remark || '',
    mobile: body.mobile,
    openStatus: 'success',
    email: body.email || '',
    account: body.account,
    password: body.password,
    balance: body.balance || ''
  })

  yield agent.save()

  this.body = {
    ret: 1,
    err: 'ok'
  }

}

// 渠道代理 添加 分销代理
exports.addByChannel = function *(next) {

  if(!this.session.agent) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }

  if(!this.session.agent.role !== 'channel') {
     return (this.body = {
       ret: 0,
       err: '没有权限'
     })
  }

  let body = this.request.body

  if(!body.role, !body.mobile, !body.account, !body.password) {
    return (this.body = {
      ret: 0,
      err: '参数不完整'
    })
  }

  let channel = yield Agent.findOne({_id: this.session.agent._id}).exec()
  let bossid = channel.bossid


  let agentE = yield Agent.findOne({$or: [{mobile: body.mobile}, {account: body.account}]}).exec()
  
  if(agentE) {
    return (this.body = {
      ret: 0,
      err: '该用户已经存在'
    })
  }

  let agent = new Agent ({
    id: body.id || '',
    role: 'channel',
    nickname: body.nickname || '',
    bossid: bossid,
    channelid: this.session.agent._id,
    remark: body.remark || '',
    mobile: body.mobile,
    openStatus: 'success',
    email: body.email || '',
    account: body.account,
    password: body.password,
    balance: body.balance || ''
  })

  yield agent.save()

  this.body = {
    ret: 1,
    err: 'ok'
  }

}

// 收入流水
exports.incomeag = function *(next) {

  if(!this.session.agent) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }

  // let body = this.request.body

  let incomes = yield Incomeag.find({agentid: this.session.agent._id}).exec()

  this.body = {
    ret: 1,
    result: incomes
  }

}

// 查看直属用户
exports.agentusers = function *(next) {

  if(!this.session.agent) {
     return (this.body = {
       ret: 0,
       err: 'not login'
     })
  }

  // let body = this.request.body

  let agentusers = yield Agentuser.find({agentid: this.session.agent._id}).exec()

  this.body = {
    ret: 1,
    result: agentusers
  }

}





