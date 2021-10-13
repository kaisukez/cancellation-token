const { CancelToken, CancelError, Task } = require('../src/index')

async function task(token, id) {
    let i = 0
    while (true) {
        console.log(`id=${id} do task i=${i++}`)
        await Task.sleep(500)

        if (token.isCanceled) {
            console.log(`id=${id} do cleanup before throwing CancelError`)
            token.throwIfCanceled()
        }
    }
}

async function main() {
    const token1 = new CancelToken(cancel => {
        const timeout = Math.floor(Math.random() * 10000)
        console.log(`token1 timeout = ${timeout}`)
        setTimeout(() => {
            console.log('token1 is canceled')
            cancel()
        }, timeout)
    })
    const token2 = new CancelToken(cancel => {
        const timeout = Math.floor(Math.random() * 10000)
        console.log(`token2 timeout = ${timeout}`)
        setTimeout(() => {
            console.log('token2 is canceled')
            cancel()
        }, timeout)
    })

    Task.ignoreCancelError(task(token1, 1))
    Task.ignoreCancelError(task(token2, 2))
    Task.ignoreCancelError(task(CancelToken.race([token1, token2]), 3))
    Task.ignoreCancelError(task(CancelToken.all([token1, token2]), 4))
}

main()