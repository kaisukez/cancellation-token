export default class CancellationError {
    constructor(
        public readonly reason?: any,
    ) {}

    public static async ignoreAsync<T>(promise: Promise<T>) {
        try {
            return await promise
        } catch (error) {
            if (error instanceof CancellationError) {
                return
            }
            
            throw error
        }
    }

    public static ignoreSync(func: Function) {
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