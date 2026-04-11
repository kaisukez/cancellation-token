import CancellationToken from './CancellationToken'
import CancellationError from './CancellationError'
import { AsyncCheckpoint, SyncCheckpoint } from './Checkpoint'

describe('SyncCheckpoint', () => {
    describe('SyncCheckpoint.before', () => {
        it('should throw CancellationError before func when cancelled', () => {
            const { token, cancel } = CancellationToken.source()
            cancel()
            expect(() => SyncCheckpoint.before(token, () => {})).toThrow(CancellationError)
        })

        it('should not throw when not cancelled', () => {
            const { token } = CancellationToken.source()
            expect(() => SyncCheckpoint.before(token, () => {})).not.toThrow()
        })

        it('should return the function result', () => {
            const { token } = CancellationToken.source()
            const value = Symbol()
            expect(SyncCheckpoint.before(token, () => value)).toBe(value)
        })
    })

    describe('SyncCheckpoint.after', () => {
        it('should throw CancellationError after func when cancelled during func', () => {
            const { token, cancel } = CancellationToken.source()
            expect(() => SyncCheckpoint.after(token, () => cancel())).toThrow(CancellationError)
        })

        it('should not throw when not cancelled', () => {
            const { token } = CancellationToken.source()
            expect(() => SyncCheckpoint.after(token, () => {})).not.toThrow()
        })

        it('should return the function result', () => {
            const { token } = CancellationToken.source()
            const value = Symbol()
            expect(SyncCheckpoint.after(token, () => value)).toBe(value)
        })
    })

    describe('SyncCheckpoint.beforeAfter', () => {
        it('should throw CancellationError before func when already cancelled', () => {
            const { token, cancel } = CancellationToken.source()
            cancel()
            expect(() => SyncCheckpoint.beforeAfter(token, () => {})).toThrow(CancellationError)
        })

        it('should throw CancellationError after func when cancelled during func', () => {
            const { token, cancel } = CancellationToken.source()
            expect(() => SyncCheckpoint.beforeAfter(token, () => cancel())).toThrow(CancellationError)
        })

        it('should not throw when not cancelled', () => {
            const { token } = CancellationToken.source()
            expect(() => SyncCheckpoint.beforeAfter(token, () => {})).not.toThrow()
        })

        it('should return the function result', () => {
            const { token } = CancellationToken.source()
            const value = Symbol()
            expect(SyncCheckpoint.beforeAfter(token, () => value)).toBe(value)
        })
    })
})

describe('AsyncCheckpoint', () => {
    describe('AsyncCheckpoint.before', () => {
        it('should throw CancellationError before func when cancelled', async () => {
            const { token, cancel } = CancellationToken.source()
            await cancel()
            await expect(AsyncCheckpoint.before(token, () => Promise.resolve())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should not throw when not cancelled', async () => {
            const { token } = CancellationToken.source()
            await expect(AsyncCheckpoint.before(token, () => Promise.resolve())).resolves.toBeUndefined()
        })

        it('should return the function result', async () => {
            const { token } = CancellationToken.source()
            const value = Symbol()
            await expect(AsyncCheckpoint.before(token, () => Promise.resolve(value))).resolves.toBe(value)
        })
    })

    describe('AsyncCheckpoint.after', () => {
        it('should throw CancellationError after func when cancelled during func', async () => {
            const { token, cancel } = CancellationToken.source()
            await expect(AsyncCheckpoint.after(token, () => cancel())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should not throw when not cancelled', async () => {
            const { token } = CancellationToken.source()
            await expect(AsyncCheckpoint.after(token, () => Promise.resolve())).resolves.toBeUndefined()
        })

        it('should return the function result', async () => {
            const { token } = CancellationToken.source()
            const value = Symbol()
            await expect(AsyncCheckpoint.after(token, () => Promise.resolve(value))).resolves.toBe(value)
        })
    })

    describe('AsyncCheckpoint.beforeAfter', () => {
        it('should throw CancellationError before func when already cancelled', async () => {
            const { token, cancel } = CancellationToken.source()
            await cancel()
            await expect(AsyncCheckpoint.beforeAfter(token, () => Promise.resolve())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should throw CancellationError after func when cancelled during func', async () => {
            const { token, cancel } = CancellationToken.source()
            await expect(AsyncCheckpoint.beforeAfter(token, () => cancel())).rejects.toBeInstanceOf(CancellationError)
        })

        it('should not throw when not cancelled', async () => {
            const { token } = CancellationToken.source()
            await expect(AsyncCheckpoint.beforeAfter(token, () => Promise.resolve())).resolves.toBeUndefined()
        })

        it('should return the function result', async () => {
            const { token } = CancellationToken.source()
            const value = Symbol()
            await expect(AsyncCheckpoint.beforeAfter(token, () => Promise.resolve(value))).resolves.toBe(value)
        })
    })
})
