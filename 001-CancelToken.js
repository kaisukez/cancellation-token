const { CancelToken, CancelError } = require('./index')

async function sleep(ms) {
    await new Promise(resolve => setTimeout(resolve, ms))
}

async function task(token) {
    let i = 0
    while (true) {
        console.log(`do task i=${i++}`)
        await sleep(500)

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
    
    // const [token, cancel] = CancelToken.create()
    // setTimeout(() => cancel(), 3000)

    try {
        await task(token)
    } catch (error) {
        if (error !== CancelError) {
            throw error
        }

        console.log('task got canceled')
    }
}

main()