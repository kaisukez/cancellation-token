class InternalState {
    constructor() {
        this.isCanceled = false
    }

    cancel() {
        this.isCanceled = true
    }
}

module.exports = InternalState