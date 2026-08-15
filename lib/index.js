// B站浮窗插件 — Host 端
// 固化模式：webServer HTTP 路由（bundle 环境不依赖动态插件的 harness/host.call）
import { randomUUID } from 'node:crypto'

// 声明所需服务：让 Loader 在本插件挂载前先激活 subprocess 与 webServer，
// 否则 ctx 里拿不到这两个服务，apply() 会静默早退、路由不注册。
// 与 dsh-web-ui 全家桶插件（aionui-panel / ssh 等）的宿主半边同一模式。
export const inject = ['subprocess', 'webServer']

function apply(ctx) {
  const sub = ctx.subprocess
  const webServer = ctx.webServer
  if (sub === undefined || webServer === undefined) return

  let buv = randomUUID()
  const picCache = new Map()
  // fetch 结果缓存：同 URL 2 分钟内不重复 curl，切换分类秒回
  const fetchCache = new Map()

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
    const argv = ['curl.exe', '-s', '--max-time', '20',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      '-H', 'Referer: http://www.bilibili.com/',
      '-H', 'Cookie: buvid3=' + buv,
      url]
    try {
      const h = sub.spawn({ argv, cwd: 'C:\\', stdio: { stdin: 'ignore', stdout: { maxBytes: 8388608 }, stderr: { maxBytes: 1048576 } }, graceMs: 3000 })
      await h.done
      const out = h.collected.stdout.readFrom(0)
      return out ? out.text : ''
    } catch (e) {
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
      } catch (e) {}
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

  // GET /api/bili2/fetch?kind=hot&pn=1 | rank&rid=0 | search&keyword=..&page=1
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
        else return sendJson(res, 400, { error: 'bad kind' })
        const obj = await fetchJson(api)
        if (!obj || !obj.data) return sendJson(res, 502, { error: 'bilibili api failed' })
        const raw = kind === 'search' ? (obj.data.result || []) : (obj.data.list || [])
        sendJson(res, 200, { list: raw.map(norm) })
      } catch (e) {
        sendJson(res, 500, { error: String(e && e.message || e) })
      }
    },
  })

  // GET /api/bili2/pic?url=...
  webServer.register({
    kind: 'bili2-pic',
    path: '/api/bili2/pic',
    handler: async (req, res) => {
      try {
        const q = new URL(req.url, 'http://localhost').searchParams
        const pic = q.get('url')
        if (!pic) return sendJson(res, 400, { error: 'no url' })
        if (picCache.has(pic)) return sendJson(res, 200, { data: picCache.get(pic) })
        const cmd = "& { [Net.ServicePointManager]::SecurityProtocol=Tls12; $c=(New-Object System.Net.WebClient).DownloadData('" + pic + "'); [Convert]::ToBase64String($c) }"
        const h = sub.spawn({ argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', cmd], cwd: 'C:\\', stdio: { stdin: 'ignore', stdout: { maxBytes: 20971520 }, stderr: { maxBytes: 1048576 } }, graceMs: 15000 })
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
}

export { apply }
