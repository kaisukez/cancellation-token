import fetch from 'node-fetch'
import { AbortController, AbortSignal } from 'node-abort-controller'
import {
    CancellationToken,
    CancellationError,
    Task,
} from '../src'

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
    setTimeout(() => cancel(), Math.floor(Math.random() * 400))

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