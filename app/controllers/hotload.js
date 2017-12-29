'use strict'
const mongoose = require('mongoose')
const Hotload = mongoose.model('Hotload')

/**
 * @api {get} /hotloadInfo  热更新版本信息
 * @apiName hotloadInfo
 * @apiGroup Hotload
 * @apiPermission User
 *
 * @apiDescription 热更新版本信息
 *
 *
 * @apiExample Example usage:
 * http://test.legle.cc:81/hotloadInfo
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
 *        data: [
 *          {name: 'style.cc', version: 'v1.0.0', url: 'aliyun.com/style.cc'},
 *          {name: 'about.html', version: 'v1.0.0', url: 'aliyun.com/about.html'}
 *        ]
 *     }
 */
exports.hotloadInfo = function *(next) {

  let hotLoad = yield Hotload.find().exec()

  if(!hotLoad) {
     return (this.body = {
      ret: 0,
      msg: '该应用包不存在'
     })
  }

  this.body = {
    ret: 1,
    data: hotLoad
  }
}

exports.getHotloadList = function *(next) {
  let content = this.query.content || ''
  let number = this.query.pageNumber || 1

  let skip = (number - 1) * 10

  let query = {}
  let hotLoads = []
  if(content) {
    query.name = content
    hotLoads = yield Hotload.find(query).exec()
  } else {
    hotLoads = yield Hotload.find(query).sort({'meta.createdAt': -1}).skip(skip).limit(10).exec()
  }
  let recordTotal = yield Hotload.count(query).exec()
    
  this.body = {
    ret: 1,
    recordTotal: recordTotal,
    coupons: hotLoads
  }
}


exports.editHotload = function *(next) {

  let hotloadId = this.request.body._id || ''
  let action = this.request.body.action || ''
  let hotload = yield Hotload.findOne({_id: hotloadId}).exec()
  let bodyKeys = Object.keys(this.request.body)
  if(!hotload) {
    return (this.body = {
      ret: 0,
      err: '该版本不存在'
    })
  }

  if(action === 'delete') {
    yield hotload.remove()
    return (this.body = {
      ret: 2,
      msg: 'ok'
    })
  }

  for(let i = 0;i < bodyKeys.length;i++){
  	let key = this.request.body[bodyKeys[i]]
  	if(bodyKeys[i] !== '_id' && bodyKeys[i] !=='action'){
  		hotload[bodyKeys[i]] = key
  		console.log(hotload)
  	}
  }
  yield hotload.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}


exports.addHotload = function *(next) {
  let {name, version, url} = this.request.body

  let hotload = yield Hotload.findOne({name: name, version: version, url: url}).exec()

  if(hotload) {
    return (this.body = {
      ret: 0,
      msg: '该版本号已经存在'
    })
  }
  
  let hotloadArr = {
    name: name,
    version: version,
    url: url
  }

  let newhotload = new Hotload(hotloadArr)

  yield newhotload.save()

  this.body = {
    ret: 1,
    msg: 'ok'
  }

}

