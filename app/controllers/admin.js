'use strict'

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Trace = mongoose.model('Trace')
const Chat = mongoose.model('Chat')
const Chatbox = mongoose.model('Chatbox')
const Pay = mongoose.model('Pay')
const Coupon = mongoose.model('Coupon')
const Notice = mongoose.model('Notice')
const role = require('../libs/role')
const Sensitive = mongoose.model('Sensitive')
const xss = require('xss')
const fs = require('fs')
const Im = require('../libs/im')
// const moment = require('moment')
// const sms = require('../service/sms')
// const aliyun = require('../service/aliyun')
const jpush = require('../service/jpush')
const amap = require('../service/amap')
const common = require('../service/common')
// const Msg = require('../libs/msg')
// const config = require('../../config/config')
const weight = require('../../config/json/weight.json')
const co = require('co')
const Wish = mongoose.model('Wish')
const Msg = require('../libs/role').msg


// 添加伪会员聊天
exports.setActive = function *(next) {
  let active = this.request.body.active
  let id = this.request.body.id
  
  if(!active || !id) {
    return (this.body = {
      ret: 0,
      msg: '参数不完整'
    })
  }

  let user = yield User.findOne({_id: id}).exec()

  // im 
  try {
    let aaa
    if(active == 'no') {
      aaa = yield Im.deactiveUser({id})
    }
    else {
      aaa = yield Im.activeUser({id})
    }
    if(aaa.ret == 2) {
      if(active == 'no') {
        Im.deactiveUser({id})
      }
      else {
        Im.activeUser({id})
      }
    }
  }
  catch(err) {
    console.log('im err' ,err, new Date())
  }

  user.isActive = active

  yield user.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}



// 添加伪会员聊天
exports.addAdminChat = function *(next) {
  let {from, to, content} = this.request.body
  if(!from || !to) {
    return (this.body = {
      ret: 0,
      err: 'from or to is empty'
    })
  }

  let userFrom = yield User.findOne({mobile: from}, {mobile: 1}).exec()
  let userTo = yield User.findOne({mobile: to}, {mobile: 1}).exec()

  if(!userFrom || !userTo) {
    return (this.body = {
      ret: 0,
      err: 'this mobile is not found'
    })
  }

  let newchat = new Chat({
    fromid: userFrom._id,
    toid: userTo._id,
    content: content || '你好，可以聊聊吗'
  })

  yield newchat.save()

  let chatbox = yield Chatbox.findOne({userid: userFrom._id, to: userTo._id}).exec()
  if(chatbox) {
    chatbox.content = msg
  } else {
    chatbox = new Chatbox({
      userid: userFrom._id,
      to: userTo._id,
      content: content || '你好，可以聊聊吗'
    })
  }

  yield chatbox.save()

  let chatboxTo = yield Chatbox.findOne({userid: userTo._id, to: userFrom._id}).exec()
  if(chatboxTo) {
    chatboxTo.content = msg
  } else {
    chatboxTo = new Chatbox({
      userid: userTo._id,
      to: userFrom._id,
      content: content || '你好，可以聊聊吗'
    })
  }

  yield chatboxTo.save()


  return (this.body = {
    ret: 1,
    userid: userFrom._id,
    toid: userTo._id
  })

}

// 伪会员聊天列表  
exports.mockChatList = function *(next) {
  // if(!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户没有登录'
  //   })
  // }

  // 浅复制
  // function shallowCopy(src) {
  //   var dst = {};
  //   for (var prop in src) {
  //     if (src.hasOwnProperty(prop)) {
  //       dst[prop] = src[prop];
  //     }
  //   }
  //   return dst;
  // }

  let number = this.query.pageNumber || 1

  let skip = (number - 1) * 10

  // let users = yield User.find({mock: true},{nickname: 1}).skip(skip).limit(10).exec()
  let users = yield User.find({mock: true},{nickname: 1, mobile: 1}).exec()
  let results = []
  for (let i = 0; i < users.length; i++) {
    let userId = users[i]._id
    let chats = yield Chatbox.find({userid: userId}).populate('to', 'nickname').exec()

    if(chats && chats.length > 0) {
      for (let j = 0; j < chats.length; j++) {
        let _chat = chats[j]
        let chat = {
          chat: _chat
        }
        if(_chat && _chat.to && _chat.to.nickname) {
          chat.nickname = users[i].nickname
          chat.mobile = users[i].mobile
          chat.userId = userId
          chat.thatName = _chat.to.nickname
          results.push(chat)
        }
      }
    }
  }
  let recordTotal = results.length

  results.sort(function(item1, item2) {
    let i1 = new Date(item1.chat.meta.updatedAt).getTime()
    let i2 = new Date(item2.chat.meta.updatedAt).getTime()
    return i2 - i1
  })

  results = results.slice(skip, skip + 10)

  this.body = {
    ret: 1,
    chats: results,
    recordTotal: recordTotal
  }
}

// mockChatList 后台伪会员消息盒子
exports.mockChatbox = function *(next) {


  let userId = this.query.userid || ''

  let owner = yield User.findOne({_id: userId}, {sex: 1, auditStatus: 1, avatar: 1, nickname: 1, oldName: 1, completion: 1, vip: 1, vipLevel: 1}).exec()
  let acess = role.checkReadRole(owner)

  let chatboxs = yield Chatbox.find({userid: userId}).populate('to', '_id nickname oldName auditContent avatar vip completion vipLevel').sort({'meta.updatedAt': -1}).exec()

  let results = []

  if(chatboxs && chatboxs.length > 0) {
    for (var i = 0; i < chatboxs.length; i++) {
      if(chatboxs[i] && chatboxs[i].to) {
        let chat = {}
        let chatbox = chatboxs[i]
        let unReaderNews = yield Chat.count({toid: userId, readed: false, fromid: chatbox.to._id}).exec()
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
        // if(!acess) {
        //   chat.last_chat_content = '你没权限查看消息，请升级为会员'
        // }

        results.push(chat)
      }
    }
  }

  let msgNum = yield Chat.count({toid: userId, readed: false}).exec()
  this.body = {
    ret: 1,
    acess: acess,
    sex: owner.sex,
    msgNum: msgNum,
    recordTotal: results.length,
    user: owner,
    chats: results
  }
}

