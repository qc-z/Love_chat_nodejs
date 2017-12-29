'use strict'

const request = require('request-promise')
const _ = require('lodash')
const config = require('../../config/config')
const facepp={}

const _pack={
    api_key:config.facepp.faceppv3_apikey
    ,api_secret:config.facepp.faceppv3_apisecret
}


facepp.findBigestFace = function (faces) {
  var face
  for(var i in faces)
  {
    if(face==null)
    {
       face=faces[i]
    }
    else
    {
      if(faces[i].face_rectangle.width>=face.face_rectangle.width&&faces[i].face_rectangle.height>=face.face_rectangle.height)
      {
         face=faces[i]
      }
    }
  }
  return face
}

// 用图片地址直接检测
facepp.detectUrl = function (image_url) {
	let objOpt = {
		image_url: image_url,
		return_landmark:1,
		return_attributes: 'gender,age,smiling,headpose,facequality,blur,eyestatus,ethnicity'
	}
	_.extend(objOpt, _pack)
	let form = {
		form: objOpt
	}
	return new Promise(function(resolve, reject) {
	    request.post(config.facepp.faceppv3_apiurl+'/detect', form)
	    .then(function (body) {
	        resolve(JSON.parse(body))
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('remote search facetest server unavailable'))
	    })
	})
}

// face++ 颜值测试
facepp.faceTest = function(image_url) {
	let objOpt = {
		image_url: image_url,
		return_attributes: 'gender,age,beauty'
	}
	_.extend(objOpt, _pack)
	let form = {
		form: objOpt
	}
	return new Promise(function(resolve, reject) {
	    request.post(config.facepp.faceppv3_apiurl+'/detect', form)
	    .then(function (body) {
    		body = JSON.parse(body)
    		if(body.faces && body.faces[0] && body.faces[0].attributes && body.faces[0].attributes.beauty) {
	    		let score = body.faces[0].attributes.beauty.female_score
    			if(body.faces[0].attributes.gender == 'Female') {
    				score = body.faces[0].attributes.beauty.male_score
    			}
  				if(score < 65) {
  					score = Math.random().toFixed(1) * 10 + 65
  				}
	        resolve(score)
    		}
    		else {
    			reject(Error('图片无法解析'))
    		}
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('remote search facetest server unavailable'))
	    })
	})
}


//自家的人脸颜值分析
facepp.cloudtest = function (face) {
	return new Promise(function(resolve, reject) {

	    const FaceResult = {
	        w:face.face_rectangle.width,
	        h:face.face_rectangle.height,
	        face:face
	    }

	    request({
	    	// uri:'http://106.75.99.42:8080/CloudTesting/getLooks',
	        uri:'http://localhost:8083/',
	        json:FaceResult,
	        method:'post'
	    })
	    .then(function (body) {
	    	if(typeof body === 'string') {
	    		reject(Error('图片无法解析'))
	    	}
	        resolve(body)
	    })
	    .catch(function(err) {
	    	console.error(err)
	    	reject(Error('remote facetest server unavailable'))
	    })
	})
}

module.exports = facepp
