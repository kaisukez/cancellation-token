import CancellationError from './CancellationError'

const EMPTY_FUNCTION = () => {}

export interface IBasicCancellationToken {
    isCancellationRequested: boolean
    throwIfCancellationRequested(): void
}

export default class CancellationToken implements IBasicCancellationToken {
    public readonly canBeCancelled = true
    private _isCancellationRequested: boolean = false
    private _cancellationError: CancellationError = new CancellationError()
    private _cancellationCallbacks: Set<(reason?: any) => void> = new Set()
    // private _unregisterFunctions: (() => boolean)[] = []

    public static readonly UNCANCELLABLE_TOKEN = new CancellationToken(EMPTY_FUNCTION, { canBeCanceled: false })
    public static readonly ALREADY_CANCELLED_TOKEN = new CancellationToken(cancel => cancel())

    public constructor (
        executor: (cancel: (reason?: any) => void) => void,
        options?: { canBeCanceled: boolean },
    ) {
        const cancel = (reason?: any) => {
            this._isCancellationRequested = true
            this._cancellationError = new CancellationError(reason)
            
            for (const callback of this._cancellationCallbacks) {
                callback(reason)

                // Delete registered callback after it was called.
                // You can delete item from Set while iterating (https://stackoverflow.com/questions/28306756/is-it-safe-to-delete-elements-in-a-set-while-iterating-with-for-of).
                this._cancellationCallbacks.delete(callback)
            }
        }
        executor(cancel)

        if (options?.canBeCanceled) {
            this.canBeCancelled = options.canBeCanceled
        }
    }

    public static source() {
        let cancel: (reason?: any) => void = EMPTY_FUNCTION
        const token = new CancellationToken(_cancel => cancel = _cancel)
        return {
            token,
            cancel,
        }
    }

    public static sourceArray(): [CancellationToken, (reason?: any) => void] {
        const { token, cancel } = CancellationToken.source()
        return [
            token,
            cancel,
        ]
    }

    public static race(tokens: CancellationToken[]) {
        for (const token of tokens) {
            if (token.isCancellationRequested) {
                return token
            }
        }
        
        const [combinedToken, cancelCombinedToken] = CancellationToken.sourceArray()
        const unregisterFunctions: ((reason?: any) => void)[] = []
        const cancelCombinedTokenAndUnregisterAllCallbacks = (reason: any) => {
            cancelCombinedToken(reason)
            for (const unregisterFunction of unregisterFunctions) {
                unregisterFunction()
            }
        }
        for (const token of tokens) {
            if (token.canBeCancelled) {
                const unregisterFunction = token.onCancel(cancelCombinedTokenAndUnregisterAllCallbacks)
                unregisterFunctions.push(unregisterFunction)
            }
        }
        return combinedToken
    }

    public static all(tokens: CancellationToken[]) {
        for (const token of tokens) {
            if (!token.canBeCancelled) {
                return token
            }
        }

        const [combinedToken, cancelCombinedToken] = CancellationToken.sourceArray()
        let currentCancelledCount = 0
        const onCancel = (reason: any) => {
            if (++currentCancelledCount === tokens.length) {
                const reasons: any[] = []
                for (const token of tokens) {
                    try {
                        token.throwIfCancellationRequested()
                    } catch (error) {
                        if (error instanceof CancellationError) {
                            reasons.push(error?.reason)
                        } else {
                            throw error
                        }
                    }
                }
                cancelCombinedToken(reason)
            }
        }
        for (const token of tokens) {
            token.onCancel(onCancel)
        }
        return combinedToken
    }

    public get isCancellationRequested() {
        return this._isCancellationRequested
    }
    
    public throwIfCancellationRequested() {
        if (this._isCancellationRequested) {
            throw this._cancellationError
        }
    }

    public onCancel(callback: (reason?: any) => void) {
        if (!this.canBeCancelled) {
            return () => false
        }

        if (this.isCancellationRequested) {
            callback(this._cancellationError?.reason)
            return () => false
        }

        this._cancellationCallbacks.add(callback)
        return () => this._cancellationCallbacks.delete(callback)
    }
}