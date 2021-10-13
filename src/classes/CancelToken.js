const CancelError = require('./CancelError')
const InternalState = require('./InternalState')

class _CancelToken {
    #internalState

    constructor(internalState, executor) {
        this.#internalState = internalState
        if (typeof executor === 'function') {
            executor(this.#internalState.cancel.bind(this.#internalState))
        }
    }

    get isCanceled() {
        return this.#internalState.isCanceled
    }

    throwIfCanceled() {
        if (this.#internalState.isCanceled) {
            throw new CancelError
        }
    }
}

function CancelToken(executor) {
    const internalState = new InternalState()
    return new _CancelToken(internalState, executor)
}

module.exports = {
    _CancelToken,
    CancelToken,
}