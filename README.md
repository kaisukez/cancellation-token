# @kaisukez/cancellation-token

## Installation
```
npm i @kaisukez/cancellation-token
```

## What is this library
This library's idea is based on this proposal [tc39/proposal-cancelable-promises](https://github.com/tc39/proposal-cancelable-promises) which is actually great proposal but it was withdrawn for some reason.

I copied some code from https://github.com/conradreuter/cancellationtoken which is the implementation of the withdrawn proposal.

I also added some useful features that [conradreuter/cancellationtoken](https://github.com/conradreuter/cancellationtoken) doesn't have such as [Revealing Constructor Pattern](https://github.com/tc39/proposal-cancelable-promises/blob/0e769fda8e16bff0feffe964fddc43dcd86668ba/Cancel%20Tokens.md#for-the-creator), `CancellationError.ignore` and `Checkpoint.before`.


## Examples
### 1. Basic usage
```ts
import {
    CancellationToken,
    CancellationError,
    Task,
} from '@kaisukez/cancellation-token'

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
        setTimeout(() => cancel(), 3000)
    })
    
    // other variations of instantiation
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
```

```
do task i=0
do task i=1
do task i=2
do task i=3
do task i=4
do task i=5
do cleanup before throwing CancelError
task got canceled
```

### 2. Using with AbortController
```ts
import fetch from 'node-fetch'
import { AbortController, AbortSignal } from 'node-abort-controller'
import {
    CancellationToken,
    CancellationError,
    Task,
} from '@kaisukez/cancellation-token'

async function fetchData(token: CancellationToken, signal: AbortSignal) {
    const result = await fetch('http://www.google.com', { signal })

    // do something in between
    await Task.sleep(100)
    token.throwIfCancellationRequested()

    const html = await result.text()
    return html.slice(0, 20)
}

async function main() {
    const controller = new AbortController()
    const { token, cancel } = CancellationToken.source()

    const unregister = token.onCancel(() => {
        console.log('onCancel -> controller.abort()')
        controller.abort()
    })
    setTimeout(() => cancel(), 400)

    try {
        const html = await fetchData(token, controller.signal)
        console.log('html', html)
    } catch (error: any) {
        if (error instanceof CancellationError) {
            console.log('task got canceled')
        } else if (error?.constructor?.name === 'AbortError') {
            // or you can use (error instanceof AbortError)
            console.log('task got aborted')
        } else {
            throw error
        }
    } finally {
        unregister()
        cancel()
    }
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()
```

abort case
```
onCancel -> controller.abort()
task got aborted
```

cancel case
```
onCancel -> controller.abort()
task got canceled
```

success case
```
html <!doctype html><html
```

### 3. Combining token
```ts
import {
    CancellationToken,
    CancellationError,
    Task,
} from '@kaisukez/cancellation-token'

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
        setTimeout(() => {
            console.log('token1 is canceled')
            cancel()
        }, timeout)
    })
    const token2 = new CancellationToken(cancel => {
        const timeout = 300
        console.log(`token2 timeout = ${timeout}`)
        setTimeout(() => {
            console.log('token2 is canceled')
            cancel()
        }, timeout)
    })

    // use CancellationError.ignore
    // so that you don't have to try-catch CancellationError
    const result = await Promise.all([
        CancellationError.ignore(task(token1, 1)),
        CancellationError.ignore(task(token2, 2)),
        CancellationError.ignore(task(CancellationToken.race([token1, token2]), 3)),
        CancellationError.ignore(task(CancellationToken.all([token1, token2]), 4)),
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
```

```
token1 timeout = 100
token2 timeout = 300
id=1 do task i=0
id=2 do task i=0
id=3 do task i=0
id=4 do task i=0
id=1 do task i=1
id=2 do task i=1
id=3 do task i=1
id=4 do task i=1
token1 is canceled
id=1 do cleanup before throwing CancelError
id=2 do task i=2
id=3 do cleanup before throwing CancelError
id=4 do task i=2
id=2 do task i=3
id=4 do task i=3
id=2 do task i=4
id=4 do task i=4
id=2 do task i=5
id=4 do task i=5
token2 is canceled
id=2 do cleanup before throwing CancelError
id=4 do cleanup before throwing CancelError
result [ undefined, undefined, undefined, undefined ]
```

### 4. Checkpoint
```ts
import {
    CancellationToken,
    CancellationError,
    Checkpoint,
    Task,
} from '@kaisukez/cancellation-token'

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

    await CancellationError.ignore(task(token))
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()
```

```
longRunningTask 1
longRunningTask 2
longRunningTask 3
```

### Todo
- write test
- maybe seperate AsyncCancellationToken and SyncCancellationToken (await cancel(), onCancel(async () => {}))
- maybe seperate AsyncCheckpoint SyncCheckpoint