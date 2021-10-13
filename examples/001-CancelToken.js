const { CancelToken, CancelError, Task } = require('../src')

async function task(token) {
    let i = 0
    while (true) {
        console.log(`do task i=${i++}`)
        await Task.sleep(500)

        if (token.isCanceled) {
            console.log('do cleanup before throwing CancelError')
            token.throwIfCanceled()
        }
    }
}

async function main() {
    const token = new CancelToken(cancel => {
        setTimeout(() => cancel(), 3000)
    })
    
    // const { token, cancel } = CancelToken.source()
    // setTimeout(() => cancel(), 3000)

    try {
        await task(token)
    } catch (error) {
        if (error instanceof CancelError) {
            console.log('task got canceled')
            return
        }
        
        throw error
    }
}

main()