// 伪会员 查看和某个人的聊天记录
exports.mockReadMsg = function *(next) {
  // if(!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户没有登录'
  //   })
  // }

  // 打开的 对话对象的 用户id
  let chatId = this.query.toid

  let userId = this.query.userid

  if(!chatId) {
    return (this.body = {
      ret: 0,
      err: '用户聊天对象id 不存在'
    })
  }

  let user = yield User.findOne({_id: userId}, {avatar:1, sex: 1, auditStatus: 1, vip: 1, nickname: 1}).exec()

  // let acess = role.checkReadRole(user)


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

  // if(!acess) {
  //   for (var i = 0; i < _chats.length; i++) {
  //     if(_chats[i].toid.toString() === userId.toString()) {
  //       _chats[i].content = '你没权限查看消息，请升级为会员'
  //     }
  //   }
  // }

  let chat = yield User.findOne({_id: chatId}, {sex: 1, auditStatus: 1, vip: 1, platform: 1, nickname: 1, avatar: 1, age: 1, lovePrice: 1, city: 1, addr: 1, traceid: 1}).populate({path: 'traceid'}).exec()
  // // 判断是否有看对方已读的权限，如果有，就通知，发消息的人，你的消息已读
  if(chat.vip && chat.vip.role) {
    let notice = user.nickname + '阅读了您的消息!'
    let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
    try {
      let sound = chat.traceid.soundChat || true
      jpush.readChat(chat.platform, chat.registration_id, notice, user.nickname, user._id, msgNum, sound)
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
  //  chats = chats.concat(uchats)
  //  chats = chats.sort(function(a, b) {
  //    let at = new Date(a.meta.createdAt)
  //    at = at.getTime()
  //    let bt = new Date(b.meta.createdAt)
  //    bt = bt.getTime()
  //    return at > bt
  //  })
  // }
  // console.log(_chats)

  this.body = {
    ret: 1,
    user: user,
    chatTo: chat,
    chats: _chats
  }
}


exports.mockSendMsg = function *(next) {
  

  let msg = this.request.body.msg
  let to = this.request.body.to || ''
  let _id = this.request.body.id || ''

  if(!_id || !to || msg === '' || to === 'null' || to === 'undefined') {
    return (this.body = {
      ret: 0,
      err: 'msg 或者 to 不能为空'
    })
  }


  let user = yield User.findOne({_id: _id}, {sex: 1, auditStatus: 1, vip: 1, nickname: 1, platform: 1, registration_id: 1, traceid: 1}).populate({path: 'traceid'}).exec()

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
  // let acess = yield role.checkSendRole(user)
  // console.log('sendmsg====', acess)

  // if(!acess) {
  //   return (this.body = {
  //     ret: 4,
  //     acess: acess,
  //     msg: '没有权限，请升级成会员后操作'
  //   })
  // }

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

  let userTo = yield User.findOne({_id: to}, {sex: 1, auditStatus: 1, vip: 1, nickname: 1, platform: 1, registration_id: 1, traceid: 1}).populate({path: 'traceid'}).exec()
  // 查看对方是否有读信息的权限
  if(!userTo) {
    return (this.body = {
      ret: 0,
      err: '你所发送的对象不存在'
    })
  }

  let acessTo = role.checkReadRole(userTo)

  if(acessTo) {
    if(user.vip && user.vip.role) {
      let trace = yield Trace.findOne({userid: to}, {targetChat: 1}).exec()
      // 如果你在对方的当前聊天框里面，直接返回对面已读你的消息
      if(trace.targetChat === _id) {
        let notice = userTo.nickname + 'read you message'
        let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
        newchat.readed = true
        yield newchat.save()
        // try {
        //  yield jpush.readChat(user.platform, user.registration_id, 　notice, user.nickname, userTo._id, msgNum)
        // } catch(_err) {
        //  console.log(_err)
        // }
      }
    }
  }

  let result
  if(userTo.platform && userTo.registration_id) {
    let notice = user.nickname + '给您发了一条消息'
    let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
    if(!acessTo) {
      // notice = '你收到一条新消息，请升值VIP后查看'
      msg = '你收到一条新消息，请升级会员后查看'
    }
    try {
      let sound = userTo.traceid.soundChat || true
      result = yield jpush.chat(userTo.platform, userTo.registration_id, notice, msg, acessTo, _id, msgNum, sound)
    } catch(_err) {
      console.log(_err)
    }
    console.log('推送结果', result)
  }

  this.body = {
    ret: 1,
    msgid: newchat._id,
    result: result
    // acess: acess
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
exports.adminReplyPhotoPri = function *(next) {

  let id = this.request.body.id || ''
  let reply = this.request.body.reply
  let userid = this.request.body.userId
  let state
  if(reply == 'yes'){
    state = "yes"
  }
  if(reply == 'no'){
    state = 'no'
  } 

  let user = yield User.findOne({_id: userid}, {nickname: 1}).exec()

  if(reply == 'yes') {
    console.log('userid===',userid)
    let trace = yield Trace.findOne({userid: id}).exec()
    if(trace.photoPri) {
      let tracestate = false
      for(let i = 0;i < trace.photoPri.length;i++){
        if(userid.toString() == trace.photoPri[i].toString()){
          tracestate = true
          
        }
      }
      if(!tracestate){
        trace.photoPri.push(userid)
        trace.markModified('photoPri')
        console.log('trace===',trace)
        console.log('userid===',userid)
        yield trace.save()
      }
      // if(trace.photoPri.indexOf(userid) == -1) {
      //  trace.photoPri.push(userid)
      //  trace.markModified('photoPri')
      //  yield trace.save()
      // }
    } else {
      trace.photoPri = []
      trace.photoPri.push(userid)
      trace.markModified('photoPri')
      console.log('0000trace===',trace)
      console.log('0000userid===',userid)
      yield trace.save()
    }

    let _trace = yield Trace.findOne({userid: userid}).exec()
    if(_trace.photoPried) {
      let _tracestate = false
      for(let i = 0;i < _trace.photoPried.length;i++){
        if(id.toString() == _trace.photoPried[i].toString()){
          _tracestate = true
        }
      }
      if(!_tracestate){
        _trace.photoPried.push(id)
        _trace.markModified('photoPried')
        console.log('_trace===',trace)
        console.log('id===',id)
        yield _trace.save()
      }
      // if(_trace.photoPried.indexOf(id) == -1) {
      //  _trace.photoPried.push(id)
      //  _trace.markModified('photoPried')
      //  yield _trace.save()
      // }
    } else {
      _trace.photoPri = []
      _trace.photoPried.push(id)
      _trace.markModified('photoPried')
      console.log('0000_trace===',_trace)
      console.log('0000id===',id)
      yield _trace.save()
    }
  }

  // 推送通知对方，已经同意查看私照
  let userTo = yield User.findOne({_id: id}).exec()
  let result
  if(userTo.platform && userTo.registration_id) {
    let notice = user.nickname + '私照请求已通过，到主页即可查看，羞羞哒！'

    let msgNum = yield Chat.count({toid: userTo._id, readed: false}).exec()
    try {
      result = yield jpush.replyPhotoPri(userTo.platform, userTo.registration_id, notice, notice, reply, id, msgNum)
    } catch(_err) {
      console.log(_err)
    }
    console.log('推送结果', result)
  }
  let chats = yield Chat.find({fromid: id, msgType:'requirePhotoPri'}).exec()
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



// 读取txt往数据库添加敏感词脚本
exports.txtToSensitive = function *(next) {

  var file = process.cwd() + '/public/keywords.txt'

  try {
      var data = fs.readFileSync(file, 'utf8');
      data = data.split('\n')
  } catch(e) {
      console.log('Error:', e.stack);
  }

  for (var i = data.length - 1; i >= 0; i--) {
    let content = data[i] || ''
    let sensitive = yield Sensitive.findOne({content: content}).exec()
    if(!sensitive) {
      let newSensitive = new Sensitive({
        content: content,
        creater: 'txt'
      })
      yield newSensitive.save()
    }
  }

  this.body = {
    ret: 1,
    msg: data.length
  }
}

/**
 * @api {post} /addSensitive  后台添加敏感词
 * @apiName addSensitive
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台添加敏感词
 *
 * @apiParam {String} content 敏感词内容
 * @apiParam {String} creater 创建人 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/addSensitive
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   msg 'ok'
 *
 * @apiError ret 0
 * @apiError err '该敏感词已经存在'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": "ok"
 *     }
 */
exports.addSensitive = function *(next) {
  let content = this.request.body.content || ''
  let creater = this.request.body.creater || 'nobody'

  let sensitive = yield Sensitive.findOne({content: content}).exec()

  if(sensitive) {
    return (this.body = {
      ret: 0,
      msg: '该敏感词已经存在'
    })
  }

  let newSensitive = new Sensitive({
    content: content,
    creater: creater
  })
  yield newSensitive.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}

/**
 * @api {get} /delSensitive  后台删除敏感词
 * @apiName delSensitive
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台删除敏感词
 *
 * @apiParam {String} id 敏感词id
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/delSensitive
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   msg 'ok'
 *
 * @apiError ret 0
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": "ok"
 *     }
 */
exports.delSensitive = function *(next) {
  let id = this.query.id || ''

  let sensitive = yield Sensitive.findOne({_id: id}).exec()

  if(!sensitive) {
    return (this.body = {
      ret: 0,
      msg: '该敏感词不存在'
    })
  }


  yield newSensitive.remove()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}

/**
 * @api {post} /editSensitive  后台编辑敏感词
 * @apiName editSensitive
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台编辑敏感词
 *
 * @apiParam {String} id 敏感词条 id
 * @apiParam {String} content 敏感词内容
 * @apiParam {String} creater 创建人 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/editSensitive
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   msg 'ok'
 *
 * @apiError ret 0
 * @apiError err '该敏感词不存在'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": "ok"
 *     }
 */
exports.editSensitive = function *(next) {
  console.log(this.request.body)
  let id = this.request.body.id || ''
  let content = this.request.body.content || ''
  let updater = this.request.body.updater || ''
  let action = this.request.body.action || ''

  let sensitive = yield Sensitive.findOne({_id: id}).exec()


  if(!sensitive) {
    return (this.body = {
      ret: 0,
      err: '该敏感词不存在'
    })
  }

  if(action === 'delete') {
    yield sensitive.remove()
    return (this.body = {
      ret: 2,
      msg: 'ok'
    })
  }

  sensitive.content = content

  if(updater) {
    sensitive.updater = updater
  }

  yield sensitive.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}

/**
 * @api {get} /sensitiveList  后台敏感词列表
 * @apiName sensitiveList
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台敏感词列表
 *
 * @apiParam {String} content 敏感词内容 // 查找该敏感词的词条
 * @apiParam {String} creater 创建人 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/sensitiveList
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   sensitives [{sensitive1},{sensitive2}]
 *
 * @apiError ret 0
 * @apiError err '该敏感词不存在'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "sensitives": [{sensitive1},{sensitive2}]
 *     }
 */
exports.sensitiveList = function *(next) {
  console.log(this.query)
  let content = this.query.content || ''
  let number = this.query.pageNumber || 1
  // l creater = this.query.creater || ''

  let skip = (number - 1) * 10

  let query = {}
  let sensitives = []
  if(content) {
    query.content = content
    sensitives = yield Sensitive.find(query).exec()
  } else {
    sensitives = yield Sensitive.find(query).sort({'meta.createdAt': -1}).skip(skip).limit(10).exec()
  }
  let recordTotal = yield Sensitive.count(query).exec()
  this.body = {
    ret: 1,
    recordTotal: recordTotal,
    sensitives: sensitives
  }
}


// 批量通过excel 添加用户
exports.fadeAccount = function *(next) {
  let sex = this.query.sex || 1
  let results = yield common.excelToJson(sex)
  results = results.Sheet1
  for (var i = results.length - 1; i >= 0; i--) {
    let result = results[i]
    let _mobile = result['登录手机'] || ''
    let _user = yield User.findOne({mobile: _mobile}).exec()
    if(!_user) {
      
      let mobiData = yield amap.mobile(result['登录手机'])
      let lat = mobiData.lat
      let lng = mobiData.lng

      let user = new User({
        nickname: result['昵称'],
        work: result['职业'],
        character: result['个性签名'],
        selfInfo: result['自我介绍'],
        // looking: result['正在寻找'],
        mobile: result['登录手机'],
        password: result['密码'],
        number: result['编号'],
        auditStatus: 'success',
        sex: sex,
        lat: lat,
        lng: lng,
        locAuthorize: false,
        mock: true
      })

      let loc = {
        type: 'Point',
        coordinates: [Number(lng), Number(lat)]
      }
      user.loc = loc

      let trace = new Trace({
        userid: user._id
      })
      user.traceid = trace._id

      yield user.save()
      yield trace.save()
    }

  }

  return (this.body = {
    ret: 1,
    msg: 'ok'
  })
}


/**
 * @api {post} /addMockUser  添加伪会员
 * @apiName addMockUser
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription  添加伪会员
 *
 * @apiParam {String} nickname 昵称(不修改传原来的值)
 * @apiParam {String} addr 地区
 * @apiParam {String} mobile 手机号
 * @apiParam {String} password 密码
 * @apiParam {String} age 年龄
 * @apiParam {String} lovePrice 宠爱指数
 * @apiParam {String} loveDate 甜蜜目标
 * @apiParam {String} assets 总资产
 * @apiParam {String} income 年收入
 * @apiParam {String} sports 运动
 * @apiParam {String} tour 旅游
 * @apiParam {String} body 体型
 * @apiParam {String} height 身高
 * @apiParam {String} drink 饮酒习惯
 * @apiParam {String} smoking 抽烟习惯
 * @apiParam {String} education 最高学历
 * @apiParam {String} work 职业描述
 * @apiParam {String} character 个性标签
 * @apiParam {String} selfInfo 自我介绍
 * @apiParam {String} looking 正在寻找
 * @apiParam {String} pub 公开照片
 * @apiParam {String} common 私照
 * @apiParam {String} life 生活照
 * @apiParam {String} tourPhoto 旅游照
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/addMockUser
 *
 * @apiSuccess {Number}   ret   1.
 * @apiSuccess {String}   err '编辑成功'.
 *
 * @apiError ret 0.
 * @apiError err   '编辑失败'.
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "error": "编辑成功",
 *       "completion": 90,
 *     }
 */
exports.addMockUser = function *(next) {
    // console.log(this.request.body)
    let bodys = this.request.body
    // if(!this.session.user) {
    //     return (
    //         this.body = {
    //             ret: 0,
    //             err: '用户没有登录，请登录'
    //         }
    //     )
    // }

    if(!bodys.mobile) {
        return (
            this.body = {
                ret: 0,
                err: '手机号码必填'
            }
        )
    }

    let user = yield User.findOne({mobile: bodys.mobile},{mobile:1}).exec()

    if(user) {
      return (
          this.body = {
              ret: 0,
              err: '手机号码已存在'
          }
      )
    }

    let pub = bodys.pub
    let common = bodys.common

    // console.log(bodys)

    if(pub && pub.length > 0) {
      for (var i = pub.length - 1; i >= 0; i--) {
        pub[i] = {
          addr: pub[i],
          enable: true
        }
      }
    }

    let _pri = []
    if(common && common.length > 0) {
      for (var i = common.length - 1; i >= 0; i--) {
        let bb = {
          addr: common[i],
          category: 'common',
          enable: true
        }
        _pri.push(bb)
      }
    }

    let pri = ['life', 'tourPhoto', 'car', 'house', 'goods', 'sport', 'work', 'swimwear', 'looks']
    for (var i = pri.length - 1; i >= 0; i--) {
      if(bodys[pri[i]]) {
        let aa = {
          addr: bodys[pri[i]],
          category: pri[i],
          enable: true
        }
        _pri.push(aa)
      }
    }
    console.log('======BODYS',bodys)
    let newUser = new User({
      password: xss(bodys.password),
      nickname: bodys.nickname,
      mobile: bodys.mobile,
      addr: bodys.addr,
      age: bodys.age,
      sex: bodys.sex,
      lovePrice: bodys.lovePrice,
      loveDate: bodys.loveDate,
      assets: bodys.assets,
      income: bodys.income,
      sports: bodys.sports,
      tour: bodys.tour,
      body: bodys.body,
      height: bodys.height,
      drink: bodys.drink,
      smoking: bodys.smoking,
      education: bodys.education,
      work: bodys.works,
      character: bodys.character,
      selfInfo: bodys.selfInfo,
      // looking: bodys.looking,
      avatar: bodys.avatar,
      auditStatus: "ing",   
      photoPub: pub,
      mock:true,
      iNeed:bodys.iNeed,
      afford:bodys.afford,
      hopeful:bodys.hopeful,
      photoPri: _pri
    })

    

    let mobiData = yield amap.mobile(bodys.mobile)
    let lat = mobiData.lat
    let lng = mobiData.lng

    let loc = {
      type: 'Point',
      coordinates: [Number(lng), Number(lat)]
    }
    newUser.loc = loc

    let trace = new Trace({
      userid: newUser._id
    })

    newUser.traceid = trace._id

    // 计算完整度
    let result = 0
    const weightSource = weight.name


    let keys = Object.keys(weightSource)
    for(let i in keys) {
      let key = keys[i]
      if(newUser[key]) {
        result += weightSource[key]
      }
    }
    // if(bodys.works){
    //   result += 4
    // }
    // if(pub.length){
    //   result += 12
    // }

    if(result > 100) {
      result = 100
    }

    newUser.completion = result

    yield newUser.save()
    yield trace.save()

    this.body = {
        ret: 1,
        err: '添加成功',
        user: newUser
    }

}


/**
 * @api {post} /editMockUser  编辑伪会员
 * @apiName editMockUser
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription  编辑伪会员
 *
 * @apiParam {String} nickname 昵称(不修改传原来的值)
 * @apiParam {String} addr 地区
 * @apiParam {String} age 年龄
 * @apiParam {String} lovePrice 宠爱指数
 * @apiParam {String} loveDate 甜蜜目标
 * @apiParam {String} assets 总资产
 * @apiParam {String} income 年收入
 * @apiParam {String} sports 运动
 * @apiParam {String} tour 旅游
 * @apiParam {String} body 体型
 * @apiParam {String} height 身高
 * @apiParam {String} drink 饮酒习惯
 * @apiParam {String} smoking 抽烟习惯
 * @apiParam {String} education 最高学历
 * @apiParam {String} work 职业描述
 * @apiParam {String} character 个性标签
 * @apiParam {String} selfInfo 自我介绍
 * @apiParam {String} looking 正在寻找
 * @apiParam {String} pub 公开照片
 * @apiParam {String} common 私照
 * @apiParam {String} life 生活照
 * @apiParam {String} tourPhoto 旅游照
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/editMockUser
 *
 * @apiSuccess {Number}   ret   1.
 * @apiSuccess {String}   err '编辑成功'.
 *
 * @apiError ret 0.
 * @apiError err  '编辑失败'.
 *
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "error": "编辑成功",
 *       "completion": 90,
 *     }
 */
exports.editMockUser = function *(next) {
    // console.log(this.request.body)
    let bodys = this.request.body
    // if(!this.session.user) {
    //   return (
    //     this.body = {
    //       ret: 0,
    //       err: '用户没有登录，请登录'
    //     }
    //   )
    // }

    if(!bodys.mobile) {
        return (
            this.body = {
                ret: 0,
                err: '手机号码必填'
            }
        )
    }

    let user = yield User.findOne({mobile: bodys.mobile}).exec()

    console.log(bodys)

    let pub = bodys.pub
    let common = bodys.common

    if(pub && pub.length > 0) {
      for (var i = pub.length - 1; i >= 0; i--) {
        pub[i] = {
          addr: pub[i],
          enable: true
        }
      }
    }
    if(pub && pub.length == 0){
      pub = []
    }
    if(common && common.length == 0){
      _pri = []
    }

    let _pri = []
    if(common && common.length > 0) {
      for (var i = common.length - 1; i >= 0; i--) {
        let bb = {
          addr: common[i],
          category: 'common',
          enable: true
        }
        _pri.push(bb)
      }
    }

    let pri = ['life', 'tourPhoto', 'car', 'house', 'goods', 'sport', 'work', 'swimwear', 'looks']
    for (var i = pri.length - 1; i >= 0; i--) {
      if(bodys[pri[i]]) {
        let aa = {
          addr: bodys[pri[i]],
          category: pri[i],
          enable: true
        }
        _pri.push(aa)
      }
    }


    console.log(bodys)

    user.nickname = bodys.nickname
    user.mobile = bodys.mobile
    user.addr = bodys.addr
    user.age = bodys.age
    user.sex = bodys.sex
    user.lovePrice = bodys.lovePrice
    user.loveDate = bodys.loveDate
    user.assets = bodys.assets
    user.income = bodys.income
    user.sports = bodys.sports
    user.tour = bodys.tour
    user.body = bodys.body
    user.height = bodys.height
    user.drink = bodys.drink
    user.smoking = bodys.smoking
    user.education = bodys.education
    user.work = bodys.works
    user.character = bodys.character
    user.selfInfo = bodys.selfInfo
    user.avatar = bodys.avatar
    user.afford = bodys.afford
    user.iNeed = bodys.iNeed
    user.hopeful = bodys.hopeful
    user.auditStatus = "ing"   
    user.photoPub = pub
    user.photoPri = _pri


   

    let mobiData = yield amap.mobile(bodys.mobile)
    let lat = mobiData.lat
    let lng = mobiData.lng

    let loc = {
      type: 'Point',
      coordinates: [Number(lng), Number(lat)]
    }
    user.loc = loc
    let result = 0
    const weightSource = weight.name


    // 兼用低版本 looking 的分值计算
    if(user.iNeed || user.afford || user.hopeful) {
      weightSource.looking = 0
    }

    let keys = Object.keys(weightSource)
    for(let i in keys) {
      let key = keys[i]
      if(user[key]) {
        result += weightSource[key]
      }
    }

    if(result > 100) {
      result = 100
    }

    user.completion = result

    yield user.save()

    this.body = {
        ret: 1,
        err: '修改成功',
        user: user
    }

}

/**
 * @api {get} /mockUserList  查找伪会员的列表
 * @apiName getAppLists
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台查找伪会员的列表
 *
 * @apiParam {String} mobile 输入手机的时候就是查找指定一个该手机的用户
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/mockUserList
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '没有更多数据了'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": [user1]
 *     }
 */
exports.mockUserList = function *(next) {

  let mobile = this.query.mobile || ''

  let results
  if(mobile) {
    results = yield User.find({mobile: mobile,mock: true}).sort({'meta.createdAt': -1}).exec()
  } else {
    results = yield User.find({mock: true}).exec()
  }

  this.body = {
    ret: 1,
    results: results
  }
}


/**
 * @api {post} /adminLogin  后台用户登录
 * @apiName adminLogin
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台用户登录
 *
 * @apiParam {String} userName 用户名
 * @apiParam {String} password 用户密码
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/adminLogin
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err 'ok'
 *
 * @apiError ret 0
 * @apiError err err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok"
 *     }
 */
exports.adminLogin = function *(next) {
  let adminName = "jige"
  let adminNames = "chengge"
  let adminPassWord = "123"

  let userName = this.request.body.userName
  let userPassword = this.request.body.userPassword
  if (adminName !== userName && adminNames !== userName) {
    return (this.body = {
      ret: 0,
      err: '用户不存在'
    })
  }
  if (adminPassWord !== userPassword){
    return (this.body = {
      ret: 0,
      err: '密码错误'
    })
  }
  this.session.user = {
    state:1
  }
  this.body = {
    ret: 1,
    err: '登陆成功'
  }
}


/**
 * @api {get} /getLists  查找不同审核状态的列表
 * @apiName getLists
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 查找不同审核状态的列表
 *
 * @apiParam {String} auditStatus 状态，1.ing 2.success 3.failed
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getLists
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '查找失败'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": Object
 *     }
 */
exports.getAdminLists = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let limit = 10
  let auditStatus = this.query.auditStatus
  let lists
  if(auditStatus !== 'ing'){
    lists = yield User.find({auditStatus:auditStatus}).sort({'auditAt': -1}).skip(0).limit(limit).exec()
  }else{
    lists = yield User.find({auditStatus:auditStatus}).sort({'meta.createdAt': -1}).skip(0).limit(limit).exec()
  }
  const count = yield User.count({auditStatus:auditStatus}).exec()
  console.log(count)
  this.body = {
    ret: 1,
    err: '查找成功',
    results:lists,
    count:Math.ceil(count / limit)
  }
}

exports.auditorLists = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }

  let query = {}


  let {startTime, endTime, mobile, nickname, froms, auditStatus, vip, mock, sex, pageNumber, coupon} = this.query

  if(startTime && endTime) {
    query['meta.createdAt'] = {$gte: startTime, $lte: endTime}
  }

  if(startTime && !endTime) {
    query['meta.createdAt'] = {$gte: startTime}
  }

  if(!startTime && endTime) {
    query['meta.createdAt'] = {$lte: endTime}
  }

  let number = pageNumber || 1

  let skip = (number - 1) * 10

  if(coupon) {
    query = {'vip.coupons': coupon}
  }
  if(nickname) {
    query = {nickname: nickname}
  }
  if(mobile) {
    query = {mobile: mobile}
  }
  if(auditStatus) {
    query.auditStatus = auditStatus
  }

  if(sex) {
    query.sex = sex
  }
  if(froms) {
    query.from = froms
  }

  if(vip == 'yes') {
    query['vip.role'] = true
  }

  if(vip == 'no') {
    query['vip.role'] = false
  }

  if(mock == 'yes') {
    query['mock'] = true
  }

  if(mock == 'no') {
    query['mock'] = false
  }
  let limit = 10

  let lists = yield User.find(query).sort({'sortAt': -1}).skip(skip).limit(limit).exec()
  let count = yield User.count(query).exec()
  this.body = {
    ret: 1,
    recordTotal: count,
    lists: lists
  }
}


exports.userLists = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }

  let query = {}


  let {startTime, endTime, mobile, nickname, froms, auditStatus, vip, mock, sex, pageNumber, coupon} = this.query

  if(startTime && endTime) {
    query['meta.createdAt'] = {$gte: startTime, $lte: endTime}
  }

  if(startTime && !endTime) {
    query['meta.createdAt'] = {$gte: startTime}
  }

  if(!startTime && endTime) {
    query['meta.createdAt'] = {$lte: endTime}
  }

  let number = pageNumber || 1

  let skip = (number - 1) * 10

  if(coupon) {
    query = {'vip.coupons': coupon}
  }
  if(nickname) {
    query = {nickname: nickname}
  }
  if(mobile) {
    query = {mobile: mobile}
  }
  if(auditStatus) {
    query.auditStatus = auditStatus
  }

  if(sex) {
    query.sex = sex
  }
  if(froms) {
    query.from = froms
  }

  if(vip == 'yes') {
    query['vip.role'] = true
  }

  if(vip == 'no') {
    query['vip.role'] = false
  }

  if(mock == 'yes') {
    query['mock'] = true
  }

  if(mock == 'no') {
    query['mock'] = false
  }
  let limit = 10

  let lists = yield User.find(query).sort({'meta.createdAt': -1}).skip(skip).limit(limit).exec()
  let count = yield User.count(query).exec()
  this.body = {
    ret: 1,
    recordTotal: count,
    lists: lists
  }
}

