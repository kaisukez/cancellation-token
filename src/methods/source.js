const InternalState = require('../classes/InternalState')
const { _CancelToken } = require('../classes/CancelToken')

const source = function() {
    const internalState = new InternalState()

    return {
        token: new _CancelToken(internalState, null),
        cancel: internalState.cancel.bind(internalState),
    }
}

module.exports = source