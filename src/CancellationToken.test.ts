import CancellationToken from './CancellationToken'
import CancellationError from './CancellationError'

type Source = { token: CancellationToken, cancel: (reason?: any) => Promise<void> }

const sourceFactories: [string, () => Source][] = [
    ['new CancellationToken(executor)', () => {
        let cancel!: (reason?: any) => Promise<void>
        const token = new CancellationToken(c => { cancel = c })
        return { token, cancel }
    }],
    ['CancellationToken.source()', () => CancellationToken.source()],
    ['CancellationToken.sourceArray()', () => {
        const [token, cancel] = CancellationToken.sourceArray()
        return { token, cancel }
    }],
]

const createUnregistrationTest = (token: CancellationToken) => {
    const test = {
        isOnCancelCalled: false,
        unregister: () => {},
    }
    test.unregister = token.onCancel(() => {
        test.isOnCancelCalled = true
    })
    return test
}

const createUnregistrationTests = (token: CancellationToken, numberOfCallbacks: number) => {
    return Array.from({ length: numberOfCallbacks }, () => createUnregistrationTest(token))
}

describe.each(sourceFactories)('token created by %s', (_, createSource) => {
    let token: CancellationToken
    let cancel: (reason?: any) => Promise<void>

    beforeEach(() => {
        ({ token, cancel } = createSource())
    })

    describe('after you create a new token', () => {
        it('should be cancellable', () => {
            expect(token.canBeCancelled).toBe(true)
        })

        it('should not be cancelled yet', () => {
            expect(token.isCancellationRequested).toBe(false)
        })

        it('should not throw', () => {
            expect(() => token.throwIfCancellationRequested()).not.toThrow()
        })
    })

    describe('after you run cancel function', () => {
        it('should be cancelled', async () => {
            await cancel()
            expect(token.isCancellationRequested).toBe(true)
        })

        it('should throw CancellationError with correct reason', async () => {
            const reason = Symbol()
            await cancel(reason)
            expect(() => token.throwIfCancellationRequested()).toThrow(CancellationError)
            try {
                token.throwIfCancellationRequested()
            } catch (error) {
                expect(error).toBeInstanceOf(CancellationError)
                expect((error as CancellationError).reason).toBe(reason)
            }
        })

        it('should be idempotent — callbacks fire exactly once across multiple cancel calls', async () => {
            let count = 0
            token.onCancel(() => { count++ })
            await cancel()
            await cancel()
            await cancel()
            expect(count).toBe(1)
        })
    })

    describe('onCancel', () => {
        it('should trigger callback once after cancel', async () => {
            let count = 0
            token.onCancel(() => { count++ })
            await cancel()
            await cancel()
            expect(count).toBe(1)
        })

        it('should trigger all callbacks after cancel', async () => {
            let count = 0
            for (let i = 0; i < 10; i++) {
                token.onCancel(() => { count++ })
            }
            await cancel()
            expect(count).toBe(10)
            await cancel()
            expect(count).toBe(10)
        })

        it('should fire immediately when registered on an already-cancelled token', async () => {
            await cancel()
            let called = false
            token.onCancel(() => { called = true })
            expect(called).toBe(true)
        })
    })

    describe('unregister', () => {
        it('should not run callback after unregister', async () => {
            let count = 0
            const unregister = token.onCancel(() => { count++ })
            unregister()
            await cancel()
            expect(count).toBe(0)
        })
    })

    describe('unregister with multiple callbacks', () => {
        it('should not call any callback before cancel', () => {
            const tests = createUnregistrationTests(token, 3)
            for (const test of tests) {
                expect(test.isOnCancelCalled).toBe(false)
            }
        })

        it('should unregister first callback', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[0].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(false)
            expect(tests[1].isOnCancelCalled).toBe(true)
            expect(tests[2].isOnCancelCalled).toBe(true)
        })

        it('should unregister second callback', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[1].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(true)
            expect(tests[1].isOnCancelCalled).toBe(false)
            expect(tests[2].isOnCancelCalled).toBe(true)
        })

        it('should unregister third callback', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[2].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(true)
            expect(tests[1].isOnCancelCalled).toBe(true)
            expect(tests[2].isOnCancelCalled).toBe(false)
        })

        it('should unregister first and second callbacks', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[0].unregister()
            tests[1].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(false)
            expect(tests[1].isOnCancelCalled).toBe(false)
            expect(tests[2].isOnCancelCalled).toBe(true)
        })

        it('should unregister first and third callbacks', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[0].unregister()
            tests[2].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(false)
            expect(tests[1].isOnCancelCalled).toBe(true)
            expect(tests[2].isOnCancelCalled).toBe(false)
        })

        it('should unregister second and third callbacks', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[1].unregister()
            tests[2].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(true)
            expect(tests[1].isOnCancelCalled).toBe(false)
            expect(tests[2].isOnCancelCalled).toBe(false)
        })

        it('should unregister all callbacks', async () => {
            const tests = createUnregistrationTests(token, 3)
            tests[0].unregister()
            tests[1].unregister()
            tests[2].unregister()
            await cancel()
            expect(tests[0].isOnCancelCalled).toBe(false)
            expect(tests[1].isOnCancelCalled).toBe(false)
            expect(tests[2].isOnCancelCalled).toBe(false)
        })
    })
})

