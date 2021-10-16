import { CancellationToken, CancellationError, Task } from '../src'

async function task(token: CancellationToken, id: number) {
    let i = 0
    while (true) {
        console.log(`id=${id} do task i=${i++}`)
        await Task.sleep(500)

        if (token.isCancellationRequested) {
            console.log(`id=${id} do cleanup before throwing CancelError`)
            token.throwIfCancellationRequested()
        }
    }
}

async function main() {
    const token1 = new CancellationToken(cancel => {
        const timeout = Math.floor(Math.random() * 10000)
        console.log(`token1 timeout = ${timeout}`)
        setTimeout(() => {
            console.log('token1 is canceled')
            cancel()
        }, timeout)
    })
    const token2 = new CancellationToken(cancel => {
        const timeout = Math.floor(Math.random() * 10000)
        console.log(`token2 timeout = ${timeout}`)
        setTimeout(() => {
            console.log('token2 is canceled')
            cancel()
        }, timeout)
    })

    // use CancellationError.ignore so that you don't have to catch CancellationError
    await Promise.all([
        CancellationError.ignore(task(token1, 1)),
        CancellationError.ignore(task(token2, 2)),
        CancellationError.ignore(task(CancellationToken.race([token1, token2]), 3)),
        CancellationError.ignore(task(CancellationToken.all([token1, token2]), 4)),
    ])
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()