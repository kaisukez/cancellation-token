import 'jest'
import CancellationToken from '../src/CancellationToken'
import CancellationError from '../src/CancellationError'

const createUnregisterationTest = (token: CancellationToken) => {
    const test = {
        isOnCancelCalled: false,
        unregister: () => {},
    }
    test.unregister = token.onCancel(() => {
        test.isOnCancelCalled = true
    })
    return test
}

const createUnregisterationTests = (token: CancellationToken, numberOfCallbacks: number) => {
    const tests: { isOnCancelCalled: boolean, unregister: () => void }[] = []
    for (let i = 0; i < numberOfCallbacks; i++) {
        tests.push(createUnregisterationTest(token))
    }
    return tests
}

describe('token created by user', () => {
    let sources: { token: CancellationToken, cancel: (reason?: any) => void }[] = []

    // it should have the same behavior regardless of how you instantiate token
    beforeEach(() => {
        let cancel1: (reason?: any) => void = () => {}
        const token1 = new CancellationToken(c => cancel1 = c)
        const { token: token2, cancel: cancel2 } = CancellationToken.source()
        const [token3, cancel3] = CancellationToken.sourceArray()
        
        sources = [
            {
                token: token1,
                cancel: cancel1,
            },
            {
                token: token2,
                cancel: cancel2,
            },
            {
                token: token3,
                cancel: cancel3,
            },
        ]
    })


    describe('after you create a new token', () => {
        it('should be cancellable', () => {
            for (const { token } of sources) {
                expect(token.canBeCancelled).toBe(true)
            }
        })
    
        it('should not be cancelled yet', () => {
            for (const { token } of sources) {
                expect(token.isCancellationRequested).toBe(false)
            }
        })
    
        it('should not throw an error', () => {
            for (const { token } of sources) {
                expect(() => {
                    token.throwIfCancellationRequested()
                }).not.toThrow()
            }
        })
    })


    describe('after you run cancel function', () => {
        it('should be cancelled', async () => {
            for (const { token, cancel } of sources) {
                expect(token.isCancellationRequested).toBe(false)
                await cancel()
                expect(token.isCancellationRequested).toBe(true)
            }
        })

        it('should throw a CancellationError with correct reason', async () => {
            for (const { token, cancel } of sources) {
                expect(() => {
                    token.throwIfCancellationRequested()
                }).not.toThrow()

                const uniqueReason = Symbol()
                await cancel(uniqueReason)
                
                expect(() => {
                    token.throwIfCancellationRequested()
                }).toThrow(CancellationError)

                expect(() => {
                    try {
                        token.throwIfCancellationRequested()
                    } catch (error) {
                        if (error instanceof CancellationError) {
                            expect(error.reason).toBe(uniqueReason)
                        }
                        throw error
                    }
                }).toThrow(CancellationError)
            }
        })
    })


    describe('test onCancel', () => {
        it('should trigger an onCancel function once after you call cancel function', async () => {
            for (const { token, cancel } of sources) {
                let count = 0
                token.onCancel(() => {
                    count++
                })
                expect(count).toBe(0)
                await cancel()
                expect(count).toBe(1)

                // onCancel should be run once so the value of count should not be changed from now on
                await cancel()
                expect(count).toBe(1)
                await cancel()
                expect(count).toBe(1)
            }
        })

        it('should trigger all onCancel functions once after you call cancel function', async () => {
            for (const { token, cancel } of sources) {
                let count = 0
                for (let i = 0; i < 10; i++) {
                    token.onCancel(() => {
                        count++
                    })
                }
                expect(count).toBe(0)
                await cancel()
                expect(count).toBe(10)

                // onCancel should be run once so the value of count should not be changed from now on
                await cancel()
                expect(count).toBe(10)
                await cancel()
                expect(count).toBe(10)
            }
        })
    })


    describe('test unregister function', () => {
        it('should not run onCancel function after you unregister it', async () => {
            for (const { token, cancel } of sources) {
                let count = 0
                const unregister = token.onCancel(() => {
                    count++
                })
                expect(count).toBe(0)
                unregister()
                expect(count).toBe(0)
                await cancel()
                expect(count).toBe(0)
            }
        })
    })


    describe('test unregister function when you have multiple onCancel functions', () => {
        it('should not call any onCancel function if you does not cancel your token yet', () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)
                for (const test of tests) {
                    expect(test.isOnCancelCalled).toBe(false)
                }
            }
        })
        
        it('should unregister first onCancel function', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[0].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(true)
            }
        })

        it('should unregister second onCancel function', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[1].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            }
        })

        it('should unregister third onCancel function', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[2].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(false)
            }
        })

        it('should unregister first and second onCancel function', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[0].unregister()
                tests[1].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            }
        })

        it('should unregister first and third onCancel function', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[0].unregister()
                tests[2].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(false)
            }
        })

        it('should unregister second and third onCancel function', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[1].unregister()
                tests[2].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            }
        })

        it('should unregister all onCancel functions', async () => {
            for (const { token, cancel } of sources) {
                const tests = createUnregisterationTests(token, 3)

                tests[0].unregister()
                tests[1].unregister()
                tests[2].unregister()
                await cancel()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            }
        })
    })
})