describe('constant token', () => {
    describe('UNCANCELLABLE_TOKEN', () => {
        it('should not be cancellable', () => {
            expect(CancellationToken.UNCANCELLABLE_TOKEN.canBeCancelled).toBe(false)
        })

        it('should not be cancelled', () => {
            expect(CancellationToken.UNCANCELLABLE_TOKEN.isCancellationRequested).toBe(false)
        })

        it('should not throw', () => {
            expect(() => CancellationToken.UNCANCELLABLE_TOKEN.throwIfCancellationRequested()).not.toThrow()
        })

        it('onCancel should not register callback', async () => {
            let called = false
            CancellationToken.UNCANCELLABLE_TOKEN.onCancel(() => { called = true })
            expect(called).toBe(false)
        })
    })

    describe('ALREADY_CANCELLED_TOKEN', () => {
        it('should be cancellable', () => {
            expect(CancellationToken.ALREADY_CANCELLED_TOKEN.canBeCancelled).toBe(true)
        })

        it('should be cancelled', () => {
            expect(CancellationToken.ALREADY_CANCELLED_TOKEN.isCancellationRequested).toBe(true)
        })

        it('should throw CancellationError', () => {
            expect(() => CancellationToken.ALREADY_CANCELLED_TOKEN.throwIfCancellationRequested()).toThrow(CancellationError)
        })

        it('onCancel should fire immediately', () => {
            let called = false
            CancellationToken.ALREADY_CANCELLED_TOKEN.onCancel(() => { called = true })
            expect(called).toBe(true)
        })
    })
})

