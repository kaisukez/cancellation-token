import {
    CancellationToken,
    CancellationError,
    Task,
} from '../src'

async function task(token: CancellationToken, id: number) {
    let i = 0
    while (true) {
        console.log(`id=${id} do task i=${i++}`)
        await Task.sleep(50)

        if (token.isCancellationRequested) {
            console.log(`id=${id} do cleanup before throwing CancelError`)
            token.throwIfCancellationRequested()
        }
    }
}

async function main() {
    const token1 = new CancellationToken(cancel => {
        const timeout = 100
        console.log(`token1 timeout = ${timeout}`)
        setTimeout(async () => {
            console.log('token1 is canceled')
            await cancel()
        }, timeout)
    })
    const token2 = new CancellationToken(cancel => {
        const timeout = 300
        console.log(`token2 timeout = ${timeout}`)
        setTimeout(async () => {
            console.log('token2 is canceled')
            await cancel()
        }, timeout)
    })

    // use CancellationError.ignoreAsync
    // so that you don't have to try-catch CancellationError
    const result = await Promise.all([
        CancellationError.ignoreAsync(task(token1, 1)),
        CancellationError.ignoreAsync(task(token2, 2)),
        CancellationError.ignoreAsync(task(CancellationToken.race([token1, token2]), 3)),
        CancellationError.ignoreAsync(task(CancellationToken.all([token1, token2]), 4)),
    ])
    console.log('result', result)
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()