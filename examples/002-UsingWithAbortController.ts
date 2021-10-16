import fetch from 'node-fetch'
import { AbortController, AbortSignal } from 'node-abort-controller'
import { CancellationToken, CancellationError, Task } from '../src'

async function fetchData(token: CancellationToken, signal: AbortSignal) {
    while (true) {
        console.log('step 1')
        let result = await fetch('http://www.google.com', { signal })

        console.log('step 2')
        await Task.sleep(Math.floor(Math.random() * 100))
        token.throwIfCancellationRequested()

        console.log('step 3')
        let html = await result.text()
        if (Math.floor(Math.random() * 5) === 0) {
            return html.slice(0, 20)
        }

        console.log('step 4')
        await Task.sleep(Math.floor(Math.random() * 100))
        token.throwIfCancellationRequested()

        console.log('-------------------')
    }
}

async function main() {
    const controller = new AbortController()
    const { token, cancel } = CancellationToken.source()

    const unregister = token.onCancel(() => {
        console.log('onCancel -> controller.abort()')
        controller.abort()
    })
    setTimeout(() => cancel(), 1000)

    try {
        const html = await fetchData(token, controller.signal)
        console.log('html', html)
    } catch (error: any) {
        if (error instanceof CancellationError) {
            console.log('task got canceled')
        } else if (error?.constructor?.name === 'AbortError') {
            console.log('task got aborted')
        } else {
            throw error
        }
    } finally {
        unregister()
    }
}

;(async () => {
    try {
        await main()
    } catch (error) {
        console.error(error)
    }
})()