describe('constant token', () => {
    describe('UncancellableToken', () => {
        it('should not be cancellable', () => {
            const token = CancellationToken.UNCANCELLABLE_TOKEN
            expect(token.canBeCancelled).toBe(false)
        })

        it('should not be cancelled at the beginning', () => {
            const token = CancellationToken.UNCANCELLABLE_TOKEN
            expect(token.isCancellationRequested).toBe(false)
        })

        it('should not throw an error at the beginning', () => {
            const token = CancellationToken.UNCANCELLABLE_TOKEN
            expect(() => {
                token.throwIfCancellationRequested()
            }).not.toThrow()
        })
    })

    describe('AlreadyCancelledToken', () => {
        it('should be cancellable', () => {
            const token = CancellationToken.ALREADY_CANCELLED_TOKEN
            expect(token.canBeCancelled).toBe(true)
        })

        it('should be cancelled at the beginning', () => {
            const token = CancellationToken.ALREADY_CANCELLED_TOKEN
            expect(token.isCancellationRequested).toBe(true)
        })

        it('should throw an error at the beginning', () => {
            const token = CancellationToken.ALREADY_CANCELLED_TOKEN
            expect(() => {
                token.throwIfCancellationRequested()
            }).toThrow(CancellationError)
        })
    })
})

