export default class Task {
    public static async sleep (ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}