describe('combining multiple tokens', () => {
    const createCancellableTokens = (quantity: number) =>
        Array.from({ length: quantity }, () => CancellationToken.source())

    const createUncancellableTokens = (quantity: number) =>
        Array.from({ length: quantity }, () => ({ token: CancellationToken.UNCANCELLABLE_TOKEN }))

    const createAlreadyCancelledTokens = (quantity: number) =>
        Array.from({ length: quantity }, () => ({ token: CancellationToken.ALREADY_CANCELLED_TOKEN }))

    describe('CancellationToken.race', () => {
        describe('initial state', () => {
            it('should be cancellable if all tokens are cancellable', () => {
                const combined = CancellationToken.race(createCancellableTokens(3).map(s => s.token))
                expect(combined.canBeCancelled).toBe(true)
            })

            it('should be cancellable if some tokens are cancellable', () => {
                const combined = CancellationToken.race([
                    ...createCancellableTokens(2).map(s => s.token),
                    ...createUncancellableTokens(1).map(s => s.token),
                ])
                expect(combined.canBeCancelled).toBe(true)
            })

            it('should not be cancellable if all tokens are uncancellable', () => {
                const combined = CancellationToken.race(createUncancellableTokens(3).map(s => s.token))
                expect(combined.canBeCancelled).toBe(false)
            })

            it('should not be cancelled if no tokens are cancelled', () => {
                const combined = CancellationToken.race(createCancellableTokens(3).map(s => s.token))
                expect(combined.isCancellationRequested).toBe(false)
            })

            it('should be cancelled immediately if any token is already cancelled', () => {
                const combined = CancellationToken.race([
                    ...createCancellableTokens(2).map(s => s.token),
                    ...createAlreadyCancelledTokens(1).map(s => s.token),
                ])
                expect(combined.isCancellationRequested).toBe(true)
            })

            it('should be cancelled immediately if all tokens are already cancelled', () => {
                const combined = CancellationToken.race(createAlreadyCancelledTokens(3).map(s => s.token))
                expect(combined.isCancellationRequested).toBe(true)
            })
        })

        describe('after cancel', () => {
            it('should be cancelled when any token is cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                expect(combined.isCancellationRequested).toBe(false)
                await sources[1].cancel()
                expect(combined.isCancellationRequested).toBe(true)
            })

            it('should throw CancellationError when any token is cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                await sources[1].cancel()
                expect(() => combined.throwIfCancellationRequested()).toThrow(CancellationError)
            })
        })

        describe('onCancel', () => {
            it('should trigger all callbacks when any token is cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                let count = 0
                for (let i = 0; i < 10; i++) combined.onCancel(() => { count++ })
                await sources[1].cancel()
                expect(count).toBe(10)
                await sources[1].cancel()
                expect(count).toBe(10)
            })

            it('should not run callback after unregister', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                let count = 0
                const unregister = combined.onCancel(() => { count++ })
                unregister()
                await sources[1].cancel()
                expect(count).toBe(0)
            })
        })

        describe('unregister with multiple callbacks', () => {
            it('should unregister first callback', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                const tests = createUnregistrationTests(combined, 3)
                tests[0].unregister()
                await sources[1].cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })

            it('should unregister second callback', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                const tests = createUnregistrationTests(combined, 3)
                tests[1].unregister()
                await sources[1].cancel()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })

            it('should unregister all callbacks', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.race(sources.map(s => s.token))
                const tests = createUnregistrationTests(combined, 3)
                tests[0].unregister()
                tests[1].unregister()
                tests[2].unregister()
                await sources[1].cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
        })
    })

    describe('CancellationToken.all', () => {
        describe('initial state', () => {
            it('should be cancellable if all tokens are cancellable', () => {
                const combined = CancellationToken.all(createCancellableTokens(3).map(s => s.token))
                expect(combined.canBeCancelled).toBe(true)
            })

            it('should not be cancellable if any token is uncancellable', () => {
                const combined = CancellationToken.all([
                    ...createCancellableTokens(2).map(s => s.token),
                    ...createUncancellableTokens(1).map(s => s.token),
                ])
                expect(combined.canBeCancelled).toBe(false)
            })

            it('should not be cancelled if no tokens are cancelled', () => {
                const combined = CancellationToken.all(createCancellableTokens(3).map(s => s.token))
                expect(combined.isCancellationRequested).toBe(false)
            })

            it('should not be cancelled if only some tokens are already cancelled', () => {
                const combined = CancellationToken.all([
                    ...createCancellableTokens(2).map(s => s.token),
                    ...createAlreadyCancelledTokens(1).map(s => s.token),
                ])
                expect(combined.isCancellationRequested).toBe(false)
            })

            it('should be cancelled immediately if all tokens are already cancelled', () => {
                const combined = CancellationToken.all(createAlreadyCancelledTokens(3).map(s => s.token))
                expect(combined.isCancellationRequested).toBe(true)
            })
        })

        describe('after cancel', () => {
            it('should not be cancelled when only some tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                await sources[1].cancel()
                expect(combined.isCancellationRequested).toBe(false)
                expect(() => combined.throwIfCancellationRequested()).not.toThrow()
            })

            it('should be cancelled only when all tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                for (const source of sources) {
                    expect(combined.isCancellationRequested).toBe(false)
                    await source.cancel()
                }
                expect(combined.isCancellationRequested).toBe(true)
                expect(() => combined.throwIfCancellationRequested()).toThrow(CancellationError)
            })
        })

        describe('onCancel', () => {
            it('should not trigger callbacks when only some tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                let count = 0
                for (let i = 0; i < 10; i++) combined.onCancel(() => { count++ })
                await sources[1].cancel()
                expect(count).toBe(0)
            })

            it('should trigger all callbacks once when all tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                let count = 0
                for (let i = 0; i < 10; i++) combined.onCancel(() => { count++ })
                for (const { cancel } of sources) {
                    expect(count).toBe(0)
                    await cancel()
                }
                expect(count).toBe(10)
                for (const { cancel } of sources) await cancel()
                expect(count).toBe(10)
            })

            it('should not run callback after unregister', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                let count = 0
                const unregister = combined.onCancel(() => { count++ })
                unregister()
                for (const { cancel } of sources) await cancel()
                expect(count).toBe(0)
            })
        })

        describe('unregister with multiple callbacks', () => {
            it('should unregister first callback', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                const tests = createUnregistrationTests(combined, 3)
                tests[0].unregister()
                for (const { cancel } of sources) await cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })

            it('should unregister second callback', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                const tests = createUnregistrationTests(combined, 3)
                tests[1].unregister()
                for (const { cancel } of sources) await cancel()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })

            it('should unregister all callbacks', async () => {
                const sources = createCancellableTokens(3)
                const combined = CancellationToken.all(sources.map(s => s.token))
                const tests = createUnregistrationTests(combined, 3)
                tests[0].unregister()
                tests[1].unregister()
                tests[2].unregister()
                for (const { cancel } of sources) await cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
        })
    })
})