describe('combining multiple tokens', () => {
    const createCancellableTokens = (quantity: number) => {
        const sources: { token: CancellationToken, cancel?: (reason?: any) => void }[] = []
        for (let i = 0; i < quantity; i++) {
            sources.push(CancellationToken.source())
        }
        return sources
    }

    const createUncancellableTokens = (quantity: number) => {
        const sources: { token: CancellationToken, cancel?: (reason?: any) => void }[] = []
        for (let i = 0; i < quantity; i++) {
            sources.push({ token: CancellationToken.UNCANCELLABLE_TOKEN })
        }
        return sources
    }

    const createAlreadyCancelledTokens = (quantity: number) => {
        const sources: { token: CancellationToken, cancel?: (reason?: any) => void }[] = []
        for (let i = 0; i < quantity; i++) {
            sources.push({ token: CancellationToken.ALREADY_CANCELLED_TOKEN })
        }
        return sources
    }

    describe('CancellationToken.race', () => {
        describe('after you create a new token by combining existing tokens', () => {
            describe('canBeCancelled', () => {
                it('should be cancellable if all tokens are cancellable', () => {
                    const combinedToken = CancellationToken.race(createCancellableTokens(3).map(source => source.token))
                    expect(combinedToken.canBeCancelled).toBe(true)
                })
        
                it('should be cancellable if some (but not all) tokens are cancellable', () => {
                    const combinedToken = CancellationToken.race([
                        ...createCancellableTokens(2).map(source => source.token),
                        ...createUncancellableTokens(1).map(source => source.token),
                    ])
                    expect(combinedToken.canBeCancelled).toBe(true)
                })
    
                it('should not be cancellable if all tokens are not cancellable', () => {
                    const combinedToken = CancellationToken.race([
                        ...createUncancellableTokens(3).map(source => source.token),
                    ])
                    expect(combinedToken.canBeCancelled).toBe(false)
                })
            })

            describe('isCancellationRequested', () => {
                it('should not be cancelled if all tokens are not cancelled', () => {
                    const combinedToken = CancellationToken.race(createCancellableTokens(3).map(source => source.token))
                    expect(combinedToken.isCancellationRequested).toBe(false)
                })
    
                it('should be cancelled if some (but not all) tokens are cancelled', () => {
                    const combinedToken = CancellationToken.race([
                        ...createCancellableTokens(2).map(source => source.token),
                        ...createAlreadyCancelledTokens(1).map(source => source.token),
                    ])
                    expect(combinedToken.isCancellationRequested).toBe(true)
                })
    
                it('should be cancelled if all tokens are cancelled', () => {
                    const combinedToken = CancellationToken.race([
                        ...createAlreadyCancelledTokens(3).map(source => source.token),
                    ])
                    expect(combinedToken.isCancellationRequested).toBe(true)
                })
            })

            describe('throwIfCancellationRequested', () => {
                it('should not throw a CancellationError if all tokens are not cancelled', () => {
                    const combinedToken = CancellationToken.race(createCancellableTokens(3).map(source => source.token))
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                })
    
                it('should throw a CancellationError if some (but not all) tokens are cancelled', () => {
                    const combinedToken = CancellationToken.race([
                        ...createCancellableTokens(2).map(source => source.token),
                        ...createAlreadyCancelledTokens(1).map(source => source.token),
                    ])
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).toThrow(CancellationError)
                })
    
                it('should throw a CancellationError if all tokens are cancelled', () => {
                    const combinedToken = CancellationToken.race([
                        ...createAlreadyCancelledTokens(3).map(source => source.token),
                    ])
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).toThrow(CancellationError)
                })
            })
        })

        describe('after you run cancel function', () => {
            describe('isCancellationRequested', () => {
                it('should be cancelled if some (but not all) tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.race(sources.map(source => source.token))
                    expect(combinedToken.isCancellationRequested).toBe(false)
                    await sources[1]?.cancel?.()
                    expect(combinedToken.isCancellationRequested).toBe(true)
                })
    
                it('should be cancelled if all tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.race(sources.map(source => source.token))
                    expect(combinedToken.isCancellationRequested).toBe(false)
                    for (const source of sources) {
                        await source?.cancel?.()
                    }
                    expect(combinedToken.isCancellationRequested).toBe(true)
                })
            })

            describe('throwIfCancellationRequested', () => {
                it('should throw a CancellationError if some (but not all) tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.race(sources.map(source => source.token))
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                    await sources[1]?.cancel?.()
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).toThrow(CancellationError)
                })
    
                it('should throw a CancellationError if all tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.race(sources.map(source => source.token))
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                    for (const source of sources) {
                        await source?.cancel?.()
                    }
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).toThrow(CancellationError)
                })
            })
        })

        describe('test onCancel', () => {
            it('should trigger all onCancel functions once after some (but not all) tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                let count = 0
                for (let i = 0; i < 10; i++) {
                    combinedToken.onCancel(() => {
                        count++
                    })
                }
                expect(count).toBe(0)
                await sources[1]?.cancel?.()
                expect(count).toBe(10)

                // onCancel should be run once so the value of count should not be changed from now on
                await sources[1]?.cancel?.()
                expect(count).toBe(10)
                await sources[1]?.cancel?.()
                expect(count).toBe(10)
            })

            it('should trigger all onCancel functions once after all tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                let count = 0
                for (let i = 0; i < 10; i++) {
                    combinedToken.onCancel(() => {
                        count++
                    })
                }
                expect(count).toBe(0)
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(count).toBe(10)

                // onCancel should be run once so the value of count should not be changed from now on
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(count).toBe(10)
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(count).toBe(10)
            })
        })

        describe('test unregister function', () => {
            it('should not run onCancel function after you unregister it', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                let count = 0
                const unregister = combinedToken.onCancel(() => {
                    count++
                })
                expect(count).toBe(0)
                unregister()
                expect(count).toBe(0)
                await sources[1]?.cancel?.()
                expect(count).toBe(0)
            })
        })

        describe('test unregister function when you have multiple onCancel functions', () => {
            it('should not call any onCancel function if you does not cancel your token yet', () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)
                for (const test of tests) {
                    expect(test.isOnCancelCalled).toBe(false)
                }
            })
            
            it('should unregister first onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })
    
            it('should unregister second onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[1].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })
    
            it('should unregister third onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[2].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
    
            it('should unregister first and second onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                tests[1].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })
    
            it('should unregister first and third onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                tests[2].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
    
            it('should unregister second and third onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[1].unregister()
                tests[2].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
    
            it('should unregister all onCancel functions', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.race(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                tests[1].unregister()
                tests[2].unregister()
                await sources[1]?.cancel?.()
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
        })
    })

    describe('CancellationToken.all', () => {
        describe('after you create a new token by combining existing tokens', () => {
            describe('canBeCancelled', () => {
                it('should be cancellable if all tokens are cancellable', () => {
                    const combinedToken = CancellationToken.all(createCancellableTokens(3).map(source => source.token))
                    expect(combinedToken.canBeCancelled).toBe(true)
                })
        
                it('should not be cancellable if some (but not all) tokens are not cancellable', () => {
                    const combinedToken = CancellationToken.all([
                        ...createCancellableTokens(2).map(source => source.token),
                        ...createUncancellableTokens(1).map(source => source.token),
                    ])
                    expect(combinedToken.canBeCancelled).toBe(false)
                })
    
                it('should not be cancellable if all tokens are not cancellable', () => {
                    const combinedToken = CancellationToken.all([
                        ...createUncancellableTokens(3).map(source => source.token),
                    ])
                    expect(combinedToken.canBeCancelled).toBe(false)
                })
            })

            describe('isCancellationRequested', () => {
                it('should not be cancelled if all tokens are not cancelled', () => {
                    const combinedToken = CancellationToken.all(createCancellableTokens(3).map(source => source.token))
                    expect(combinedToken.isCancellationRequested).toBe(false)
                })
    
                it('should not be cancelled if some (but not all) tokens are cancelled', () => {
                    const combinedToken = CancellationToken.all([
                        ...createCancellableTokens(2).map(source => source.token),
                        ...createAlreadyCancelledTokens(1).map(source => source.token),
                    ])
                    expect(combinedToken.isCancellationRequested).toBe(false)
                })
    
                it('should be cancelled if all tokens are cancelled', () => {
                    const combinedToken = CancellationToken.all([
                        ...createAlreadyCancelledTokens(3).map(source => source.token),
                    ])
                    expect(combinedToken.isCancellationRequested).toBe(true)
                })
            })

            describe('throwIfCancellationRequested', () => {
                it('should not throw a CancellationError if all tokens are not cancelled', () => {
                    const combinedToken = CancellationToken.all(createCancellableTokens(3).map(source => source.token))
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                })
    
                it('should not throw a CancellationError if some (but not all) tokens are cancelled', () => {
                    const combinedToken = CancellationToken.all([
                        ...createCancellableTokens(2).map(source => source.token),
                        ...createAlreadyCancelledTokens(1).map(source => source.token),
                    ])
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                })
    
                it('should throw a CancellationError if all tokens are cancelled', () => {
                    const combinedToken = CancellationToken.all([
                        ...createAlreadyCancelledTokens(3).map(source => source.token),
                    ])
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).toThrow(CancellationError)
                })
            })
        })

        describe('after you run cancel function', () => {
            describe('isCancellationRequested', () => {
                it('should not be cancelled if some (but not all) tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.all(sources.map(source => source.token))
                    expect(combinedToken.isCancellationRequested).toBe(false)
                    await sources[1]?.cancel?.()
                    expect(combinedToken.isCancellationRequested).toBe(false)
                })
    
                it('should be cancelled if all tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.all(sources.map(source => source.token))
                    expect(combinedToken.isCancellationRequested).toBe(false)
                    for (const source of sources) {
                        await source?.cancel?.()
                    }
                    expect(combinedToken.isCancellationRequested).toBe(true)
                })
            })

            describe('throwIfCancellationRequested', () => {
                it('should throw a CancellationError if some (but not all) tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.all(sources.map(source => source.token))
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                    await sources[1]?.cancel?.()
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).not.toThrow()
                })
    
                it('should throw a CancellationError if all tokens are cancelled', async () => {
                    const sources = createCancellableTokens(3)
                    const combinedToken = CancellationToken.all(sources.map(source => source.token))
                    for (const source of sources) {
                        expect(() => {
                            combinedToken.throwIfCancellationRequested()
                        }).not.toThrow()
                        await source?.cancel?.()
                    }
                    expect(() => {
                        combinedToken.throwIfCancellationRequested()
                    }).toThrow(CancellationError)
                })
            })
        })

        describe('test onCancel', () => {
            it('should not trigger any onCancel function after some (but not all) tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                let count = 0
                for (let i = 0; i < 10; i++) {
                    combinedToken.onCancel(() => {
                        count++
                    })
                }
                expect(count).toBe(0)
                await sources[1]?.cancel?.()
                expect(count).toBe(0)
            })

            it('should trigger all onCancel functions once after all tokens are cancelled', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                let count = 0
                for (let i = 0; i < 10; i++) {
                    combinedToken.onCancel(() => {
                        count++
                    })
                }
                for (const { cancel } of sources) {
                    expect(count).toBe(0)
                    await cancel?.()
                }
                expect(count).toBe(10)

                // onCancel should be run once so the value of count should not be changed from now on
                for (const { cancel } of sources) {
                    expect(count).toBe(10)
                    await cancel?.()
                }
                expect(count).toBe(10)
                for (const { cancel } of sources) {
                    expect(count).toBe(10)
                    await cancel?.()
                }
                expect(count).toBe(10)
            })
        })

        describe('test unregister function', () => {
            it('should not run onCancel function after you unregister it', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                let count = 0
                const unregister = combinedToken.onCancel(() => {
                    count++
                })
                expect(count).toBe(0)
                unregister()
                expect(count).toBe(0)
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(count).toBe(0)
            })
        })

        describe('test unregister function when you have multiple onCancel functions', () => {
            it('should not call any onCancel function if you does not cancel your token yet', () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)
                for (const test of tests) {
                    expect(test.isOnCancelCalled).toBe(false)
                }
            })
            
            it('should unregister first onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })
    
            it('should unregister second onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[1].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })
    
            it('should unregister third onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[2].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
    
            it('should unregister first and second onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                tests[1].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(true)
            })
    
            it('should unregister first and third onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                tests[2].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(true)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
    
            it('should unregister second and third onCancel function', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[1].unregister()
                tests[2].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(true)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
    
            it('should unregister all onCancel functions', async () => {
                const sources = createCancellableTokens(3)
                const combinedToken = CancellationToken.all(sources.map(source => source.token))
                const tests = createUnregisterationTests(combinedToken, 3)

                tests[0].unregister()
                tests[1].unregister()
                tests[2].unregister()
                for (const { cancel } of sources) {
                    await cancel?.()
                }
                expect(tests[0].isOnCancelCalled).toBe(false)
                expect(tests[1].isOnCancelCalled).toBe(false)
                expect(tests[2].isOnCancelCalled).toBe(false)
            })
        })
    })
})