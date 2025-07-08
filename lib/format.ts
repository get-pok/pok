export function formatBytes(bytes: number, decimals = 0) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export function formatNumber(number: number) {
    if (number < 1000) return number
    if (number < 1000000) return (number / 1000).toFixed(0) + ' K'
    return (number / 1000000).toFixed(0) + ' M'
}
