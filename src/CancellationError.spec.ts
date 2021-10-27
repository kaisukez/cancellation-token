import 'jest'
import CancellationToken from './CancellationToken'
import CancellationError from './CancellationError'

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

describe('async', () => {
    it('should throw an Error', async () => {
        const error = new Error('error')
        async function task() {
            await sleep(1)
            throw error
        }
        await expect(task()).rejects.toBe(error)
    })

    it('should throw an Error even if you use CancellationError.ignoreAsync', async () => {
        const error = new Error('error')
        async function task() {
            await sleep(1)
            throw error
        }
        await expect(CancellationError.ignoreAsync(task())).rejects.toBe(error)
    })
    
    it('should throw a CancellationError', async () => {
        const token = new CancellationToken(cancel => {
            setTimeout(async () => {
                await cancel()
            }, 5)
        })
    
        async function task(token: CancellationToken) {
            await sleep(10)
            expect(token.isCancellationRequested).toBe(true)
            token.throwIfCancellationRequested()
        }
    
        await expect(task(token)).rejects.toBeInstanceOf(CancellationError)
    })

    it('should not throw a CancellationError', async () => {
        const token = new CancellationToken(cancel => {
            setTimeout(async () => {
                await cancel()
            }, 5)
        })
    
        async function task(token: CancellationToken) {
            await sleep(10)
            expect(token.isCancellationRequested).toBe(true)
            token.throwIfCancellationRequested()
        }
    
        await expect(CancellationError.ignoreAsync(task(token))).resolves.toBe(undefined)
    })
})

describe('sync', () => {
    it('should throw an Error', () => {
        const error = new Error('error')
        function task() {
            throw error
        }
        expect(() => task()).toThrow(error)
    })

    it('should throw an Error even if you use CancellationError.ignoreSync', async () => {
        const error = new Error('error')
        function task() {
            throw error
        }
        expect(() => CancellationError.ignoreSync(() => task())).toThrow(error)
    })
    
    it('should throw a CancellationError', async () => {
        const token = new CancellationToken(async cancel => {
            await cancel()
        })
    
        async function task(token: CancellationToken) {
            expect(token.isCancellationRequested).toBe(true)
            token.throwIfCancellationRequested()
        }
    
        await expect(task(token)).rejects.toBeInstanceOf(CancellationError)
    })

    it('should not throw an error', async () => {
        const token = new CancellationToken(async cancel => {
            await cancel()
        })
        
        function task(token: CancellationToken) {
            expect(token.isCancellationRequested).toBe(true)
            token.throwIfCancellationRequested()
        }
    
        expect(() => CancellationError.ignoreSync(() => task(token))).not.toThrow()
    })
})