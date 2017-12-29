'use strict'


const JPush = require('jpush-sdk')
const JPushConf = require('../../config/config').jpush
const BossJPushConf = require('../../config/config').bossjpush
const apnsStatus = require('../../config/config').apnsStatus


const client = JPush.buildClient({appKey: JPushConf.appKey, masterSecret: JPushConf.masterSecret, isDebug:true})
const bossclient = JPush.buildClient({appKey: BossJPushConf.appKey, masterSecret: BossJPushConf.masterSecret, isDebug:true})

function mathRand() {
    var Num=''
    for(var i=0;i<9;i++)
    { 
    Num+=Math.floor(Math.random()*10)
    }
    return Number(Num)
  }
// 通知所有用户
exports.all = function(content) {
  return new Promise(function(resolve, reject) {
    client.push().setPlatform(JPush.ALL)
      .setAudience(JPush.ALL)
      .setNotification(content)
      .send(function (err, res) {
        if (err) {
          if (err instanceof JPush.APIConnectionError) {
            console.log(err.message)
          } else if (err instanceof JPush.APIRequestError) {
            console.log(err.message)
          }
          resolve(false)
        } else {
          console.log('Sendno: ' + res.sendno)
          console.log('Msg_id: ' + res.msg_id)
          resolve(res)
        }
      })
  })
}