/**
 * @api {get} /payList  获取订单列表
 * @apiName payList
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 获取订单列表
 *
 * @apiParam {String} status 支付状态，1.ing 2.success 3.failed
 * @apiParam {String} mobile 用手机查找某一个订单
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getLists
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '查找失败'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": [pay1,pay2]
 *     }
 */
exports.payList = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  console.log(this.query)

  let query = {}
  let starTime = this.query.starTime
  let endTime = this.query.endTime
  let mobile = this.query.mobile
  let from = this.query.from
  if(starTime && endTime) {
    query['meta.createdAt'] = {$gte: starTime, $lte: endTime}
  }

  if(starTime && !endTime) {
    query['meta.createdAt'] = {$gte: starTime}
  }

  if(!starTime && endTime) {
    query['meta.createdAt'] = {$lte: endTime}
  }

  let filts = ['status', 'payType', 'meal','from']

  for (var i = filts.length - 1; i >= 0; i--) {
    if(this.query[filts[i]]) {
      query[filts[i]] = this.query[filts[i]]
    }
  }

  let number = this.query.pageNumber

  let skip = (number - 1) * 10

  let pays = []
  let recordTotal = 0
  if(mobile) {
    pays = yield Pay.find({mobile: mobile}).exec()
  } else {
    pays = yield Pay.find(query).sort({'meta.createdAt': -1}).skip(skip).limit(10).exec()
    recordTotal = yield Pay.count(query).exec()
  }
  this.body = {
    ret: 1,
    recordTotal: recordTotal,
    pays: pays
  }
}

