import { glob } from "glob"
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const args = process.argv

let mode = 'dev'
let switchTo = 'production'

if (typeof args[2] !== 'undefined' && args[2] === '--build') {
    mode = 'production'
    switchTo = 'dev'
}

const modeTitle = mode === 'dev' ? 'Development' : 'Production'

// Production rebuilds every chunk; sweep first so renamed/removed fp-* chunks don't linger in assets/
if (mode === 'production') {
    try {
        const staleChunks = await glob(['assets/fp-*.js', 'assets/fp-*.js.map'])
        for (const file of staleChunks) {
            await fs.promises.rm(file, { force: true })
        }
        console.log(`🧹 Cleared ${staleChunks.length} stale build chunk(s)`)
    } catch (err) {
        console.error('Chunk clean error:', err)
    }
}

const regexObj = new RegExp(`["']env["']\\s+=>\\s*["'](?:dev|production)["'],?`, 'g')

try {
    const files = await glob(['config/app.php'])

    for (const item of files) {
        const data = await fs.promises.readFile(item, 'utf8')
        const result = data.replace(regexObj, `'env'            => '${mode}',`)

        await fs.promises.writeFile(item, result, 'utf8')
        console.log(`✅ ${modeTitle} asset enqueued!`)
    }
} catch (err) {
    console.error('Error:', err)
}
