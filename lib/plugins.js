import { readdirSync, existsSync, readFileSync, watch, statSync } from 'fs'
import { join, resolve } from 'path'
import { format } from 'util'
import syntaxerror from 'syntax-error'
import importFile from './import.js'
import Helper from './helper.js'

const __dirname = Helper.__dirname(import.meta)
const pluginFolder = Helper.__dirname(join(__dirname, '../plugins'))
const pluginFilter = filename => /\.(mc)?js$/.test(filename)

let watcher = {}
let plugins = {}
let pluginFolders = []

/* 🔍 BUSCAR ARCHIVOS RECURSIVO */
function getAllPluginFiles(dir) {
    let results = []
    for (const file of readdirSync(dir)) {
        const full = join(dir, file)
        if (statSync(full).isDirectory()) {
            results.push(...getAllPluginFiles(full))
        } else if (pluginFilter(file)) {
            results.push(full)
        }
    }
    return results
}

async function filesInit(folder = pluginFolder, _filter = pluginFilter, conn) {
    const resolved = resolve(folder)
    if (resolved in watcher) return

    pluginFolders.push(resolved)

    const files = getAllPluginFiles(resolved)

    await Promise.all(files.map(async file => {
        const name = file.replace(resolved + '/', '')
        try {
            const module = await import(global.__filename(file))
            plugins[name] = module.default || module
        } catch (e) {
            conn?.logger?.error(e)
            delete plugins[name]
        }
    }))

    const watching = watch(resolved, { recursive: true }, reload.bind(null, conn))
    watching.on('close', () => deletePluginFolder(resolved, true))
    watcher[resolved] = watching

    return plugins
}

function deletePluginFolder(folder, isAlreadyClosed = false) {
    const resolved = resolve(folder)
    if (!(resolved in watcher)) return
    if (!isAlreadyClosed) watcher[resolved].close()
    delete watcher[resolved]
    pluginFolders = pluginFolders.filter(v => v !== resolved)
}

async function reload(conn, _event, filename) {
    if (!filename || !pluginFilter(filename)) return

    const full = join(pluginFolder, filename)
    if (!existsSync(full)) {
        delete plugins[filename]
        conn?.logger?.warn(`deleted plugin - '${filename}'`)
        return
    }

    let err = syntaxerror(readFileSync(full), filename, {
        sourceType: 'module',
        allowAwaitOutsideFunction: true
    })

    if (err) {
        conn?.logger?.error(`syntax error in '${filename}'\n${format(err)}`)
        return
    }

    try {
        const module = await importFile(global.__filename(full))
        plugins[filename] = module.default || module
        conn?.logger?.info(`updated plugin - '${filename}'`)
    } catch (e) {
        conn?.logger?.error(`error loading plugin '${filename}'\n${format(e)}`)
    }

    plugins = Object.fromEntries(
        Object.entries(plugins).sort(([a], [b]) => a.localeCompare(b))
    )
}

export {
    pluginFolder,
    pluginFilter,
    plugins,
    watcher,
    pluginFolders,
    filesInit,
    deletePluginFolder,
    reload
}