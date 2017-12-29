'use strict'


const email = require('x.aliyun-email')
const _ = require('lodash')
const uuid = require('uuid')
const aliyun = require('../../config/config').aliyun

let codetable = {}

const sendMail = function(code, addr) {
	return new Promise(function(resolve, reject) {
		email.setOptions({
		  accessKeyId: aliyun.accessKeyId,
		  accessKeySecret: aliyun.secretAccessKey,
		  accountName: 'lovechat@email.legle.cc',
		  fromAlias: 'BOSS直约'
		})
		let content = '您的BOSS直约注册验证码为：'+ code +'，请在一个3分钟之内使用！'
		email.singleSendMail(addr, 'BOSS直约注册邮箱验证', content).then(function(resp) {
		  console.log('aliyun mail resp====', resp)
		  resolve(resp)
		}).catch(function(e) {
		  console.error(e)
		})
	})
}



function newCode(params) {
    var code = {}

    var code_str = ''
    var timestamp = Date.parse(new Date()) / 1000
    for (let i = 0; i < 4; i++) {
        code_str += parseInt(Math.random() * 10)
    }
    code.id = uuid.v4().replace(/-/g, '')
    code.email = params.email
    code.code = code_str
    console.log('code:'+code_str)
    code.deadline = timestamp + 180
    return code
}

function clearOldCode() {
  var timestamp = Date.parse(new Date()) / 1000
  _.each(codetable, function (element, index, list) {
    if (element.deadline < timestamp) {
       delete list[index]
    }
  })
}

function checkEmailExist(email) {
  var timestamp = Date.parse(new Date()) / 1000
  return _.find(codetable, function (element) {
    return (element.email == email && element.deadline > timestamp)
  })
}

//创建短信验证码
exports.newCode = function (params) {
  console.log('email params==', params)
  return new Promise(function(resolve, reject) {
    clearOldCode()
    var code = checkEmailExist(params.email)
    if (code) {
        resolve(code)
    }
    else {
        code = newCode(params)
        codetable[code.id] = code
        //调用email接口发送 mock 没开就不真正发送验证码
        // if(config.mock) {
            sendMail(code.code, code.email)
        // }
        resolve(code)
    }
  })
}

// mobicode.showAllCode = function () {
//     console.log("showAllCode");
//     console.log(JSON.stringify(mobicode.codetable))
//     //for(var a in mobicode.codetable){
//     //	console.log(a,mobicode.codetable[a]);
//     //}
// }

//检查验证码
exports.checkCode = function (params) {
  var code = _.find(codetable, function (element) {
      return (element.email == params.email && element.code == params.code)
  })
  if (!code) {
      return false
  }
  console.log('check:' + code.toString())
  //消耗这个消息

  delete codetable[code.id]
  if (code && code.deadline >= Date.parse(new Date()) / 1000) {
      return true
  }
  else {
      return false
  }
}