/**
 * @api {get} /payDetail  获取订单详情
 * @apiName payDetail
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 获取订单详情
 *
 * @apiParam {String} status 支付状态，1.ing 2.success 3.failed
 * @apiParam {String} mobile 用手机查找某一个订单
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getLists
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '查找失败'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": [pay1,pay2]
 *     }
 */
exports.payDetail = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }

  let query = {}

  if(status) {
    query = {
      status: status
    }
  }

  if(mobile) {
    query = {
      mobile: mobile
    }
  }

  let lists = yield Pay.find(query).exec()


  this.body = {
    ret: 1,
    err: '查找成功',
    results:lists
  }
}


/**
 * @api {post} /isPass  后台审核通过
 * @apiName isPass
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台审核通过
 *
 * @apiParam {String} personId id
 * @apiParam {String} auditStatus 状态，1.ing 2.success 3.failed
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/isPass
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '审核通过'
 *
 * @apiError ret 0
 * @apiError err '找不到该用户'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "审核通过",
 *     }
 */
exports.isPass = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let personId = this.request.body.personId
  let auditStatus = this.request.body.auditStatus
  const user = yield User.findOne({_id:personId}).exec()

  if(!user) {
    return (this.body = {
      ret: 0,
      err: '找不到该用户'
    })
  } 

  if(user.photoPri && user.photoPri.length > 0) {
    for (var i = user.photoPri.length - 1; i >= 0; i--) {
      user.photoPri[i].enable = true
    }
  }

  if(user.photoPub && user.photoPub.length > 0) {
    for (var i = user.photoPub.length - 1; i >= 0; i--) {
      user.photoPub[i].enable = true
    }
  }

  if(!user.avatar && user.photoPub && user.photoPub.length > 0) {
    user.completion += 12
    user.avatar = user.photoPub[0].addr
  }


  user.auditContent.character = '1'
  user.auditContent.selfInfo = '1'
  user.auditContent.work = '1'
  user.auditContent.nickname = '1'
  user.auditContent.avatar = '1'
  // user.auditContent.looking = "1"
  user.faceScore = user.firstFaceScore
  user.auditStatus = auditStatus

  user.auditAt = Date.now()
  console.log('Date.now()====',Date.now())
  console.log('user.auditAt====',user.auditAt)

  user.markModified('photoPri')
  user.markModified('photoPub')
  yield user.save()

  let result
  if(user.platform && user.registration_id) {
    let notice = Msg(user.lan, 115)

    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: notice
    })
    yield _notice.save()

    let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
    let noticeNum = yield Notice.count({userid: user._id, readed: false}).exec()
    try {
      let boss = 'no'
      if(user.from == 'boss') {
        boss = 'yes'
      }
      result = yield jpush.pass(user.platform, user.registration_id, notice, notice, user._id, msgNum, noticeNum, boss)
    } catch(_err) {
      console.log(_err)
    }
    console.log('推送结果', result)
  }


  this.body = {
    ret: 1,
    err: '审核通过'
  }
}


