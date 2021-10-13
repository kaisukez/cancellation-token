const CancelError = require('../classes/CancelError')

class _CombinedTokenRace {
    constructor(tokens) {
        this.tokens = tokens
    }

    get isCanceled() {
        return this.tokens.reduce((total, token) => total || token.isCanceled, false)
    }

    throwIfCanceled() {
        if (this.isCanceled) {
            throw new CancelError
        }
    }
}

const race = function(tokens) {
    return new _CombinedTokenRace(tokens)
}

module.exports = race