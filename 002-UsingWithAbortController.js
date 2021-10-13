async function main() {
    const { default: fetch, AbortError } = await import('node-fetch')
    const { AbortController } = require('node-abort-controller')

    const { CancelToken, CancelError, Task } = require('./index')
    
    async function fetchData(token, signal) {
        while (true) {
            console.log('step 1')
            let result = await fetch('http://www.google.com', { signal })

            console.log('step 2')
            await Task.sleep(Math.floor(Math.random() * 100))
            token.throwIfCanceled()

            console.log('step 3')
            let html = await result.text({ signal })
            if (Math.floor(Math.random() * 5) === 0) {
                return html.slice(0, 20)
            }

            console.log('step 4')
            await Task.sleep(Math.floor(Math.random() * 100))
            token.throwIfCanceled()

            console.log('-------------------')
        }
    }

    const controller = new AbortController()
    const { token, cancel } = CancelToken.source()

    const cancelAll = () => {
        controller.abort()
        cancel()
    }
    setTimeout(cancelAll, 1000)


    try {
        const html = await fetchData(token, controller.signal)
        console.log('html', html)
    } catch (error) {
        if (error instanceof CancelError) {
            console.log('task got canceled')
            return
        }

        if (error instanceof AbortError) {
            console.log('task got aborted')
            return
        }
        
        throw error
    }
}

main()