/**
 * @api {post} /findAdmin  根据手机号或者昵称搜索用户
 * @apiName findAdmin
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 根据手机号或者昵称搜索用户
 *
 * @apiParam {String} nickName 昵称
 * @apiParam {String} phoneNumber 电话
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/findAdmin
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '没有找到数据'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "查找成功",
 *       "result": {xxx}
 *     }
 */
exports.findAdmin = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let findField = {}
  let nickName = this.request.body.nickName
  let id = this.request.body.id
  let auditStatus = this.request.body.auditStatus
  if(nickName) {
    findField.nickname = nickName
  }
  if(id) {
    findField._id = id
  }
  if(auditStatus) {
    findField.auditStatus = auditStatus
  }

  let users = yield User.findOne(findField).exec()
  if (!users) {
    return (this.body = {
      ret: 0,
      err: '没有找到数据'
    })
  }
  this.body = {
    ret: 1,
    err: '查找成功',
    results:users
  }
}


/**
 * @api {post} /sendRejust  发送拒绝理由
 * @apiName sendRejust
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 发送拒绝理由
 *
 * @apiParam {String} name 拒绝的字段
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/sendRejust
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '操作成功'
 *
 * @apiError ret 0
 * @apiError err '没有找到数据'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "操作成功"
 *     }
 */
