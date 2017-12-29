'use strict'

const mongoose = require('mongoose')
const Chat = mongoose.model('Chat')
const Notice = mongoose.model('Notice')
const config = require('../../config/config')
const en = require('./msg').en
const zh = require('./msg').zh
const ft = require('./msg').ft

exports.requireLogin = function *(next) {
	if (!this.session.user) {
    return (this.body = {
      ret: 0,
      err: '用户未登录'
    })
  }
  yield next
}

exports.msg = function(language, index) {
	if(language == 'en') {
		return en[index]
	}
	else if(language == 'ft') {
		return ft[index]
	}
	else {
		return zh[index]
	}
}

function msgs(language, index) {
	if(language == 'en') {
		return en[index]
	}
	else if(language == 'ft') {
		return ft[index]
	}
	else {
		return zh[index]
	}
}

exports.checkReadRole = function(user, language) {
	let lan = language || 'zh'
	return new Promise(function(resolve, reject) {
		if(config.shield === 'yes') {
			resolve({ret: 1})
		}
		else if(user.sex === 1) {
			if(user.vip && user.vip.role) {
				resolve({ret: 1})
			} else {
				if(user.coupon && user.couponType == 'chat') {
					Chat.count({toid: user._id}).then(function(count) {
						if(count > 9) {
							// 通知中心
						  let cnotice = msgs(lan, 118)
							Notice.findOne({userid:user._id, content: cnotice}).then(function(nn) {
								if(!nn) {
						      let _notice = new Notice({
						        userid: user._id,
						        content: cnotice
						      })
						      _notice.save()
									resolve({ret:4, err: cnotice})
								} else {
									resolve({ret:4, err: cnotice})
								}
							})
						}
						else {
							resolve({ret: 1})
						}
					})
				}
				else {
					resolve({ret: 0, err: msgs(lan, 119)})
				}
			}
		} else {
			resolve({ret: 1})
		}
	})
}

exports.checkSendRole = function(user, language) {
	let lan = language || 'zh'
	return new Promise(function(resolve, reject) {
		if(config.shield === 'yes') {
			resolve({ret: 1})
		}
		else if(user.vip && user.vip.role) {
			resolve({ret: 1})
		}
		else if(user.sex === 1) {
			if(user.coupon && user.couponType == 'chat') {
				Chat.count({fromid: user._id}).then(function(count) {
					if(count > 9) {
						if(user.completion > 89) {
							Chat.count({fromid: user._id}).then(function(countCom) {
								if(countCom > 19) {
									// 通知中心
						      let cnotice = msgs(lan, 120)
						      let _notice = new Notice({
						        userid: user._id,
						        content: cnotice
						      })
						      _notice.save()
									resolve({ret:4, err: cnotice})
								}
								else {
									resolve({ret: 1})
								}
							})
						}
						else {
							// 通知中心
				      let cnotice = msgs(lan, 121)
				      let _notice = new Notice({
				        userid: user._id,
				        content: cnotice 
				      })
				      _notice.save()
							resolve({ret:7, err: cnotice})
						}
					}
					else {
						resolve({ret: 1})
					}
				})
			}
			else {
				if(user.completion > 89) {
					Chat.count({fromid: user._id}).then(function(countCom) {
						if(countCom > 9) {
							// 通知中心
				      let cnotice = msgs(lan, 124)
				      let _notice = new Notice({
				        userid: user._id,
				        content: cnotice
				      })
				      _notice.save()
							resolve({ret:4, err: cnotice})
						}
						else {
							resolve({ret: 1})
						}
					})
				}
				else {
					resolve({ret: 7, err: msgs(lan, 122)})
				}
			}
		} else {
			if(user.completion > 89) {
				resolve({ret: 1})
			} else {
				resolve({ret: 7, err: msgs(lan, 122)})
			}
		}
	})
}

