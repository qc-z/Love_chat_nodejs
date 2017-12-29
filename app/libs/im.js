'use strict'

const request = require('request-promise')
const config = require('../../config/config').im
const im={}

const client = {
  grant_type: config.grant_type,
  client_id: config.client_id,
  client_secret: config.client_secret
}

global.imToken = ''

function token() {
	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'token',
			body: client,
			json: true
		}
    request.post(hearder)
    .then(function (body) {
    		console.log('body====', body)
        if(body.access_token) {
        	global.imToken = body.access_token
        	resolve(body.access_token)
        }
        else {
        	resolve(false)
        }
    })
    .catch(function(err) {
    	console.error(err.message)
    	reject(Error('获取环信token 出错'))
    })
	})
}

im.addUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users',
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			body: data,
			json: true
		}
    request.post(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 400) {
    		resolve({ret: 0, err: '用户已存在、用户名或密码为空、用户名不合法'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 添加用户 出错'))
    	}
    })
	})
}

im.delUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data,
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.delete(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
      if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
      else {     
      	console.error(err.message)
      	reject(Error('环信 删除用户 出错'))
      }
    })
	})
}


im.getUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data,
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.get(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 404) {
    		resolve({ret: 0, err: '用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 获取用户 出错'))
    	}
    })
	})
}

im.putUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data.oldUsername,
			body: data.newUsername,
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.put(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 404) {
    		resolve({ret: 0, err: '用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 添加用户 出错'))
    	}
    })
	})
}


im.pwdUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data.username + '/password',
			body: data.password,
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.put(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 404) {
    		resolve({ret: 0, err: '用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 添加用户 出错'))
    	}
    })
	})
}

im.deactiveUser = function(data) {
    console.log('*******', global.imToken)

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data + '/deactive',
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.post(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 400) {
          resolve({ret: 0, err: '用户不存在'})
      }
      else if(err.statusCode == 401) {
        console.error(err.message)
  		  token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
    	}
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 解禁用户 出错'))
    	}
    })
	})
}

im.activeUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data.username + '/active',
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.post(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 400) {
    		resolve({ret: 0, err: '用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 禁用用户 出错'))
    	}
    })
	})
}

im.getblocksUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data + '/blocks/users',
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.get(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 404) {
    		resolve({ret: 0, err: '用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 获取用户 出错'))
    	}
    })
	})
}

im.addBlocksUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data.username + '/blocks/users',
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			body: {usernames: [data.usernameTo]},
			json: true
		}
    request.post(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 404) {
    		resolve({ret: 0, err: '被添加的用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else if(err.statusCode == 400) {
    		resolve({ret: 0, err: '用户不存在'})
    	}
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 获取用户 出错'))
    	}
    })
	})
}


im.delBlocksUser = function(data) {

	return new Promise(function(resolve, reject) {
		let hearder = {
			url: config.url + 'users/' + data.username + '/blocks/users/' + data.usernameTo,
      headers : {
          Authorization:`Bearer ${global.imToken}`
      },
			json: true
		}
    request.delete(hearder)
    .then(function (body) {
			console.log('body====', body)
    	resolve({ret: 1, body: body})
    })
    .catch(function(err) {
    	if(err.statusCode == 404) {
    		resolve({ret: 0, err: '此 IM 用户或被减的用户不存在'})
    	}
      else if(err.statusCode == 401) {
        console.error(err.message)
        token()
        resolve({ret: 2, err: 'token 过期请重新尝试'})
      }
    	else {
	    	console.error(err.message)
	    	reject(Error('环信 获取用户 出错'))
    	}
    })
	})
}





// im.token = token()

module.exports = im

