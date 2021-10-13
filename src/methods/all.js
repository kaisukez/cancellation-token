const CancelError = require('../classes/CancelError')

class _CombinedTokenAll {
    constructor(tokens) {
        this.tokens = tokens
    }

    get isCanceled() {
        return this.tokens.reduce((total, token) => total && token.isCanceled, true)
    }

    throwIfCanceled() {
        if (this.isCanceled) {
            throw new CancelError
        }
    }
}

const all = function(tokens) {
    return new _CombinedTokenAll(tokens)
}

module.exports = all