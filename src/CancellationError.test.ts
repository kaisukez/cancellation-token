import CancellationToken from './CancellationToken'
import CancellationError from './CancellationError'

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

describe('CancellationError', () => {
    it('should be an instance of Error', () => {
        const error = new CancellationError()
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(CancellationError)
    })

    it('should have name CancellationError', () => {
        expect(new CancellationError().name).toBe('CancellationError')
    })

    it('should store reason', () => {
        const reason = Symbol()
        expect(new CancellationError(reason).reason).toBe(reason)
    })

    it('should have undefined reason when not provided', () => {
        expect(new CancellationError().reason).toBeUndefined()
    })
})

describe('CancellationError.ignoreAsync', () => {
    it('should re-throw non-CancellationErrors', async () => {
        const error = new Error('error')
        await expect(CancellationError.ignoreAsync(async () => { throw error })).rejects.toBe(error)
    })

    it('should resolve with undefined when CancellationError is thrown', async () => {
        const token = new CancellationToken(cancel => {
            setTimeout(() => cancel(), 5)
        })

        async function task() {
            await sleep(10)
            token.throwIfCancellationRequested()
        }

        await expect(CancellationError.ignoreAsync(() => task())).resolves.toBeUndefined()
    })

    it('should propagate the resolved value when no error', async () => {
        await expect(CancellationError.ignoreAsync(async () => 42)).resolves.toBe(42)
    })
})

describe('CancellationError.ignoreSync', () => {
    it('should re-throw non-CancellationErrors', () => {
        const error = new Error('error')
        expect(() => CancellationError.ignoreSync(() => { throw error })).toThrow(error)
    })

    it('should return undefined when CancellationError is thrown', () => {
        const token = new CancellationToken(async cancel => { await cancel() })
        expect(() => token.throwIfCancellationRequested()).toThrow(CancellationError)
        expect(CancellationError.ignoreSync(() => token.throwIfCancellationRequested())).toBeUndefined()
    })

    it('should propagate the return value when no error', () => {
        expect(CancellationError.ignoreSync(() => 42)).toBe(42)
    })
})
