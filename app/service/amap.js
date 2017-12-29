'use strict'

const amap = require('../../config/config').amap
const queryArea = require('query-mobile-phone-area')
const request = require('request-promise')


// 获取小数范围的随机数
function rnd(start, end){
		start = Number(start)
		end = Number(end)
    let aa = Math.random() * (end - start) + start
    let length = end.toString().split(".")[1].length
    aa = aa.toFixed(length)
    console.log('aa====', aa)
    return Number(aa)
}

// mobile 获取坐标和地址
exports.mobile = function (mobile) {
	console.log('mobile===', mobile)
	
	return new Promise(function(resolve, reject) {
			let loc = queryArea(mobile)
			if(!loc) {
	    		let aLng = 113.1017375
	    		let aLat = 22.93212254
	    		let bLng = 113.6770499
	    		let bLat = 23.3809537
	    		let lng = rnd(aLng, bLng)
	    		let lat = rnd(aLat, bLat)
	    		resolve({
		      	lng: lng,
		      	lat: lat
			})
			}
	  		let addr = loc.province + loc.city
			let url = amap.hostgeo + '?key=' + amap.key + '&address=' + addr
	    request(url).then(function (body) {
	    	if(typeof body === 'string') {
		    	try {
		    		body = JSON.parse(body)
		    	} catch(error) {
		    		reject(error)
		    	}
	    	}
	    	if(body && body.geocodes && body.geocodes[0] && body.geocodes[0].location) {
		      let lng = body.geocodes[0].location.split(',')[0]
		      let lat = body.geocodes[0].location.split(',')[1]
		      resolve({
		      	lng: lng,
		      	lat: lat
		      })
	    	} else {
	    		let aLng = 113.1017375
	    		let aLat = 22.93212254
	    		let bLng = 113.6770499
	    		let bLat = 23.3809537
	    		let lng = rnd(aLng, bLng)
	    		let lat = rnd(aLat, bLat)
	    		resolve({
		      	lng: lng,
		      	lat: lat
		      })
	    		// reject(Error('get lat lng by addr error, location empty'))
	    	}
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('get lat lng by addr error'))
	    })
	})
}

// ip 获取坐标和地址
exports.ip = function (ip) {
	return new Promise(function(resolve, reject) {
			let url = amap.hostip + '?key=' + amap.key + '&ip=' + ip
	    request(url)
	    .then(function (body) {
	    	console.log('body===', body)
	    	if(typeof body === 'string') {
		    	try {
		    		body = JSON.parse(body)
		    	} catch(error) {
		    		reject(error)
		    	}
	    	}
	 			if(body && body.rectangle) {
	 				let a = body.rectangle.split(';')[0]
	 				let b = body.rectangle.split(';')[1]
	 				let aLng = a.split(',')[0]
	 				let aLat = a.split(',')[1]
	 				let bLng = b.split(',')[0]
	 				let bLat = b.split(',')[1]
	 				let lng = aLng
	 				let lat = aLat
	 				if(bLng > aLng) {
	 					lng = rnd(aLng, bLng)
	 				} else {
	 					lng = rnd(bLng, aLng)
	 				}

	 				if(bLat > aLat) {
	 					lat = rnd(aLat, bLat)
	 				} else {
	 					lat = rnd(bLat, aLat)
	 				}

	 				resolve({
	 					lng: lng,
	 					lat: lat
	 				})
	 			} else {
	 				reject(Error('get lat lng by ip error, body err'))
	 			}
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('get lat lng by ip error'))
	    })
	})
}

// 地址 获取坐标
exports.addr = function (addr) {
	return new Promise(function(resolve, reject) {
			addr = encodeURIComponent(addr)
			let url = amap.hostgeo + '?key=' + amap.key + '&address=' + addr
			console.log('addr url====', url)
	    request(url)
	    .then(function (body) {
	    	console.log('addr body====', body)
	    	if(typeof body === 'string') {
		    	try {
		    		body = JSON.parse(body)
		    	} catch(error) {
		    		reject(error)
		    	}
	    	}
	      if(body && body.geocodes && body.geocodes[0] && body.geocodes[0].location) {
		      let lng = body.geocodes[0].location.split(',')[0]
		      let lat = body.geocodes[0].location.split(',')[1]
		      resolve({
		      	lng: lng,
		      	lat: lat
		      })
	    	} else {
	    		let aLng = 113.1017375
	    		let aLat = 22.93212254
	    		let bLng = 113.6770499
	    		let bLat = 23.3809537
	    		let lng = rnd(aLng, bLng)
	    		let lat = rnd(aLat, bLat)
	    		resolve({
		      	lng: lng,
		      	lat: lat
		      })
	    		// reject(Error('get lat lng by addr error, location empty'))
	    	}
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('get lat lng by addr error'))
	    })
	})
}

