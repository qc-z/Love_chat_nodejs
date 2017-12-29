const redis = require('redis')
const wrapper = require('co-redis')

const online = redis.createClient()
const onlineCo = wrapper(online)


exports.getOnline = function *(next) {
	return new Promise(function(resolve, reject) {
		onlineCo.keys('*', function(err, replies) {
			if(err) {
				reject(err)
			} else {
				resolve(replies)
			}
		})
	})
}