const { CancelToken, CancelError, Task } = require('../src')

async function longRunningTask(id) {
    console.log('longRunningTask', id)
    await Task.sleep(500)
}

async function task(token) {
    // #1
    await longRunningTask(1)
    token.throwIfCanceled()

    // #2 - is equivalent to #1 (longRunningTask is run before token.throwIfCanceled)
    await Task.checkpoint(token, longRunningTask(2))

    // #3
    token.throwIfCanceled()
    await longRunningTask(3)

    // #4 - is equivalent to #3 (longRunningTask is run after token.throwIfCanceled)
    await Task.checkpoint(token, () => longRunningTask(4))()

    // #5
    Task.checkpoint(token)

    // #6 - is equivalent to #5
    token.throwIfCanceled()
}

async function main() {
    const token = new CancelToken(cancel => {
        setTimeout(() => cancel(), 1234)
    })
    
    // const { token, cancel } = CancelToken.source()
    // setTimeout(() => cancel(), 1234)

    await Task.ignoreCancelError(task(token))
}

main()