// 审核通过推送
exports.pass = function(platform, registration_id, notice, msg, userId, msgNum, noticeNum, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }

    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      push.setNotification('auditPass',  JPush.ios(notice, 'sound', msgNum, false, {type: 'auditPass', userId: userId, noticeNum: noticeNum})).setOptions(mathRand(),60, null, apnsStatus)
    } else {
      // push.setNotification('auditPass',  JPush.android(notice, 'auditPass', 1, {type: 'auditPass', userId: userId}))
    }
    push.setMessage(msg, 'auditPass', 'text', {type: 'auditPass', userId: userId, noticeNum: noticeNum}).send(function (err, res) {
      if (err) {
        console.log('auditPass jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 审核拒绝推送
exports.reject = function(platform, registration_id, notice, msg, userId, msgNum,noticeNum, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }


    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      push.setNotification('auditReject',  JPush.ios(notice, 'sound', msgNum, false, {type: 'auditReject', userId: userId, noticeNum: noticeNum})).setOptions(mathRand(),60, null, apnsStatus)
    } else {
      // push.setNotification('auditReject',  JPush.android(notice, 'auditReject', 1, {type: 'auditReject', userId: userId}))
    }
    push.setMessage(msg, 'auditReject', 'text', {type: 'auditReject', userId: userId, noticeNum: noticeNum}).send(function (err, res) {
      if (err) {
        console.log('auditReject jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 关注通知推送
exports.care = function(platform, registration_id, notice, msg, acess, userId, msgNum, sound, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }


    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      if(sound) {
        push.setNotification('care',  JPush.ios(notice, 'sound', msgNum, false, {type: 'care', acess: acess, userId: userId})).setOptions(mathRand(),60, null, apnsStatus)
      } else {
        push.setNotification('care',  JPush.ios(notice, msgNum, false, {type: 'care', acess: acess, userId: userId})).setOptions(mathRand(),60, null, apnsStatus)
      }
    } else {
      // push.setNotification('care',  JPush.android(notice, 'care', 1, {type: 'care', acess: acess, userId: userId}))
    }
    push.setMessage(msg, 'care', 'text', {type: 'care', acess: acess, userId: userId, sound: sound}).send(function (err, res) {
      if (err) {
        console.log('care jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 浏览通知推送
exports.browse = function(platform, registration_id, notice, msg, acess, userId, msgNum, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }

    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      push.setNotification('browse',  JPush.ios(notice, 'sound', msgNum, false, {type: 'browse', acess: acess, userId: userId})).setOptions(mathRand(),60, null, apnsStatus)
    } else {
      // push.setNotification('browse',  JPush.android(notice, 'browse', 1, {type: 'browse', acess: acess, userId: userId}))
    }
    push.setMessage(msg, 'browse', 'text', {type: 'browse', acess: acess, userId: userId}).send(function (err, res) {
      if (err) {
        console.log('browse jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 根据用户ios registration_id 发送 通知 和 信息
exports.chat = function(platform, registration_id, notice, msg, acess, userId, msgNum, sound, boss) {
  console.log('msgNum====', msgNum)
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }

    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      if(sound) {
        push.setNotification(notice,  JPush.ios(notice, 'sound', msgNum, false, {type: 'chat', acess: acess, userId: userId, msgNum: msgNum, msg: msg})).setOptions(mathRand(),60, null, apnsStatus)
      }
      else {
        push.setNotification(notice,  JPush.ios(notice, '', msgNum, false, {type: 'chat', acess: acess, userId: userId, msgNum: msgNum, msg: msg})).setOptions(mathRand(),60, null, apnsStatus)
      }
    } else {
      // push.setNotification(notice,  JPush.android(msg, 'chat', 1, {type: 'chat', acess: acess, userId: userId, msgNum: msgNum}))
    }
    push.setMessage(msg, 'chat', 'text', {type: 'chat', acess: acess, userId: userId, msgNum: msgNum, notice: notice, sound: sound, msg: msg}).send(function (err, res) {
      if (err) {
        console.log('chat jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 回应查看私照的请求
exports.replyPhotoPri = function(platform, registration_id, notice, msg, reply, userId, msgNum, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }

    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      push.setNotification('replyPhotoPri',  JPush.ios(notice, 'sound', msgNum, false, {type: 'replyPhotoPri', reply: reply, userId: userId, msgNum: msgNum})).setOptions(mathRand(),60, null, apnsStatus)
    } else {
      // push.setNotification('replyPhotoPri',  JPush.android(notice, 'replyPhotoPri', 1, {type: 'replyPhotoPri', userId: userId, msgNum: msgNum}))
    }
    push.setMessage(msg, 'replyPhotoPri', 'text', {type: 'replyPhotoPri', reply: reply, userId: userId, msgNum: msgNum}).send(function (err, res) {
      if (err) {
        console.log('replyPhotoPri jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 请求查看私照
exports.requirePhotoPri = function(platform, registration_id, notice, msg, acess, userId, msgNum, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }

    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      push.setNotification('requirePhotoPri',  JPush.ios(notice, 'sound', msgNum, false, {type: 'requirePhotoPri', acess: acess, userId: userId, msgNum: msgNum})).setOptions(mathRand(),60, null, apnsStatus)
    } else {
      // push.setNotification('requirePhotoPri',  JPush.android(notice, 'requirePhotoPri', 1, {type: 'requirePhotoPri', acess: acess, userId: userId, msgNum: msgNum}))
    }
    push.setMessage(msg, 'requirePhotoPri', 'text', {type: 'requirePhotoPri', acess: acess, userId: userId, msgNum: msgNum}).send(function (err, res) {
      if (err) {
        console.log('requirePhotoPri jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}



// 根据用户 registration_id 通知 对方已读取你的消息
exports.readChat = function(platform, registration_id, notice, msg, userId, msgNum, sound, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }

    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      if(sound) {
        push.setNotification('read',  JPush.ios(notice, 'sound', msgNum, false, {type: 'read', acess: true, userId: userId})).setOptions(mathRand(),60, null, apnsStatus)
      }
      else {
        push.setNotification('read',  JPush.ios(notice, '', msgNum, false, {type: 'read', acess: true, userId: userId})).setOptions(mathRand(),60, null, apnsStatus)
      }
    } else {
      // push.setNotification('read',  JPush.android(notice, 'read', 1, {type: 'read', acess: acess, userId: userId}))
    }
    
    push.setMessage(msg, 'read', 'text', {type: 'read', acess: true, userId: userId, sound: sound}).send(function (err, res) {
      if (err) {
        if (err instanceof JPush.APIConnectionError) {
          console.log(err.message)
          // Response Timeout means your request to the server may have already received,
          // please check whether or not to push
          console.log(err.isResponseTimeout)
        } else if (err instanceof JPush.APIRequestError) {
          console.log(err.message)
        }
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 根据用户别名发送 通知 和 信息
exports.alias = function(platform, alias, notice, msg) {
  return new Promise(function(resolve, reject) {
    client.push().setPlatform(platform)
    .setAudience(JPush.alias(alias))
    .setNotification(notice)
    .setMessage(msg)
    .send(function (err, res) {
      if (err) {
        if (err instanceof JPush.APIConnectionError) {
          console.log(err.message)
          // Response Timeout means your request to the server may have already received,
          // please check whether or not to push
          console.log(err.isResponseTimeout)
        } else if (err instanceof JPush.APIRequestError) {
          console.log(err.message)
        }
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 根据用户 tag 发送通知 和 信息
exports.tag = function(platform, tag, notice, msg) {
  return new Promise(function(resolve, reject) {
    client.push().setPlatform(platform)
    .setAudience(JPush.tag(tag))
    .setNotification(notice)
    .setMessage(msg)
    .send(function (err, res) {
      if (err) {
        if (err instanceof JPush.APIConnectionError) {
          console.log(err.message)
          // Response Timeout means your request to the server may have already received,
          // please check whether or not to push
          console.log(err.isResponseTimeout)
        } else if (err instanceof JPush.APIRequestError) {
          console.log(err.message)
        }
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

// 根据 register_id 获取 tag alias
exports.getDeviceTagAlias = function(registerid) {
  return new Promise(function(resolve, reject) {
    client.getDeviceTagAlias(registerid, function (err, res) {
      if (err) {
        if (err instanceof JPush.APIConnectionError) {
          console.log(err.message)
        } else if (err instanceof JPush.APIRequestError) {
          console.log(err.message)
        }
        resolve(false)
      } else {
        console.log('getDeviceTagAlias :')
        console.log(res.alias)
        console.log(res.tags)
        resolve(res)
      }
    })
  })
}

// 单独推送
exports.toone = function(platform, registration_id, notice, msg, userId, msgNum,noticeNum, boss) {
  return new Promise(function(resolve, reject) {
    let push = client.push()
    if(boss == 'yes') {
      push = bossclient.push()
    }


    push.setPlatform(platform).setAudience(JPush.registration_id(registration_id))

    if(platform === 'ios') {
      push.setNotification('toone',  JPush.ios(notice, 'sound', msgNum, false, {type: 'toone', userId: userId, noticeNum: noticeNum})).setOptions(mathRand(),60, null, apnsStatus)
    } else {
      // push.setNotification('toone',  JPush.android(notice, 'toone', 1, {type: 'toone', userId: userId}))
    }
    push.setMessage(msg, 'toone', 'text', {type: 'toone', userId: userId, noticeNum: noticeNum}).send(function (err, res) {
      if (err) {
        console.log('toone jpush error: ', err)
        resolve(false)
      } else {
        console.log('Sendno: ' + res.sendno)
        console.log('Msg_id: ' + res.msg_id)
        resolve(res)
      }
    })
  })
}

