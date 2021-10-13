const CancelError = require('./classes/CancelError')

const { CancelToken } = require('./classes/CancelToken')
const source = require('./methods/source')
const race = require('./methods/race')
const all = require('./methods/all')

CancelToken.source = source
CancelToken.race = race
CancelToken.all = all


const Task = {
    sleep: async ms => new Promise(resolve => setTimeout(resolve, ms)),
    ignoreCancelError: async promise => {
        try {
            return await promise
        } catch (error) {
            if (error instanceof CancelError) {
                return
            }
            
            throw error
        }
    }
}

module.exports = {
    CancelError,
    CancelToken,
    Task,
}