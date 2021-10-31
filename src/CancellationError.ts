export default class CancellationError {
    constructor(
        public readonly reason?: any,
    ) {}

    public static async ignoreAsync<T>(promise: () => Promise<T>): Promise<T|undefined> {
        try {
            return await promise()
        } catch (error) {
            if (error instanceof CancellationError) {
                return
            }
            
            throw error
        }
    }

    public static ignoreSync<T>(func: () => T): T|undefined {
        try {
            return func()
        } catch (error) {
            if (error instanceof CancellationError) {
                return
            }
            
            throw error
        }
    }
}