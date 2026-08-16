// B站浮窗插件 — Host 端
// 固化模式：webServer HTTP 路由（bundle 环境不依赖动态插件的 harness/host.call）
import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

// 持久化数据目录：~/.dsh/bili-data/
const DATA_DIR = 'C:\\Users\\anlan0725\\.dsh\\bili-data'
const FOLLOWS_FILE = DATA_DIR + '\\follows.json'
const HISTORY_FILE = DATA_DIR + '\\history.json'

function ensureDir() {
  try { if (!existsSync(DATA_DIR)) writeFileSync(DATA_DIR + '\\.keep', '') } catch (e) {}
}
function loadJson(path, fb) {
  try { if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8')) } catch (e) {}
  return fb
}
function saveJson(path, data) {
  try { ensureDir(); writeFileSync(path, JSON.stringify(data), 'utf8') } catch (e) { console.error('[bili] saveJson error:', e.message) }
}

// 加载持久化数据
let follows = loadJson(FOLLOWS_FILE, {})  // { mid: { name, face, latest_bvid } }
let watchHistory = loadJson(HISTORY_FILE, [])  // [{ bvid, aid, title, pic, author, at }]

// 声明所需服务：让 Loader 在本插件挂载前先激活 subprocess 与 webServer
export const inject = ['subprocess', 'webServer']

function apply(ctx) {
  const sub = ctx.subprocess
  const webServer = ctx.webServer
  if (sub === undefined || webServer === undefined) return

  let buv = ''
  const picCache = new Map()
  const cookieJar = 'C:\\Users\\anlan0725\\.dsh\\tmp-bili-cookies.txt'
  const fetchCache = new Map()

  let cookieReady = false
  let cookiePromise = null
  async function refreshBuvid() {
    try {
      const h = sub.spawn({ argv: ['curl.exe', '-s', '--noproxy', '*', '--max-time', '10', '-c', cookieJar, '-b', cookieJar, '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'https://www.bilibili.com'], cwd: 'C:\\', stdio: { stdin: 'ignore', stdout: { maxBytes: 1024 }, stderr: { maxBytes: 4096 } }, graceMs: 5000 })
      await h.done
      const fs = await import('node:fs')
      if (fs.existsSync(cookieJar)) {
        const text = fs.readFileSync(cookieJar, 'utf8')
        const m = text.match(/\.bilibili\.com.*buvid3\s+([^\s]+)/)
        if (m) { buv = m[1]; console.log('[bili] buvid3:', buv.slice(0, 8) + '...') }
      }
    } catch (e) { console.error('[bili] refreshBuvid error:', e && e.message || e) }
    cookieReady = true
  }
  cookiePromise = refreshBuvid()

  function norm(v) {
    return {
      bvid: v.bvid || '',
      aid: v.aid || 0,
      title: String(v.title || '').replace(/<[^>]+>/g, ''),
      pic: v.pic || '',
      duration: v.duration != null ? v.duration : 0,
      author: (v.owner && v.owner.name) || v.author || '',
      play: (v.stat && v.stat.view != null) ? v.stat.view : (v.play || 0),
      danmaku: (v.stat && v.stat.danmaku != null) ? v.stat.danmaku : (v.video_review || 0),
      pubdate: v.pubdate != null ? v.pubdate : 0,
    }
  }

  async function subFetch(url) {
    if (!cookieReady && cookiePromise) await cookiePromise
    const argv = ['curl.exe', '-s', '--noproxy', '*', '--max-time', '20',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      '-H', 'Referer: https://search.bilibili.com/all',
      '-H', 'Origin: https://www.bilibili.com/',
      '-H', 'Accept: application/json, text/plain, */*',
      '-H', 'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
      '-b', cookieJar,
      url.replace(/^http:\/\//, 'https://')]
    try {
      const h = sub.spawn({ argv, cwd: 'C:\\', stdio: { stdin: 'ignore', stdout: { maxBytes: 8388608 }, stderr: { maxBytes: 1048576 } }, graceMs: 3000 })
      await h.done
      const out = h.collected.stdout.readFrom(0)
      const text = out ? out.text : ''
      if (!text) console.error('[bili] subFetch empty:', url, 'exit:', h.exitCode, 'signal:', h.signal)
      return text
    } catch (e) {
      console.error('[bili] subFetch error:', e && e.message || e)
      return ''
    }
  }

  async function fetchJson(url) {
    const now = Date.now()
    const hit = fetchCache.get(url)
    if (hit && (now - hit.ts) < 120000) return hit.data
    for (let i = 0; i < 2; i++) {
      const text = await subFetch(url)
      try {
        const obj = JSON.parse(text)
        if (obj && obj.code === 0) {
          fetchCache.set(url, { ts: Date.now(), data: obj })
          if (fetchCache.size > 60) fetchCache.delete(fetchCache.keys().next().value)
          return obj
        }
      } catch (e) {
        console.error('[bili] fetchJson error:', e && e.message || e)
      }
      buv = randomUUID()
    }
    return null
  }

  function readBody(req) {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => resolve(body))
      req.on('error', () => resolve(''))
    })
  }

  function sendJson(res, status, data) {
    const text = JSON.stringify(data)
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    res.end(text)
  }

  // ===== 原有 API =====
  webServer.register({
    kind: 'bili2-fetch',
    path: '/api/bili2/fetch',
    handler: async (req, res) => {
      try {
        const q = new URL(req.url, 'http://localhost').searchParams
        const kind = q.get('kind')
        let api = ''
        if (kind === 'hot') api = 'http://api.bilibili.com/x/web-interface/popular?ps=20&pn=' + (q.get('pn') || 1)
        else if (kind === 'rank') api = 'http://api.bilibili.com/x/web-interface/ranking/v2?rid=' + (q.get('rid') || 0) + '&type=all'
        else if (kind === 'search') api = 'http://api.bilibili.com/x/web-interface/search/type?search_type=' + encodeURIComponent(q.get('search_type') || 'video') + '&page=' + (q.get('page') || 1) + '&keyword=' + encodeURIComponent(q.get('keyword') || '')
        else if (kind === 'follow-videos') api = 'http://api.bilibili.com/x/space/article?mid=' + encodeURIComponent(q.get('mid') || '') + '&ps=20&pn=' + (q.get('pn') || 1)
        else if (kind === 'upper-videos') api = 'http://api.bilibili.com/x/space/arc/search?mid=' + encodeURIComponent(q.get('mid') || '') + '&ps=20&pn=' + (q.get('pn') || 1) + '&tid=0&order=pubdate'
        else return sendJson(res, 400, { error: 'bad kind' })
        const obj = await fetchJson(api)
        if (!obj || !obj.data) return sendJson(res, 502, { error: 'bilibili api failed' })
        const raw = kind === 'search' ? (obj.data.result || []) : (kind === 'follow-videos' ? (obj.data.articles || []) : (obj.data.list || []))
        sendJson(res, 200, { list: raw.map(norm) })
      } catch (e) {
        sendJson(res, 500, { error: String(e && e.message || e) })
      }
    },
  })

  webServer.register({
    kind: 'bili2-pic',
    path: '/api/bili2/pic',
    handler: async (req, res) => {
      try {
        const q = new URL(req.url, 'http://localhost').searchParams
        const pic = q.get('url')
        if (!pic) return sendJson(res, 400, { error: 'no url' })
        if (!/^https?:\/\/[^'"]+\.(jpg|jpeg|png|gif|webp)/i.test(pic)) return sendJson(res, 400, { error: 'invalid url' })
        if (picCache.has(pic)) return sendJson(res, 200, { data: picCache.get(pic) })
        const cmd = "param($u); [Net.ServicePointManager]::SecurityProtocol=Tls12; $c=(New-Object System.Net.WebClient).DownloadData($u); [Convert]::ToBase64String($c)"
        const h = sub.spawn({ argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', cmd, pic], cwd: 'C:\\', stdio: { stdin: 'ignore', stdout: { maxBytes: 20971520 }, stderr: { maxBytes: 1048576 } }, graceMs: 15000 })
        await h.done
        const out = h.collected.stdout.readFrom(0)
        const b64 = out ? out.text.trim() : ''
        if (!b64) return sendJson(res, 502, { error: 'pic download failed' })
        const data = 'data:image/jpeg;base64,' + b64
        picCache.set(pic, data)
        sendJson(res, 200, { data })
      } catch (e) {
        sendJson(res, 500, { error: String(e && e.message || e) })
      }
    },
  })

  // ===== 关注列表持久化 API =====
  // GET /api/bili2/follows — 获取关注列表
  webServer.register({
    kind: 'bili2-follows',
    path: '/api/bili2/follows',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        return sendJson(res, 200, { follows: Object.values(follows) })
      }
      if (req.method === 'POST') {
        const body = await readBody(req)
        try {
          const item = JSON.parse(body)
          if (!item || !item.mid || !item.name) return sendJson(res, 400, { error: 'missing mid or name' })
          follows[item.mid] = { mid: item.mid, name: item.name, face: item.face || '', latest_bvid: item.latest_bvid || '' }
          saveJson(FOLLOWS_FILE, follows)
          return sendJson(res, 200, { ok: true })
        } catch (e) {
          return sendJson(res, 400, { error: 'bad json' })
        }
      }
      if (req.method === 'DELETE') {
        const q = new URL(req.url, 'http://localhost').searchParams
        const mid = q.get('mid')
        if (!mid || !follows[mid]) return sendJson(res, 404, { error: 'not found' })
        delete follows[mid]
        saveJson(FOLLOWS_FILE, follows)
        return sendJson(res, 200, { ok: true })
      }
      sendJson(res, 405, { error: 'method not allowed' })
    },
  })

  // GET /api/bili2/history — 获取持久化观看历史
  webServer.register({
    kind: 'bili2-history',
    path: '/api/bili2/history',
    handler: async (req, res) => {
      if (req.method === 'POST') {
        const body = await readBody(req)
        try {
          const item = JSON.parse(body)
          if (!item || !item.bvid) return sendJson(res, 400, { error: 'missing bvid' })
          const entry = {
            bvid: item.bvid || '',
            aid: item.aid || 0,
            title: item.title || '',
            pic: item.pic || '',
            author: item.author || '',
            at: Date.now(),
          }
          watchHistory = watchHistory.filter(function (h) { return h.bvid !== entry.bvid })
          watchHistory.unshift(entry)
          if (watchHistory.length > 200) watchHistory = watchHistory.slice(0, 200)
          saveJson(HISTORY_FILE, watchHistory)
          return sendJson(res, 200, { ok: true })
        } catch (e) {
          return sendJson(res, 400, { error: 'bad json' })
        }
      }
      return sendJson(res, 200, { history: watchHistory })
    },
  })
}

export { apply }
