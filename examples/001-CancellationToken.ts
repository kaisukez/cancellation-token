import {
    CancellationToken,
    CancellationError,
    Task,
} from '../src'

async function task(token: CancellationToken) {
    let i = 0
    while (true) {
        console.log(`do task i=${i++}`)
        await Task.sleep(500)

        if (token.isCancellationRequested) {
            console.log('do cleanup before throwing CancelError')
            token.throwIfCancellationRequested()
        }
    }
}

async function main() {
    const token = new CancellationToken(cancel => {
        setTimeout(async () => await cancel(), 3000)
    })
    
    // other variations of instantiating token object
    // const { token, cancel } = CancellationToken.source()
    // const [token, cancel] = CancellationToken.sourceArray()

    try {
        await task(token)
    } catch (error) {
        if (error instanceof CancellationError) {
            console.log('task got canceled')
        } else {
            throw error
        }
    }
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()