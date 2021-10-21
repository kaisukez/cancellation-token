import {
    CancellationToken,
    CancellationError,
    Checkpoint,
    Task,
} from '../src'

async function longRunningTask(id: number) {
    console.log('longRunningTask', id)
    await Task.sleep(500)
}

function longRunningTaskSync(id: number) {
    console.log('longRunningTaskSync', id)
    // do long running task in sync
}

async function task(token: CancellationToken) {
    // #1
    token.throwIfCancellationRequested()
    await longRunningTask(1)

    // #2 - is equivalent to #1
    await Checkpoint.before(token, longRunningTask(2))

    // # 3
    await longRunningTask(3)
    token.throwIfCancellationRequested()

    // #4 - is equivalent to #3
    await Checkpoint.after(token, longRunningTask(4))

    // -------------------------------------------

    // #5
    token.throwIfCancellationRequested()
    longRunningTaskSync(5)
    token.throwIfCancellationRequested()

    // #6 - is equivalent to #5
    Checkpoint.beforeAfterSync(token, () => longRunningTaskSync(6))

    // -------------------------------------------

    // #7
    await Checkpoint.before(token, Promise.resolve())

    // #8
    Checkpoint.afterSync(token, () => {})

    // #9 - is equivalent to #7 and #8
    // but #9 is preferred
    token.throwIfCancellationRequested()
}

async function main() {
    const token = new CancellationToken(cancel => {
        setTimeout(() => cancel(), 1234)
    })
    
    // const { token, cancel } = CancellationToken.source()
    // setTimeout(() => cancel(), 1234)

    await CancellationError.ignore(task(token))
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()