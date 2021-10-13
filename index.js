class CancelError extends Error {
    name = 'CancelError'
}

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
            throw new CancelError
        }
    }
}

function CancelToken(executor) {
    const internalState = new InternalState()
    return new _CancelToken(internalState, executor)
}

CancelToken.source = function() {
    const internalState = new InternalState()

    return {
        token: new _CancelToken(internalState, null),
        cancel: internalState.cancel.bind(internalState),
    }
}

const Task = {
    sleep: async ms => new Promise(resolve => setTimeout(resolve, ms)),
}

module.exports = {
    CancelError,
    CancelToken,
    Task,
}