const CancelError = new Error('CancelError')

class InternalState {
    constructor() {
        this.isCanceled = false
    }

    cancel() {
        this.isCanceled = true
    }
}

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
            throw CancelError
        }
    }
}

function CancelToken(executor) {
    const internalState = new InternalState()
    return new _CancelToken(internalState, executor)
}

CancelToken.create = function() {
    const internalState = new InternalState()

    return [
        new _CancelToken(internalState, null),
        internalState.cancel.bind(internalState),
    ]
}

module.exports = {
    CancelError,
    CancelToken,
}