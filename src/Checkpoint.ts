import CancellationToken from './CancellationToken'

export class SyncCheckpoint {
    public static before<T>(token: CancellationToken, func: Function) {
        token.throwIfCancellationRequested()
        return func()
    }

    public static after<T>(token: CancellationToken, func: Function) {
        const result = func()
        token.throwIfCancellationRequested()
        return result
    }

    public static beforeAfter<T>(token: CancellationToken, func: Function) {
        token.throwIfCancellationRequested()
        const result = func()
        token.throwIfCancellationRequested()
        return result
    }
}

export class AsyncCheckpoint {
    public static async before<T>(token: CancellationToken, promise: Promise<T>) {
        token.throwIfCancellationRequested()
        return await promise
    }
    
    public static async after<T>(token: CancellationToken, promise: Promise<T>) {
        const result = await promise
        token.throwIfCancellationRequested()
        return result
    }
    
    public static async beforeAfter<T>(token: CancellationToken, promise: Promise<T>) {
        token.throwIfCancellationRequested()
        const result = await promise
        token.throwIfCancellationRequested()
        return result
    }
}