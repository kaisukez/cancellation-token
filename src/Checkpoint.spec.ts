import 'jest'
import CancellationToken from './CancellationToken'
import CancellationError from './CancellationError'
import { AsyncCheckpoint, SyncCheckpoint } from './Checkpoint'

describe('SyncCheckpoint', () => {
    describe('SyncCheckpoint.before', () => {
        it('should throw a CancellationError', () => {
            const { token, cancel } = CancellationToken.source()
            expect(() => SyncCheckpoint.before(token, () => {})).not.toThrow()
            cancel()
            expect(() => SyncCheckpoint.before(token, () => {})).toThrow(CancellationError)
        })

        it('should return correct value', () => {
            const token = new CancellationToken(() => {})
            const value = Symbol()
            expect(SyncCheckpoint.before(token, () => value)).toBe(value)
        })
    })

    describe('SyncCheckpoint.after', () => {
        it('should throw a CancellationError', () => {
            const { token, cancel } = CancellationToken.source()
            expect(() => SyncCheckpoint.after(token, () => cancel())).toThrow(CancellationError)
        })

        it('should return correct value', () => {
            const token = new CancellationToken(() => {})
            const value = Symbol()
            expect(SyncCheckpoint.after(token, () => value)).toBe(value)
        })
    })

    describe('SyncCheckpoint.beforeAfter', () => {
        it('should throw a CancellationError', () => {
            // test before
            const [token1, cancel1] = CancellationToken.sourceArray()
            expect(() => SyncCheckpoint.before(token1, () => cancel1())).not.toThrow()
            expect(() => SyncCheckpoint.before(token1, () => {})).toThrow(CancellationError)
    
            // test after
            const [token2, cancel2] = CancellationToken.sourceArray()
            expect(() => SyncCheckpoint.after(token2, () => cancel2())).toThrow(CancellationError)
        })

        it('should return correct value', () => {
            const token = new CancellationToken(() => {})
            const value = Symbol()
            expect(SyncCheckpoint.beforeAfter(token, () => value)).toBe(value)
        })
    })
})

describe('AsyncCheckpoint', () => {
    describe('AsyncCheckpoint.before', () => {
        it('should throw a CancellationError', async () => {
            const { token, cancel } = CancellationToken.source()
            await expect(AsyncCheckpoint.before(token, () => Promise.resolve())).resolves.toBeUndefined()
            await cancel()
            await expect(AsyncCheckpoint.before(token, () => Promise.resolve())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should return correct value', async () => {
            const token = new CancellationToken(() => {})
            const value = Symbol()
            await expect(AsyncCheckpoint.before(token, () => Promise.resolve(value))).resolves.toBe(value)
        })
    })

    describe('AsyncCheckpoint.after', () => {
        it('should throw a CancellationError', async () => {
            const { token, cancel } = CancellationToken.source()
            await expect(AsyncCheckpoint.after(token, () => cancel())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should return correct value', async () => {
            const token = new CancellationToken(() => {})
            const value = Symbol()
            await expect(AsyncCheckpoint.after(token, () => Promise.resolve(value))).resolves.toBe(value)
        })
    })

    describe('AsyncCheckpoint.beforeAfter', () => {
        it('should throw a CancellationError', async () => {
            // test before
            const [token1, cancel1] = CancellationToken.sourceArray()
            await expect(AsyncCheckpoint.before(token1, () => Promise.resolve())).resolves.toBeUndefined()
            await cancel1()
            await expect(AsyncCheckpoint.before(token1, () => Promise.resolve())).rejects.toBeInstanceOf(CancellationError)
    
            // test after
            const [token2, cancel2] = CancellationToken.sourceArray()
            await expect(AsyncCheckpoint.after(token2, () => cancel2())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should return correct value', async () => {
            const token = new CancellationToken(() => {})
            const value = Symbol()
            await expect(AsyncCheckpoint.beforeAfter(token, () => Promise.resolve(value))).resolves.toBe(value)
        })
    })
})