exports.sendRejust = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let reason = this.request.body.reason
  console.log("reason======",reason)
  let id = this.request.body.id || ''
  let user = yield User.findOne({_id: id}).exec()
  if (!user) {
    return (this.body = {
      ret: 0,
      err: '没有找到数据'
    })
  }
  let notices = co.wrap(function* (reject) {
    let _notice = new Notice({
      userid: user._id,
      content: reject
    })
    return yield _notice.save()
  });
  let reject = ''
  if(reason.character){
    if(reason.characterReason){
      user.auditReson.character = reason.characterReason
      reject = Msg(user.lan, 97)+reason.characterReason+Msg(user.lan, 107)
    }else{
      reject = Msg(user.lan, 98)
    }
      user.auditContent.character = "0"
      notices(reject)
        
  }
  if(reason.nickname){
    if(reason.nicknameReason){
      user.auditReson.nickname = reason.nicknameReason
      reject = Msg(user.lan, 99)+reason.nicknameReason+Msg(user.lan, 107)
    }else{
      reject = Msg(user.lan, 100)
    }
      user.auditContent.nickname = "0"
      notices(reject)
  }
  if(reason.selfInfo){
    if(reason.selfInfoReason){
      user.auditReson.selfInfo = reason.selfInfoReason
      reject = Msg(user.lan, 101)+reason.selfInfoReason+Msg(user.lan, 107)
    }else{
      reject = Msg(user.lan, 102)
    }
      user.auditContent.selfInfo = "0"
      notices(reject)
  }
  if(reason.work){
    if(reason.workReason){
      user.auditReson.work = reason.workReason
      reject = Msg(user.lan, 103)+reason.workReason+Msg(user.lan, 107)
    }else{
      reject = Msg(user.lan, 104)
    }
      user.auditContent.work = "0"
      notices(reject)
  }
  if(reason.avatar){
    if(reason.avatarReason){
      user.auditReson.avatar = reason.avatarReason
      reject = Msg(user.lan, 105)+reason.avatarReason+Msg(user.lan, 107)
    }else{
      reject = Msg(user.lan, 106)
    }
      user.auditContent.avatar = "0"
      notices(reject)
  }
  if(reason.pri && reason.pri.length > 0) {
    for(let i in reason.pri) {
      for (let j = 0;j < user.photoPri.length;j++) {
        if(reason.pri[i] === user.photoPri[j].addr) {
          user.photoPri[j].enable = false
          let n = j + 1
          if(reason.priReason[j] !== ''){
            console.log('JJJJJ====',j)
            reject = Msg(user.lan, 108) + n + Msg(user.lan, 109)+reason.priReason[j]+Msg(user.lan, 111)
            user.photoPri[j].reason = reason.priReason[j]
          }else{
            reject = Msg(user.lan, 108) + n + Msg(user.lan, 104)+Msg(user.lan, 111)
          }
          reject += 
          notices(reject)
        }
      }
    }

  }

  if(reason.pub && reason.pub.length > 0) {
    for(let i in reason.pub) {
      for (let j = 0;j < user.photoPub.length;j++) {
        if(reason.pub[i] === user.photoPub[j].addr) {
          user.photoPub[j].enable = false
          let n = j + 1
          if(reason.pubReason[j] !== ''){
            reject = Msg(user.lan, 108) + n + Msg(user.lan, 110)+reason.pubReason[j]+Msg(user.lan, 111)
            user.photoPub[j].reason = reason.pubReason[j]

          }else{
            reject = Msg(user.lan, 108) + n + Msg(user.lan, 113)+Msg(user.lan, 111)
          }
          notices(reject)
        }
      }
    }
  }

  



  let result
  if(user.platform && user.registration_id) {
    let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
    let noticeNum = yield Notice.count({userid: user._id, readed: false}).exec()
    try {
      let boss = 'no'
      if(user.from == 'boss') {
        boss = 'yes'
      }
      result = yield jpush.reject(user.platform, user.registration_id, reject, reject, user._id, msgNum, noticeNum, boss)
    } catch(_err) {
      console.log(_err)
    }
  }

  user.auditAt = Date.now()

  user.auditStatus = 'failed'
  user.markModified('photoPri')
  user.markModified('photoPub')
  yield user.save()
  this.body = {
    ret: 1,
    jpsuhResult: result,
    err: '操作成功'
  }
}

/**
 * @api {get} /findByNumber  根据页码跳转
 * @apiName findByNumber
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 根据页码跳转
 *
 * @apiParam {String} number 页码
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/findByNumber
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 * @apiSuccess {Object}   result '{_id, mobile}'
 *
 * @apiError ret 0
 * @apiError err '没有更多数据了哦'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "查找成功",
 *       "result": {xxx}
 *     }
 */
exports.findByNumber = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let limmitNumber = 10

  let pagination = this.query.pagination || 0
  
  pagination = pagination - 1

  let auditStatus = this.query.auditStatus
  let users
  if(auditStatus !== 'ing'){
    users = yield User.find({auditStatus:auditStatus}).sort({'auditAt': -1}).skip(limmitNumber*pagination).limit(limmitNumber).exec()
  }else{
    users = yield User.find({auditStatus:auditStatus}).sort({'meta.createdAt': -1}).skip(limmitNumber*pagination).limit(limmitNumber).exec()
  }
  const count = yield User.count({auditStatus:auditStatus}).exec()
  if (users.results) {
    return (this.body = {
      ret: 0,
      err: '没有更多数据了哦'
    })
  }
  this.body = {
    ret: 1,
    err: '查找成功',
    results:users,
    count:Math.ceil(count / limmitNumber)
  }
}


/**
 * @api {get} /normalList  查找正常会员的列表
 * @apiName getNormalLists
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台查找正常会员的列表
 *
 * @apiParam {String} mobile 输入手机的时候就是查找指定一个该手机的用户
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/normalList
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '没有更多数据了'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *       "results": [user1]
 *     }
 */
exports.normalList = function *(next) {

  let mobile = this.query.mobile || ''

  let results
  if(mobile) {
    results = yield User.find({mobile: mobile,mock: false}).exec()
  } else {
    results = yield User.find({mock: false}).sort({'meta.createdAt': -1}).exec()
  }
  this.body = {
    ret: 1,
    results: results
  }
}

/**
 * @api {get} /couponList  后台邀请码列表
 * @apiName couponList
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台邀请码列表
 *
 * @apiParam {String} content 邀请码内容
 * @apiParam {String} creater 创建人 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/couponList
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   coupons [{coupon1},{coupon2}]
 *
 * @apiError ret 0
 * @apiError err '该邀请码不存在'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "coupons": [{coupon1},{coupon2}]
 *     }
 */
exports.couponList = function *(next) {
  console.log(this.query)
  let content = this.query.content || ''
  let number = this.query.pageNumber || 1

  let skip = (number - 1) * 10

  let query = {}
  let coupons = []
  if(content) {
    query.content = content
    coupons = yield Coupon.find(query).exec()
  } else {
    coupons = yield Coupon.find(query).sort({'meta.createdAt': -1}).skip(skip).limit(10).exec()
  }
  let recordTotal = yield Coupon.count(query).exec()
  // let _user = []
  // if(coupons && coupons.length > 0){
  //   for (let i = 0 ; i < coupons.length ; i++) {
  //         for(let j = 0 ; j < coupons[i].useCodeid.length ; j++){
  //         let user = yield User.findOne({_id:  coupons[i].useCodeid[j]},{mobile: 1}).exec()
  //         if(user){
  //           _user.push(user.mobile)
  //         } 
  //       }
  //   coupons[i].useCodeid = _user
  //   }


  // }
    
  this.body = {
    ret: 1,
    recordTotal: recordTotal,
    coupons: coupons
  }
}


/**
 * @api {post} /editoupon  后台编辑邀请码
 * @apiName editoupon
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台编辑邀请码
 *
 * @apiParam {String} id 邀请码条 id
 * @apiParam {String} content 邀请码内容
 * @apiParam {String} action 操作
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/editcoupon
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   msg 'ok'
 *
 * @apiError ret 0
 * @apiError err '该邀请码不存在'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": "ok"
 *     }
 */
exports.editCoupon = function *(next) {
  console.log(this.request.body)
  let id = this.request.body.id || ''
  let meta = this.request.body.meta || ''
  let updater = this.request.body.updater || ''
  let action = this.request.body.action || ''
  let coupon = yield Coupon.findOne({_id: id}).exec()
  
  if(!coupon) {
    return (this.body = {
      ret: 0,
      err: '该邀请码不存在'
    })
  }

  if(action === 'delete') {
    yield coupon.remove()
    return (this.body = {
      ret: 2,
      msg: 'ok'
    })
  }

  console.log(meta)
  coupon.meta.endAt = new Date(meta.endAt)

  if(updater) {
    coupon.updater = updater
  }

  yield coupon.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}


/**
 * @api {post} /addCoupon  后台添加邀请码
 * @apiName addCoupon
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 后台添加邀请码
 *
 * @apiParam {String} content 邀请码内容
 * @apiParam {String} creater 创建人 
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/addCoupon
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   msg 'ok'
 *
 * @apiError ret 0
 * @apiError err '该邀请码已经存在'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "msg": "ok"
 *     }
 */
