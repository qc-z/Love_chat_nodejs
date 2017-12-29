const RECORD_ADDRESS = 'RECORD_ADDRESS'

const state = {
	latitude: 112,
	longitude: 113
}
const _state = {
	latitude: 222,
	longitude: 333
}

const Aa = {
[RECORD_ADDRESS](state, {
		latitude,
		longitude
	}) {
		state.latitude = latitude
		state.longitude = longitude
	}
}


Aa[RECORD_ADDRESS](state,_state)

console.log(state)

