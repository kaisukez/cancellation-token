import CancellationToken from './CancellationToken'

export class SyncCheckpoint {
    public static before<T>(token: CancellationToken, func: () => T): T {
        token.throwIfCancellationRequested()
        return func()
    }

    public static after<T>(token: CancellationToken, func: () => T): T {
        const result = func()
        token.throwIfCancellationRequested()
        return result
    }

    public static beforeAfter<T>(token: CancellationToken, func: () => T): T {
        token.throwIfCancellationRequested()
        const result = func()
        token.throwIfCancellationRequested()
        return result
    }
}

export class AsyncCheckpoint {
    public static async before<T>(token: CancellationToken, func: () => Promise<T>): Promise<T> {
        token.throwIfCancellationRequested()
        return await func()
    }
    
    public static async after<T>(token: CancellationToken, func: () => Promise<T>): Promise<T> {
        const result = await func
        token.throwIfCancellationRequested()
        return result()
    }
    
    public static async beforeAfter<T>(token: CancellationToken, func: () => Promise<T>): Promise<T> {
        token.throwIfCancellationRequested()
        const result = await func
        token.throwIfCancellationRequested()
        return result()
    }
}