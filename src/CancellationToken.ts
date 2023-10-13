import CancellationError from './CancellationError'

const EMPTY_FUNCTION = () => {
}
const EMPTY_ASYNC_FUNCTION = async () => {
}
const ALWAYS_FALSE = () => false

export default class CancellationToken {
    public readonly canBeCancelled: boolean = true
    private _isCancellationRequested: boolean = false
    private _cancellationError: CancellationError = new CancellationError()
    private _cancellationCallbacks: Set<((reason?: any) => void) | ((reason?: any) => Promise<void>)> = new Set()
    // private _unregisterFunctions: (() => boolean)[] = []

    public static readonly UNCANCELLABLE_TOKEN = new CancellationToken(EMPTY_FUNCTION, {canBeCanceled: false})
    public static readonly ALREADY_CANCELLED_TOKEN = new CancellationToken(cancel => cancel())

    public constructor(
        executor: (cancel: (reason?: any) => Promise<void>) => void,
        options?: { canBeCanceled?: boolean },
    ) {
        const cancel = async (reason?: any) => {
            this._isCancellationRequested = true
            this._cancellationError = new CancellationError(reason)

            const maybeAsyncFunctions = [...this._cancellationCallbacks]
            if (maybeAsyncFunctions.length) {
                await Promise.all(maybeAsyncFunctions.map(async callback => {
                    await callback(reason)

                    // Delete registered callback after it was called.
                    // You can delete item from Set while iterating (https://stackoverflow.com/questions/28306756/is-it-safe-to-delete-elements-in-a-set-while-iterating-with-for-of).
                    this._cancellationCallbacks.delete(callback)
                }))
            }
        }
        executor(cancel)

        if (options) {
            this.canBeCancelled = Boolean(options?.canBeCanceled)
        }
    }

    public static source() {
        let cancel: (reason?: any) => Promise<void> = EMPTY_ASYNC_FUNCTION
        const token = new CancellationToken(_cancel => cancel = _cancel)
        return {
            token,
            cancel,
        }
    }

    public static sourceArray(): [CancellationToken, (reason?: any) => Promise<void>] {
        const {token, cancel} = CancellationToken.source()
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

        if (tokens.every(token => !token.canBeCancelled)) {
            return CancellationToken.UNCANCELLABLE_TOKEN
        }

        const [combinedToken, cancelCombinedToken] = CancellationToken.sourceArray()
        const unregisterFunctions: (() => boolean)[] = []
        const cancelCombinedTokenAndUnregisterAllCallbacks = async (reason: any) => {
            await cancelCombinedToken(reason)
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
        const onCancel = async (reason: any) => {
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
                await cancelCombinedToken(reason)
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

    public onCancel(callback: ((reason?: any) => void) | ((reason?: any) => Promise<void>)) {
        if (!this.canBeCancelled) {
            return ALWAYS_FALSE
        }

        if (this.isCancellationRequested) {
            callback(this._cancellationError?.reason)
            return ALWAYS_FALSE
        }

        this._cancellationCallbacks.add(callback)
        return () => this._cancellationCallbacks.delete(callback)
    }
}