exports.addCoupon = function *(next) {
  let content = this.request.body.content || ''
  let endTime = this.request.body.endTime || ''
  let methods = this.request.body.methods || ''
  // let creater = this.request.body.creater || 'nobody'
  let coupon = yield Coupon.findOne({content: content}).exec()

  if(coupon) {
    return (this.body = {
      ret: 0,
      msg: '该邀请码已经存在'
    })
  }

  let newCoupon = new Coupon({
    content: content,
    methods: methods,
    meta: {
      endAt:new Date(endTime)
    }
  })

  yield newCoupon.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}



exports.push = function *(next) {
  let content = this.request.body.content
  let id = this.request.body.id
  let user = yield User.findOne({_id: id}).exec()

  // 通知中心
    let _notice = new Notice({
      userid: id,
      content: content
    })
    yield _notice.save()

    let result
    if(user.platform && user.registration_id) {
      let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
      let noticeNum = yield Notice.count({userid: user._id, readed: false}).exec()
      try {
        let boss = 'no'
        if(user.from == 'boss') {
          boss = 'yes'
        }
        result = yield jpush.reject(user.platform, user.registration_id, content, content, user._id, msgNum, noticeNum, boss)
      } catch(_err) {
        console.log(_err)
      }
    }



  this.body = {
    ret: 1,
    msg: '发送成功'
  }

}

/**
 * @api {get} /getDate  获取收入
 * @apiName getDate
 * @apiGroup Admin
 * @apiPermission Admin
 *
 * @apiDescription 获取收入
 *
 *
 * @apiExample Example usage:
 * http://lovechat.legle.cc/getDate
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   err '查找成功'
 *
 * @apiError ret 0
 * @apiError err '查找失败'
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 1,
 *       "err": "ok",
 *     }
 */
exports.getDate = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  //总收入
  let totalPay = yield Pay.find({status: 'success',from: 'boss'},{value:1}).exec()
  let total = 0
  for(let i = 0; i < totalPay.length; i++){
    total += totalPay[i].value
  }
  //今日收入
  let query = {status: 'success',from: 'boss'}
  let formToday = new Date();
  formToday.setHours(0);
  formToday.setMinutes(0);
  formToday.setSeconds(0);
  formToday.setMilliseconds(0);
  let toToday = new Date(new Date(formToday).getTime() + 3600*24*1000)
  query['meta.createdAt'] = {$gte: formToday, $lte: toToday}
  let todayPay = yield Pay.find(query,{value:1}).exec()

  let todayTotal = 0
  for(let i = 0; i < todayPay.length; i++){
    todayTotal += todayPay[i].value
  }
  //今日订单
  let todayOrder = yield Pay.count(query).exec()
  //上个月
  let lastQuery = {status: 'success',from: 'boss'}
  let firstQuery = {status: 'success',from: 'boss'}
  let nowdays = new Date();  
  let year = nowdays.getFullYear();  
  let month = nowdays.getMonth();  
  if(month==0)  
  {  
      month=12;  
      year=year-1;  
  }  
  if (month < 10) {  
      month = "0" + month;  
  }  
  let firstDay = year + "-" + month + "-" + "01";//上个月的第一天  
  let myDate = new Date(year, month, 0);  
  let myfirstDay = new Date(year, month, 1);  
  let lastDay = year + "-" + month + "-" + myDate.getDate();//上个月的最后一天
  let mylastDay = year + "-" + month + "-" + myfirstDay.getDate();//上个月的最后一天
  lastQuery['meta.createdAt'] = {$gte: firstDay, $lte: lastDay}
  firstQuery['meta.createdAt'] = {$gte: mylastDay, $lte: new Date()}
  // 总支付次数
  let lastTotal = yield Pay.count({status: 'success',from: 'boss'}).exec()

  // 总注册人数
  let lastOrder = yield User.count({mock: false,from: 'boss'}).exec()

  //这个月总收入
  let monthTotal = yield Pay.find(firstQuery,{value:1}).exec()
  let monthTotals = 0
  for(let i = 0; i < monthTotal.length; i++){
    monthTotals += monthTotal[i].value
  }
  let lessTarget = monthTotals - 70000


  //今天男女
  let queryboy = {mock: false,sex:1,from: 'boss'}
  let querygirl = {mock: false,sex:2,from: 'boss'}
  queryboy['meta.createdAt'] = {$gte: formToday, $lte: toToday}
  querygirl['meta.createdAt'] = {$gte: formToday, $lte: toToday}
  let todayboy = yield User.count(queryboy).exec()
  let todaygirl = yield User.count(querygirl).exec()


  this.body = {
    ret: 1,
    totalPay: parseInt(total),//总收入
    todayTotal:parseInt(todayTotal),//今日收入
    todayOrder:parseInt(todayOrder),//今日订单
    lastTotal:parseInt(lastTotal),//总支付次数
    lastOrder:parseInt(lastOrder),//总注册人数
    lessTarget:parseInt(lessTarget),//这个月距离7000
    todayboy:parseInt(todayboy),
    todaygirl:parseInt(todaygirl)

  }
}


exports.getMoney = function *(next) {
  //上个月
  let query = {status: 'success',from: 'boss'}
  let nowdays = new Date();  
  let year = nowdays.getFullYear();  
  let month = nowdays.getMonth();  
  if(month==0)  
  {  
      month=12;  
      year=year-1;  
  }  
  if (month < 10) {  
      month = "0" + month;  
  }  
  let myDate = new Date(year, month, 1);  
  let lastDay = year + "-" + month + "-" + myDate.getDate();//上个月的最后一天
  query['meta.createdAt'] = {$gte: lastDay, $lte: new Date()}
  //上月总收入
  let moneys = yield Pay.find(query,{value:1}).exec()
  let money = 0
  for(let i = 0; i < moneys.length; i++){
    money += moneys[i].value
  }
  this.body = {
    ret: 1,
    money:money//这个月的总收入
  }
}


exports.getSexTotal = function *(next) {
  let manTotal = yield User.count({sex:1, mock: false,from: 'boss'}).exec()
  let womenTotal = yield User.count({sex:2, mock: false,from: 'boss'}).exec()
  this.body = {
    ret: 1,
    manTotal:manTotal,
    womenTotal:womenTotal

  }
}

exports.getAge = function *(next) {
  let a = yield User.count({age:{$gte: 0, $lte: 18},from: 'boss'}).exec()
  let b = yield User.count({age:{$gte: 19, $lte: 25},from: 'boss'}).exec()
  let c = yield User.count({age:{$gte: 26, $lte: 30},from: 'boss'}).exec()
  let d = yield User.count({age:{$gte: 31, $lte: 35},from: 'boss'}).exec()
  let e = yield User.count({age:{$gte: 36, $lte: 50},from: 'boss'}).exec()
  let f = yield User.count({age:{$gte: 51, $lte: 100},from: 'boss'}).exec()
  let total = yield User.count({age:{$gte: 0, $lte: 100},from: 'boss'}).exec()
  this.body = {
    ret: 1,
    a:a,
    b:b,
    c:c,
    d:d,
    e:e,
    f:f,
    total:total
  }
}

exports.getAddr = function *(next) {
  let total = yield User.find({mock: false, province: {$exists: true},from: 'boss'},{province:1}).exec()
  console.log(total.length)
  let lastTotal = []
  for(let i = 0; i < total.length; i++){
    if(total[i].province){
      if(!!total[i].province.match('省')){
        lastTotal.push(total[i].province.slice(0,total[i].province.match("省").index))
      }else if(!!total[i].province.match('市')){
        lastTotal.push(total[i].province.slice(0,total[i].province.match("市").index))
      }else if(!!total[i].province.match('广西')){
        lastTotal.push('广西')
      }else{
        lastTotal.push(total[i].province)
        console.log('total[i].province=====',total[i].province)
      }
    }
  }
  let arr = [];  
  lastTotal.sort();  
  for(var i = 0;i<lastTotal.length;)  
  {  
     
   var count = 0;  
   for(var j=i;j<lastTotal.length;j++)  
   {  
         
    if(lastTotal[i] == lastTotal[j])  
    {  
     count++;  
    }  
      
   }
   arr.push({"name":lastTotal[i],"value":count});  
   i+=count;  
     
  } 
  this.body = {
    ret: 1,
    arr:arr
  }
}


exports.getiveOrder = function *(next) {
  function getTime(num){
    var date = new Date(); //获取当前Date对象
    date.setHours(num);
    date.setMinutes(num);
    date.setSeconds(num);
    date.setMilliseconds(num)
    return date
  }
  let query = {status: 'success',from: 'boss'}
  let queryTwo = {status: 'success',from: 'boss'}
  let queryThree = {status: 'success',from: 'boss'}
  let queryFour = {status: 'success',from: 'boss'}
  let queryOne = {status: 'success',from: 'boss'}
  query['meta.createdAt'] = {$gte: getTime(0), $lte: new Date()}
  queryOne['meta.createdAt'] = {$gte: getTime(-24), $lte:getTime(0)}
  queryTwo['meta.createdAt'] = {$gte: getTime(-48), $lte: getTime(-24)}
  queryThree['meta.createdAt'] = {$gte: getTime(-72), $lte: getTime(-48)}
  queryFour['meta.createdAt'] = {$gte: getTime(-96), $lte: getTime(-72)}
  //五天订单
  let order = yield Pay.count(query).exec()
  let oneOrder = yield Pay.count(queryOne).exec()
  let twoOrder = yield Pay.count(queryTwo).exec()
  let threeOrder = yield Pay.count(queryThree).exec()
  let fourOrder = yield Pay.count(queryFour).exec()
  
  this.body = {
    ret: 1,
    order:[fourOrder,threeOrder,twoOrder,oneOrder,order]
  }
}


/**
 * @api {post} /boss/getAdminWish  管理后台获取所有的心愿
 * @apiName getAdminWish
 * @apiGroup user
 * @apiPermission User
 *
 * @apiDescription 管理后台获取所有的心愿
 *
 * @apiParam {String} pageNumber 页码1，2，3
 * @apiParam {String} skip 一页多少条10，20
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/boss/getWish
 *
 * @apiSuccess {Number}   ret 1
 * @apiSuccess {String}   list []
 *
 * @apiError ret 0
 * @apiError err  err message
 * @apiErrorExample Response (example):
 *     HTTP/1.1 200 Ok
 *     {
 *       "ret": 0
 *       "list": [{
 *           "isLove":"yes", 自己点过赞 
 *           "_id": "59afce7cbc959c500b4dc943",
 *           "userid": "5973146b72292702a79a9486",  该用户的id
 *           "content": "哈哈",                       心愿内容
 *           "imgUrl": "http://test-love-chat.oss-cn-shenzhen.aliyuncs.com/fateImage/156177833201504693881.jpg",心愿墙图片url
 *           "nickname": "佳哥",
 *           "sex": "1",
 *           "avatar": "http://love-chat.oss-cn-shanghai.aliyuncs.com/man-public/156177833201501121486.jpg",
 *           "__v": 3,
 *           "meta": {
 *               "updatedAt": "2017-09-07T01:40:04.949Z",
 *               "createdAt": "2017-09-06T10:31:24.269Z"
 *           },
 *           "loved": [
 *              "597eff5ad8d3f8727b15e6c2"  点赞的人的id  喜欢数是该数组的长度
 *           ],
 *           "auditStatus": "ing",  审核状态
 *           "Forwarding": 0         转发数目
 *
 *                  }]
 *     }
 */


exports.getAdminWish = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }

  let query = {}


  let { mobile, nickname, auditStatus, sex, pageNumber} = this.query

  

  let number = pageNumber || 1

  let skip = (number - 1) * 10

  if(nickname) {
    query = {nickname: nickname}
  }
  if(mobile) {
    query = {mobile: mobile}
  }
  if(auditStatus) {
    query.auditStatus = auditStatus
  }

  if(sex) {
    query.sex = sex
  }

  let limit = 10
  const lists = yield Wish.find(query).sort({'sortAt': -1}).skip(skip).limit(limit).exec()
  const count = yield Wish.count(query).exec()
  this.body = {
    ret: 1,
    recordTotal: count,
    lists: lists
  }
}

exports.findWish = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let findField = {}
  let id = this.request.body.id
  
  if(id) {
    findField._id = id
  }

  let users = yield Wish.findOne(findField).exec()
  if (!users) {
    return (this.body = {
      ret: 0,
      err: '没有找到数据'
    })
  }
  this.body = {
    ret: 1,
    err: '查找成功',
    results:users
  }
}


exports.wishPass = function *(next) {
  
  let wishId = this.request.body.wishId
  let wish = yield Wish.findOne({_id:wishId}).exec()
  let user = yield User.findOne({_id:wish.userid}).exec()
  let notices = co.wrap(function* (reject) {
    let _notice = new Notice({
      userid: user._id,
      content: reject
    })
    return yield _notice.save()
  });
  if(!wish) {
    return (this.body = {
      ret: 0,
      err: '找不到该数据'
    })
  } 



  wish.auditContent.content = 'success'
  wish.auditContent.imgUrl = 'success'
  

  wish.auditStatus = 'success'

  wish.auditAt = Date.now()
  

  
  yield wish.save()

  let result
  if(user.platform && user.registration_id) {
    let notice = Msg(user.lan, 117)

    // 通知中心
    let _notice = new Notice({
      userid: user._id,
      content: notice
    })
    yield _notice.save()

    let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
    let noticeNum = yield Notice.count({userid: user._id, readed: false}).exec()
    try {
      let boss = 'no'
      if(user.from == 'boss') {
        boss = 'yes'
      }
      result = yield jpush.pass(user.platform, user.registration_id, notice, notice, user._id, msgNum, noticeNum, boss)
    } catch(_err) {
      console.log(_err)
    }
    let reject = Msg(user.lan, 117)
    notices(reject)
    console.log('推送结果', result)
  }


  this.body = {
    ret: 1,
    err: '审核通过'
  }
}



exports.sendWishRejust = function *(next) {
  // if (!this.session.user) {
  //   return (this.body = {
  //     ret: 0,
  //     err: '用户还没登录'
  //   })
  // }
  let reason = this.request.body.reason
  console.log("reason======",reason)
  let id = this.request.body.id || ''
  let wish = yield Wish.findOne({_id: id}).exec()
  let user = yield User.findOne({_id: wish.userid}).exec()
  if (!wish) {
    return (this.body = {
      ret: 0,
      err: '没有找到数据'
    })
  }
  let notices = co.wrap(function* (reject) {
    let _notice = new Notice({
      userid: user._id,
      content: reject
    })
    return yield _notice.save()
  });
  let reject = ''
  if(reason.content == 'yes'){
    if(reason.reasonC){
      wish.auditReson.content = reason.reasonC
      reject = Msg(user.lan, 116)+reason.reasonC+Msg(user.lan, 111)
    }else{
      reject = Msg(user.lan, 111)
    }
      wish.auditContent.content = 'failed'
      notices(reject)
        
  }
  if(reason.imgUrl == 'yes'){
    if(reason.reasonI){
      wish.auditReson.imgUrl = reason.reasonI
      reject = Msg(user.lan, 116)+reason.reasonI+Msg(user.lan, 111)
    }else{
      reject = Msg(user.lan, 111)
    }
      wish.auditContent.imgUrl = 'failed'
      notices(reject)
  }
  


  let result
  if(user.platform && user.registration_id) {
    let msgNum = yield Chat.count({toid: user._id, readed: false}).exec()
    let noticeNum = yield Notice.count({userid: user._id, readed: false}).exec()
    try {
      let boss = 'no'
      if(user.from == 'boss') {
        boss = 'yes'
      }
      result = yield jpush.toone(user.platform, user.registration_id, reject, reject, user._id, msgNum, noticeNum, boss)

    } catch(_err) {
      console.log(_err)
    }
  }

  wish.auditAt = Date.now()

  wish.auditStatus = 'failed'
  yield wish.save()
  this.body = {
    ret: 1,
    jpsuhResult: result,
    err: '操作成功'
  }
}

