window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-bili-widget",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		const LS_STATE = 'bili-widget-v2'
		const LS_HIST = 'bili-widget-hist-v1'
		const LS_PICS = 'bili-widget-pics-v1'
		const LS_KW = 'bili-widget-kw-v1'
		const SEARCH_TYPES = [['video', '视频'], ['bangumi', '番剧'], ['upper', 'UP主'], ['movie', '影视']]
		const REC_TOPICS = ['音乐', '游戏', '美食', '科技', '数码', '汽车', '舞蹈', '时尚', '生活', '影视', '鬼畜', '搞笑', '知识', '学习', '健身', '旅行', '萌宠', '动漫', '电竞', '手工', '摄影', '运动', '三农', '历史', '军事', '财经', '校园', '职场', '家居', '户外', '亲子', '情感', '星座', '乐器', '翻唱', '绘画', '设计', '编程', '人工智能', '软件', '电影解说', '纪录片', '体育', '桌游', '玩具']
		const AI_TOPICS = ['AI绘画', 'AI编程', 'ChatGPT', '机器学习', '大模型', 'AI音乐', 'AI视频', '数字人', 'AGI', '神经网络', '深度学习', 'AIGC']

		function loadLS(key, fb) {
			try { const v = localStorage.getItem(key); if (v) return JSON.parse(v) } catch (e) {}
			return fb
		}
		function saveLS(key, v) { try { localStorage.setItem(key, JSON.stringify(v)) } catch (e) {} }

		function parseDur(d) {
			if (d === undefined || d === null || d === '') return 0
			if (typeof d === 'number') return isFinite(d) ? d : 0
			const s = String(d).trim()
			if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s)
			const m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/)
			if (m) {
				const h = m[3] !== undefined ? parseInt(m[1], 10) : 0
				const mm = m[3] !== undefined ? parseInt(m[2], 10) : parseInt(m[1], 10)
				const ss = m[3] !== undefined ? parseInt(m[3], 10) : parseInt(m[2], 10)
				return h * 3600 + mm * 60 + ss
			}
			return 0
		}
		function fmtDur(d) {
			const secs = parseDur(d)
			if (!secs) return ''
			const h = Math.floor(secs / 3600), m = Math.floor(secs % 3600 / 60), s = Math.floor(secs % 60)
			if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
			return m + ':' + String(s).padStart(2, '0')
		}
		function fmtNum(n) {
			n = Number(n) || 0
			if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
			if (n >= 10000) return (n / 10000).toFixed(1) + '万'
			return String(n)
		}
		function fmtTime(ts) {
			if (!ts) return ''
			const sec = Number(ts)
			if (!sec) return ''
			const diff = Math.floor(Date.now() / 1000 - sec)
			if (diff < 60) return '刚刚'
			if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
			if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
			if (diff < 86400 * 30) return Math.floor(diff / 86400) + '天前'
			const d = new Date(sec * 1000)
			return (d.getMonth() + 1) + '月' + d.getDate() + '日'
		}
		function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, '') }
		function clampPos(s) {
			const w = s.w || 420, h = s.h || 640
			const vw = window.innerWidth || 1280, vh = window.innerHeight || 800
			let x = s.x, y = s.y
			if (typeof x !== 'number' || isNaN(x) || x < 8 || x > vw - 60) x = 16
			if (typeof y !== 'number' || isNaN(y) || y < 8 || y > vh - 60) y = 12
			return { x: Math.max(8, Math.min(x, vw - 60)), y: Math.max(8, Math.min(y, vh - 60)) }
		}
		function clampBub(bx, by) {
			const vw = window.innerWidth || 1280, vh = window.innerHeight || 800
			let x = bx, y = by
			if (typeof x !== 'number' || isNaN(x) || x < 4 || x > vw - 60) x = vw - 60
			if (typeof y !== 'number' || isNaN(y) || y < 4 || y > vh - 60) y = 76
			return { x: Math.max(4, Math.min(x, vw - 60)), y: Math.max(4, Math.min(y, vh - 60)) }
		}
		// 拖动窗口时钳制位置：窗口至少保留 56px 在视口内，避免被拖出后无法再抓住
		function clampDrag(x, y, w, h) {
			const vw = window.innerWidth || 1280, vh = window.innerHeight || 800
			const grab = 56 // 标题栏可抓住的最小可见区域
			const minX = grab - w, maxX = vw - grab
			const minY = 0, maxY = vh - grab
			return { x: Math.max(minX, Math.min(x, maxX)), y: Math.max(minY, Math.min(y, maxY)) }
		}

		// 封面 base64 缓存 (localStorage)
		const picsRef = { current: loadLS(LS_PICS, {}) }

		function injectCss(css) {
			const tagId = '@dsh-external/dsh-bili-widget/bili.module.css'
			if (document.querySelector("style[data-plugin-css=\"" + tagId + "\"]") !== null) return
			const tag = document.createElement('style')
			tag.dataset.plugin = '@dsh-external/dsh-bili-widget'
			tag.dataset.pluginCss = tagId
			tag.textContent = css
			document.head.appendChild(tag)
		}

		const css = `
[data-shell-overlay]{z-index:2147483000!important}
.dy-root{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:2147483000;font-family:-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;-webkit-font-smoothing:antialiased}
.dy-launch{position:fixed;top:0;left:0;transform:translate(-50%,-50%);pointer-events:auto!important;cursor:grab;touch-action:none;user-select:none;width:36px;height:36px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff5f8f,#fb7299);color:#fff;box-shadow:0 4px 14px rgba(251,114,153,.45),inset 0 0 0 .5px rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;z-index:2147483647;transition:transform .18s ease,box-shadow .18s ease}
.dy-launch:hover{transform:translate(-50%,-50%) scale(1.08);box-shadow:0 6px 20px rgba(251,114,153,.55),inset 0 0 0 .5px rgba(255,255,255,.3)}
.dy-launch:active{transform:translate(-50%,-50%) scale(.94)}
.dy-launch.dy-dragging{transition:none;cursor:grabbing;box-shadow:0 4px 14px rgba(251,114,153,.65)}
.dy-launch.dy-minimized{animation:dy-pulse 1.6s ease-in-out infinite;background:linear-gradient(135deg,#ff2d78,#fb7299);box-shadow:0 0 0 4px rgba(255,45,120,.2)}
@keyframes dy-pulse{0%,100%{box-shadow:0 0 0 4px rgba(255,45,120,.18)}50%{box-shadow:0 0 0 9px rgba(255,45,120,.42)}}
.dy-launch svg{display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.2))}
.dy-win{position:fixed;pointer-events:auto;background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;z-index:2147483100;will-change:left,top,width,height;border:1px solid rgba(0,0,0,.04)}
.dy-win--mini{box-shadow:0 8px 24px rgba(0,0,0,.22);border-radius:12px}
.dy-minimized-win{visibility:hidden!important;pointer-events:none!important}
.dy-hideable{display:none!important}
.dy-header{display:flex;align-items:center;gap:7px;padding:10px 12px;background:linear-gradient(120deg,#ff4f81,#fb7299 55%,#ff8fa8);color:#fff;cursor:move;user-select:none;flex:none;touch-action:none}
.dy-brand{font-weight:800;font-size:15px;letter-spacing:.5px;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.12)}
.dy-back{border:none;background:rgba(255,255,255,.22);color:#fff;border-radius:8px;padding:3px 9px;font-size:11px;cursor:pointer;white-space:nowrap;flex:none;backdrop-filter:blur(4px);transition:background .15s}
.dy-back:hover{background:rgba(255,255,255,.4)}
.dy-search{flex:1;min-width:0;display:flex;gap:5px}
.dy-search input{flex:1;min-width:0;border:none;border-radius:10px;padding:5px 11px;font-size:12px;outline:none;background:rgba(255,255,255,.94);box-shadow:0 1px 3px rgba(0,0,0,.08);transition:box-shadow .15s}
.dy-search input:focus{box-shadow:0 0 0 3px rgba(255,255,255,.35)}
.dy-hbtn{border:none;background:rgba(255,255,255,.2);color:#fff;border-radius:9px;padding:4px 9px;font-size:12px;cursor:pointer;white-space:nowrap;transition:background .15s,transform .1s}
.dy-hbtn:hover{background:rgba(255,255,255,.36)}
.dy-hbtn:active{transform:scale(.94)}
.dy-tabs{display:flex;gap:3px;padding:8px 10px 0;flex:none;border-bottom:1px solid #f0f0f2}
.dy-tab{border:none;background:transparent;color:#666;font-size:13px;padding:5px 12px;border-radius:9px 9px 0 0;cursor:pointer;position:relative;transition:color .15s,background .15s;font-weight:500}
.dy-tab:hover{color:#333;background:#f7f7f9}
.dy-tab.on{color:#fb7299;font-weight:700}
.dy-tab.on::after{content:'';position:absolute;left:12px;right:12px;bottom:-1px;height:2px;border-radius:2px;background:linear-gradient(90deg,#fb7299,#ff4f81)}
.dy-tab.ai{color:#9d6cff}
.dy-tab.ai.on{color:#8b5cf6}
.dy-tab.ai.on::after{background:linear-gradient(90deg,#8b5cf6,#c084fc)}
.dy-chips{display:flex;gap:6px;padding:8px 10px;overflow-x:auto;flex:none;scrollbar-width:none}
.dy-chip{flex:none;border:1px solid #e8e8ec;background:#fff;color:#555;border-radius:8px;padding:3px 11px;font-size:11px;cursor:pointer;white-space:nowrap;transition:all .15s}
.dy-chip:hover{border-color:#fb7299;color:#fb7299;background:#fff5f8}
.dy-chip.on{border-color:#fb7299;color:#fb7299;background:#fff0f5;font-weight:600}
.dy-chips.ai .dy-chip:hover{border-color:#8b5cf6;color:#8b5cf6;background:#f6f2ff}
.dy-chips.ai .dy-chip.on{border-color:#8b5cf6;color:#8b5cf6;background:#f1ecff}
.dy-opts{display:flex;gap:16px;align-items:center;padding:6px 12px;flex:none;font-size:12px;color:#666}
.dy-opt{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.dy-toggle{display:inline-flex;width:34px;height:19px;border-radius:10px;background:#e4e4e9;position:relative;transition:background .2s;flex:none}
.dy-toggle.on{background:linear-gradient(90deg,#fb7299,#ff4f81)}
.dy-toggle::after{content:'';position:absolute;left:2px;top:2px;width:15px;height:15px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.dy-toggle.on::after{left:17px}
.dy-player{flex:none;background:#000;position:relative;will-change:height}
.dy-player iframe{width:100%;height:100%;border:none;display:block;background:#000}
.dy-dragbar{position:absolute;top:0;left:0;right:0;height:20px;cursor:move;z-index:4;background:linear-gradient(rgba(0,0,0,.28),rgba(0,0,0,0));touch-action:none}
.dy-mini-ctrl{position:absolute;top:22px;right:6px;display:flex;gap:4px;z-index:5}
.dy-mini-ctrl button{border:none;background:rgba(0,0,0,.6);color:#fff;border-radius:8px;padding:3px 10px;font-size:11px;cursor:pointer;backdrop-filter:blur(4px);transition:background .15s}
.dy-mini-ctrl button:hover{background:rgba(0,0,0,.8)}
.dy-nextrow{display:flex;align-items:center;gap:8px;padding:6px 12px 8px;flex:none;font-size:11px;color:#666}
.dy-nextrow .dy-nextinfo{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#999}
.dy-nextrow .dy-nextinfo b{color:#fb7299;font-weight:700}
.dy-meta{display:flex;gap:6px;flex:none}
.dy-mbtn{border:1px solid #e5e5ea;background:#fff;color:#555;border-radius:8px;padding:3px 11px;font-size:11px;cursor:pointer;transition:all .15s}
.dy-mbtn:hover{border-color:#fb7299;color:#fb7299;background:#fff5f8}
.dy-list{flex:1;overflow-y:auto;padding:0 10px 10px}
.dy-item{display:flex;gap:10px;padding:9px;border-radius:12px;cursor:pointer;align-items:flex-start;transition:background .15s}
.dy-item:hover{background:#f7f7f9}
.dy-item.playing{background:#fff0f5}
.dy-item img{width:96px;height:60px;object-fit:cover;border-radius:8px;background:#eee;flex:none}
.dy-item .dy-pic-ph{width:96px;height:60px;border-radius:8px;background:linear-gradient(135deg,#f0f0f2,#e6e6ea);flex:none}
.dy-item .dy-info{flex:1;min-width:0}
.dy-item .dy-title{font-size:12.5px;color:#2c2c30;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:500}
.dy-item .dy-sub{font-size:11px;color:#9a9aa2;margin-top:5px;display:flex;gap:8px;flex-wrap:wrap}
.dy-follow-btn{margin-left:auto;flex:none;border:1px solid #e5e5ea;background:#fff;color:#666;border-radius:8px;padding:3px 11px;font-size:11px;cursor:pointer;white-space:nowrap;transition:all .15s}
.dy-follow-btn:hover{border-color:#fb7299;color:#fb7299;background:#fff5f8}
.dy-follow-btn.dy-followed{border-color:#e5e5ea;color:#999;background:#f7f7f9}
.dy-follow-btn.dy-followed:hover{border-color:#ff4d6a;color:#ff4d6a;background:#fff0f3}
.dy-hist{position:absolute;inset:0;background:#fff;z-index:6;display:flex;flex-direction:column}
.dy-hist-hd{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #f0f0f2;flex:none}
.dy-hist-hd b{flex:1;font-size:13px;color:#2c2c30}
.dy-hist-list{flex:1;overflow-y:auto;padding:8px}
.dy-help-body{flex:1;overflow-y:auto;padding:14px 16px}
.dy-help-sec{margin-bottom:18px}
.dy-help-sec:last-child{margin-bottom:0}
.dy-help-title{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#2c2c30;margin-bottom:9px}
.dy-help-row{display:flex;align-items:center;gap:8px;font-size:12px;color:#555;padding:4px 0}
.dy-help-key{flex:none;min-width:24px;text-align:center;border:1px solid #e0e0e5;background:#f8f8fa;border-radius:6px;padding:2px 7px;font-size:11px;font-weight:700;color:#444;box-shadow:0 1px 0 #e8e8ec,0 2px 4px rgba(0,0,0,.03);font-family:ui-monospace,Menlo,Consolas,monospace}
.dy-help-dot{flex:none;width:6px;height:6px;border-radius:50%;background:#fb7299;margin-left:8px}
.dy-help-desc{font-size:12px;color:#555;line-height:1.7;margin-bottom:9px}
.dy-help-link{display:flex;align-items:center;gap:6px;font-size:12px;color:#fb7299;cursor:pointer;padding:5px 0;transition:opacity .15s}
.dy-help-link:hover{opacity:.8;text-decoration:underline}
.dy-help-author{font-size:11px;color:#aaa;margin-top:9px}
.dy-empty{text-align:center;color:#bbb;font-size:12px;padding:30px 0}
.dy-skel{display:flex;gap:10px;padding:9px;align-items:flex-start}
.dy-skel-img{width:96px;height:60px;border-radius:8px;background:linear-gradient(135deg,#ececef,#f4f4f7);flex:none;animation:dy-shimmer 1.5s infinite}
.dy-skel-body{flex:1;display:flex;flex-direction:column;gap:6px}
.dy-skel-line{height:10px;border-radius:5px;background:linear-gradient(135deg,#ececef,#f4f4f7);animation:dy-shimmer 1.5s infinite}
.dy-skel-line.short{width:60%}
@keyframes dy-shimmer{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
.dy-watched{position:relative}
.dy-watched::after{content:'已看';position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);color:#eee;font-size:9px;padding:2px 5px;border-radius:5px;line-height:1.3;backdrop-filter:blur(2px)}
.dy-retry{display:flex;gap:8px;align-items:center;justify-content:center;padding:12px}
.dy-retry-btn{border:1px solid #fb7299;color:#fb7299;background:#fff;border-radius:9px;padding:5px 18px;font-size:12px;cursor:pointer;transition:all .15s}
.dy-retry-btn:hover{background:#fff0f5}
.dy-hist .dy-hbtn{background:#f4f4f7;color:#666;border:1px solid #e8e8ec}
.dy-hist .dy-hbtn:hover{background:#ececf0;color:#333}
.dy-resize{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:se-resize;z-index:8;touch-action:none}
.dy-resize::after{content:'';position:absolute;right:4px;bottom:4px;width:8px;height:8px;border-right:2px solid #c8c8ce;border-bottom:2px solid #c8c8ce;border-bottom-right-radius:3px}
body[data-dsh-maid-atelier] [data-skin-chrome='top-trim']{z-index:18!important}
body[data-dsh-maid-atelier] [data-skin-chrome='bottom-trim']{z-index:17!important}
`

		function apply(ctx) {
			injectCss(css)

			// Host HTTP 路由: /api/bili2/fetch /pic /follows /history
			function apiFetch(params) {
				return fetch('/api/bili2/fetch?' + new URLSearchParams(params).toString()).then(function (r) {
					if (!r.ok) throw new Error('http ' + r.status)
					return r.json()
				})
			}
			function apiPic(url) {
				return fetch('/api/bili2/pic?url=' + encodeURIComponent(url)).then(function (r) {
					if (!r.ok) throw new Error('http ' + r.status)
					return r.json()
				})
			}
			function apiFollows() {
				return fetch('/api/bili2/follows').then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
			}
			function apiFollowAdd(item) {
				return fetch('/api/bili2/follows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
			}
			function apiFollowDel(mid) {
				return fetch('/api/bili2/follows?mid=' + encodeURIComponent(mid), { method: 'DELETE' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
			}
			function apiSaveHist(item) {
				return fetch('/api/bili2/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
			}
			function apiGetHist() {
				return fetch('/api/bili2/history').then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json() })
			}

			const DEFAULT = { tab: 'rec', topic: '', cur: null, items: [], page: 1, done: false, autoplay: false, endMode: 'next', uiMode: 'normal', w: 420, h: 640, x: 0, y: 0, bx: 0, by: 0, kw: '', region: 0, followTab: 'follows' }
			const saved0 = loadLS(LS_STATE, {})
			const initSt = Object.assign({}, DEFAULT, saved0)
			const clamped = clampPos(initSt)
			initSt.x = clamped.x
			initSt.y = clamped.y
			const bub0 = clampBub(initSt.bx, initSt.by)
			initSt.bx = bub0.x
			initSt.by = bub0.y

			function Widget() {
				// 默认不自动弹窗：只有点侧边栏「B站」启动后小球出现，点小球才打开窗口
				const [open, setOpen] = react.useState(false)
				const [st, setSt] = react.useState(initSt)
				const [hist, setHist] = react.useState(loadLS(LS_HIST, []))
				const [histView, setHistView] = react.useState(false)
				const [searchHist, setSearchHist] = react.useState(loadLS(LS_KW, []))
				const [loading, setLoading] = react.useState(false)
				const [errMsg, setErrMsg] = react.useState('')
				const [lastMsg, setLastMsg] = react.useState('未收到播放器消息')
				const [follows, setFollows] = react.useState([])
				const [followLoading, setFollowLoading] = react.useState(false)
				const [persistHist, setPersistHist] = react.useState([])
				const [helpView, setHelpView] = react.useState(false)
				const navStackRef = react.useRef([])
				const silentRef = react.useRef(true)
				const endRef = react.useRef({ deadline: 0, startedAt: 0, durSecs: 0 })
				const seqRef = react.useRef(0)
				const movedRef = react.useRef(false)
				const loadingRef = react.useRef(false)
				const cacheRef = react.useRef({})
				const genRef = react.useRef(0)
				const inputRef = react.useRef(null)
				const winRef = react.useRef(null)
				const playerRef = react.useRef(null)
				const stRef = react.useRef(st)
				const histRef = react.useRef(hist)
				stRef.current = st
				histRef.current = hist

				react.useEffect(function () { saveLS(LS_STATE, st) }, [st])

				function setSilent(v) { silentRef.current = v }
				function armTimer(dur, startedAt) {
					const secs = parseDur(dur)
					const now = Date.now()
					if (secs <= 0) { endRef.current = { deadline: 0, startedAt: now, durSecs: 0 }; return }
					const st0 = startedAt || now
					endRef.current = { deadline: st0 + secs * 1000 + 1500, startedAt: st0, durSecs: secs }
				}
				function curKey(v) { return v ? (v.bvid || String(v.aid)) : '' }

				function doPlay(v, forceReload) {
					if (!v) return
					setSilent(false)
					const key = curKey(v)
					const nh = [{ bvid: v.bvid || '', aid: v.aid || 0, title: stripTags(v.title), pic: v.pic || '', duration: v.duration != null ? v.duration : 0, author: v.author || '', pubdate: v.pubdate || 0, at: Date.now() }, ...histRef.current.filter(function (h) { return curKey(h) !== key })].slice(0, 100)
					histRef.current = nh
					setHist(nh)
					saveLS(LS_HIST, nh)
					savePersistHist({ bvid: v.bvid || '', aid: v.aid || 0, title: v.title || '', pic: v.pic || '', author: v.author || '' })
					if (forceReload) seqRef.current++
					setSt(function (s) { return Object.assign({}, s, { cur: v, kw: '' }) })
					endRef.current = { deadline: 0, startedAt: Date.now(), durSecs: parseDur(v.duration) }
				}

				function onEnded() {
					endRef.current.deadline = 0
					const s = stRef.current
					if (!s.autoplay) return
					if (s.endMode === 'repeat' && s.cur) {
						setSilent(false)
						doPlay(s.cur, true)
						return
					}
					const idx = s.items.findIndex(function (v) { return curKey(v) === curKey(s.cur) })
					const next = idx >= 0 && idx + 1 < s.items.length ? s.items[idx + 1] : (s.items.length ? s.items[0] : null)
					if (next) doPlay(next)
				}

				function fetchArgs(tab, topic, region, page) {
					if (tab === 'search') return { kind: 'search', keyword: topic || '', page: page, search_type: 'video' }
					if (tab === 'rec') {
						if (topic) return { kind: 'search', keyword: topic, page: page }
						return { kind: 'hot', pn: page }
					}
					if (tab === 'hot') return { kind: 'hot', pn: page }
					if (tab === 'rank') return { kind: 'rank', rid: region || 0, page: page }
					if (tab === 'pick') return { kind: 'hot', pn: page }
					if (tab === 'follow') {
						const f = follows.find(function (x) { return String(x.mid) === String(topic || '') })
						return { kind: 'upper-videos', mid: topic || '', name: (f && f.name) || '', pn: page }
					}
					if (tab === 'ai') return { kind: 'search', keyword: topic || 'AI', page: page }
					return { kind: 'hot', pn: page }
				}
				function cacheKey(tab, topic, region) { return tab + '|' + (topic || '') + '|' + (region || 0) }

				function doFetch(gen, tab, topic, region, page, append, key) {
					loadingRef.current = true
					setLoading(true)
					setErrMsg('')
					const args = fetchArgs(tab, topic, region, page)
					const isRank = args.kind === 'rank'
					apiFetch(args).then(function (res) {
						if (gen !== genRef.current) return
						loadingRef.current = false
						setLoading(false)
						if (!res || !res.list || !res.list.length) {
							setErrMsg(res && res.error ? ('host: ' + res.error) : 'host 返回空列表')
							setSt(function (s) { return Object.assign({}, s, { done: true }) })
							return
						}
						const items = res.list.map(function (v) {
							return { bvid: v.bvid || '', aid: v.aid || 0, title: stripTags(v.title), pic: v.pic || '', duration: v.duration != null ? v.duration : 0, author: v.author || '', play: v.play || 0, danmaku: v.danmaku || 0, pubdate: v.pubdate || 0, mid: v.mid || 0, face: v.face || '' }
						})
						setSt(function (s) {
							const merged = append ? s.items.concat(items) : items
							const seen = {}
							const uniq = merged.filter(function (v) { const k = curKey(v); if (seen[k]) return false; seen[k] = true; return true })
							const done = isRank ? true : false
							cacheRef.current[key] = { items: uniq, page: page, done: done }
							return Object.assign({}, s, { items: uniq, tab: tab, topic: topic || '', page: page, done: done })
						})
					}, function (e) {
						if (gen !== genRef.current) return
						loadingRef.current = false
						setLoading(false)
						setErrMsg('fetch 失败: ' + String(e && e.message || e))
					})
				}

				function loadList(tab, topic, region, page, append) {
					if (!append) {
						genRef.current++
						loadingRef.current = false
					}
					const gen = genRef.current
					if (append && loadingRef.current) return
					const key = cacheKey(tab, topic, region)
					if (!append && cacheRef.current[key] && cacheRef.current[key].items.length) {
						const c = cacheRef.current[key]
						setSt(function (s) { return Object.assign({}, s, { items: c.items, tab: tab, topic: topic || '', page: c.page, done: c.done }) })
						silentRefresh(gen, key, tab, topic, region)
						return
					}
					doFetch(gen, tab, topic, region, page, append, key)
				}

				function silentRefresh(gen, key, tab, topic, region) {
					const args = fetchArgs(tab, topic, region, 1)
					const isRank = args.kind === 'rank'
					apiFetch(args).then(function (res) {
						if (gen !== genRef.current) return
						if (!res || !res.list || !res.list.length) return
						const items = res.list.map(function (v) {
							return { bvid: v.bvid || '', aid: v.aid || 0, title: stripTags(v.title), pic: v.pic || '', duration: v.duration != null ? v.duration : 0, author: v.author || '', play: v.play || 0, danmaku: v.danmaku || 0, pubdate: v.pubdate || 0, mid: v.mid || 0, face: v.face || '' }
						})
						cacheRef.current[key] = { items: items, page: 1, done: isRank ? true : false }
						setSt(function (s) {
							if (s.tab !== tab || s.topic !== (topic || '')) return s
							return Object.assign({}, s, { items: items, page: 1, done: isRank ? true : false })
						})
					}, function () {})
				}

				function loadMore() {
					const s = stRef.current
					if (s.done || loadingRef.current) return
					loadList(s.tab, s.topic, s.region, s.page + 1, true)
				}

				function pushNav() {
					const s = stRef.current
					navStackRef.current.push({ tab: s.tab, topic: s.topic || '', region: s.region || 0, kw: s.kw || '', followTab: s.followTab || 'follows' })
					if (navStackRef.current.length > 20) navStackRef.current.shift()
				}
				function goBack() {
					const prev = navStackRef.current.pop()
					if (!prev) return
					setSt(function (s) {
						const n = Object.assign({}, s, { tab: prev.tab, topic: prev.topic, region: prev.region, kw: prev.kw, followTab: prev.followTab, items: [], done: false, page: 1 })
						return n
					})
					if (prev.topic) {
						loadList(prev.tab, prev.topic, prev.region, 1, false)
					} else {
						loadList(prev.tab, '', prev.region, 1, false)
					}
				}
				function openTab(t) {
					if (t === stRef.current.tab && !stRef.current.topic) return
					pushNav()
					setSt(function (s) { return Object.assign({}, s, { tab: t, topic: '', items: [], done: false }) })
					loadList(t, '', stRef.current.region, 1, false)
				}
				function openFollowsTab() {
					if (stRef.current.tab === 'follow' && stRef.current.followTab === 'follows') return
					pushNav()
					setSt(function (s) { return Object.assign({}, s, { tab: 'follow', topic: '', followTab: 'follows', items: [], done: false, page: 1 }) })
				}
				function openUpVideos(mid, name) {
					pushNav()
					setSt(function (s) { return Object.assign({}, s, { tab: 'follow', topic: mid, followTab: 'videos', items: [], done: false, page: 1 }) })
					loadList('follow', mid, 0, 1, false)
				}
				function startTopic(topic) {
					if (topic === stRef.current.topic) return
					pushNav()
					setSilent(false)
					setSt(function (s) { return Object.assign({}, s, { topic: topic, items: [], done: false }) })
					loadList(stRef.current.tab, topic, stRef.current.region, 1, false)
				}
				function deleteHist(key) {
					var nh = histRef.current.filter(function(h){return curKey(h) !== key})
					histRef.current = nh
					setHist(nh)
					saveLS(LS_HIST, nh)
				}
				function doSearch() {
					const el2 = inputRef.current
					const k = String(el2 ? el2.value : '').trim()
					if (!k) return
					const bv = k.match(/^(BV[0-9A-Za-z]{10})$/i)
					if (bv) { doPlay({ bvid: bv[1].toUpperCase(), aid: 0, title: k, pic: '', duration: 0, author: '' }); return }
					const av = k.match(/^av(\d+)$/i)
					if (av) { doPlay({ bvid: '', aid: parseInt(av[1], 10), title: k, pic: '', duration: 0, author: '' }); return }
					pushNav()
					setSilent(false)
					setSt(function (s) { return Object.assign({}, s, { kw: k, tab: 'search', topic: k, items: [], page: 1, done: false }) })
					loadList('search', k, 0, 1, false)
					var sk = loadLS(LS_KW, [])
					sk = sk.filter(function(x){return x !== k}).slice(0, 20)
					sk.unshift(k)
					setSearchHist(sk)
					saveLS(LS_KW, sk)
				}
				function randomPlay() {
					const items = stRef.current.items
					if (!items.length) { loadList(stRef.current.tab, '', 0, 1, false); return }
					doPlay(items[Math.floor(Math.random() * items.length)])
				}
				function nextPlay() {
					const s = stRef.current
					const idx = s.items.findIndex(function (v) { return curKey(v) === curKey(s.cur) })
					const nxt = idx >= 0 && idx + 1 < s.items.length ? s.items[idx + 1] : (s.items.length ? s.items[0] : null)
					if (nxt) doPlay(nxt)
				}
				function prevPlay() {
					const s = stRef.current
					const idx = s.items.findIndex(function (v) { return curKey(v) === curKey(s.cur) })
					const prv = idx > 0 ? s.items[idx - 1] : (s.items.length ? s.items[s.items.length - 1] : null)
					if (prv) doPlay(prv)
				}
				function nextItem() {
					const s = stRef.current
					const idx = s.items.findIndex(function (v) { return curKey(v) === curKey(s.cur) })
					if (idx >= 0 && idx + 1 < s.items.length) return s.items[idx + 1]
					return null
				}
				function toggleAutoplay() {
					const s = stRef.current
					const next = !s.autoplay
					setSt(function (x) { return Object.assign({}, x, { autoplay: next }) })
				}
				function isFollowed(mid) { return follows.some(function (f) { return f.mid === mid }) }
				function toggleFollow(v) {
					if (!v || !v.mid) return
					if (isFollowed(v.mid)) {
						apiFollowDel(v.mid).then(function () { setFollows(follows.filter(function (f) { return f.mid !== v.mid })) })
					} else {
						apiFollowAdd({ mid: v.mid, name: v.author || v.title, face: v.face || v.pic || '' }).then(function () {
							setFollows(follows.concat([{ mid: v.mid, name: v.author || v.title, face: v.face || v.pic || '', latest_bvid: v.bvid || '' }]))
						})
					}
				}
				function loadFollows() {
					setFollowLoading(true)
					apiFollows().then(function (res) {
						if (res && res.follows) setFollows(res.follows)
						setFollowLoading(false)
					}).catch(function () { setFollowLoading(false) })
				}
				function loadPersistHist() {
					apiGetHist().then(function (res) {
						if (res && res.history) setPersistHist(res.history)
					})
				}
				function savePersistHist(item) {
					apiSaveHist(item).then(function () {
						loadPersistHist()
					})
				}
				function closeWin() { setHistView(false); setHelpView(false); setOpen(false); setSt(function (x) { return Object.assign({}, x, { minimized: false }) }) }
				function minimizeWin() { setHistView(false); setHelpView(false); setOpen(false); setSt(function (x) { return Object.assign({}, x, { minimized: true }) }) }
				function reopen() {
					if (stRef.current.minimized) {
						// 从最小化恢复：只显示窗口，不重新加载列表，保留播放进度
						setOpen(true)
						setSt(function (x) { return Object.assign({}, x, { minimized: false }) })
						return
					}
					setOpen(true)
					if (stRef.current.autoplay) setSilent(false)
					else setSilent(true)
					const s = stRef.current
					const p = clampPos(s)
					if (p.x !== s.x || p.y !== s.y) setSt(function (x) { return Object.assign({}, x, { x: p.x, y: p.y }) })
					if (s.cur) armTimer(s.cur.duration, Date.now())
					loadList(s.tab, s.topic, s.region, 1, false)
				}
				function toggleWin() {
					if (open) { minimizeWin() }
					else if (stRef.current.minimized) { reopen() }
					else { reopen() }
				}

				// 悬浮球：可自由拖动；拖动与点击分离（移动超过阈值算拖动，不触发开关）
				function ballPos() {
					const vw = window.innerWidth || 1280
					const x = typeof st.bx === 'number' ? st.bx : Math.round(vw / 2)
					const y = typeof st.by === 'number' ? st.by : 40
					return { x: Math.max(16, Math.min(vw - 16, x)), y: Math.max(16, y) }
				}
				function onBallDown(e) {
					if (e.button !== 0) return
					e.stopPropagation()
					const startX = e.clientX, startY = e.clientY
					const from = ballPos()
					const btn = e.currentTarget
					let moved = false
					btn.classList.add('dy-dragging')
					function onMove(ev) {
						const dx = ev.clientX - startX, dy = ev.clientY - startY
						if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
						btn.style.left = (from.x + dx) + 'px'
						btn.style.top = (from.y + dy) + 'px'
					}
					function onUp(ev) {
						document.removeEventListener('pointermove', onMove)
						document.removeEventListener('pointerup', onUp)
						btn.classList.remove('dy-dragging')
						if (moved) {
							const p = clampBub(from.x + (ev.clientX - startX), from.y + (ev.clientY - startY))
							setSt(function (s) { return Object.assign({}, s, { bx: p.x, by: p.y }) })
						} else {
							toggleWin()
						}
					}
					document.addEventListener('pointermove', onMove)
					document.addEventListener('pointerup', onUp)
				}

				react.useEffect(function () {
					const t = window.setInterval(function () {
						const e = endRef.current
						if (e.deadline > 0 && Date.now() >= e.deadline) {
							e.deadline = 0
							onEnded()
						}
					}, 1000)
					return function () { window.clearInterval(t) }
				}, [])

				react.useEffect(function () {
					silentRef.current = true
					setErrMsg('')
					if (saved0 && saved0.cur) armTimer(saved0.cur.duration, Date.now())
					loadList((saved0 && saved0.tab) || 'rec', (saved0 && saved0.topic) || '', (saved0 && saved0.region) || 0, 1, false)
				}, [])

				react.useEffect(function () {
					loadFollows()
					loadPersistHist()
				}, [])

				react.useEffect(function () {
					function onMsg(e) {
						try {
							if (typeof e.data === 'string') setLastMsg(e.data)
							else if (e.data && typeof e.data === 'object' && e.data.event) setLastMsg(String(e.data.event))
						} catch (err) {}
					}
					window.addEventListener('message', onMsg)
					return function () { window.removeEventListener('message', onMsg) }
				}, [])

				react.useEffect(function () {
					function onKey(e) {
						const tag = e.target && e.target.tagName
						if (tag === 'INPUT' || tag === 'TEXTAREA') return
						if (e.key === 'ArrowRight') { e.preventDefault(); nextPlay(); return }
						if (e.key === 'ArrowLeft') { e.preventDefault(); prevPlay(); return }
						if (e.key === 'm' || e.key === 'M') { e.preventDefault(); setSt(function (x) { return Object.assign({}, x, { uiMode: x.uiMode === 'mini' ? 'normal' : 'mini' }) }); return }
						if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setSt(function (x) { return Object.assign({}, x, { uiMode: x.uiMode === 'video' ? 'normal' : 'video' }) }); return }
						if (e.key === 'Escape') {
							if (helpView) { setHelpView(false); return }
							if (histView) { setHistView(false); return }
							if (navStackRef.current.length) { goBack(); return }
							closeWin(); return
						}
					}
					window.addEventListener('keydown', onKey)
					return function () { window.removeEventListener('keydown', onKey) }
				}, [])

				function startDrag(e) {
					if (e.button !== 0) return
					movedRef.current = false
					const startX = e.clientX, startY = e.clientY
					const base = stRef.current
					const fromX = base.x, fromY = base.y
					const fromW = base.w || 420, fromH = base.h || 640
					const win = winRef.current
					function onMove(ev) {
						const dx = ev.clientX - startX, dy = ev.clientY - startY
						if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true
						if (win) {
							const p = clampDrag(fromX + dx, fromY + dy, fromW, fromH)
							win.style.left = p.x + 'px'
							win.style.top = p.y + 'px'
						}
					}
					function onUp() {
						document.removeEventListener('pointermove', onMove)
						document.removeEventListener('pointerup', onUp)
						window.setTimeout(function () { movedRef.current = false }, 0)
						if (win) {
							const px = parseInt(win.style.left, 10)
							const py = parseInt(win.style.top, 10)
							const p = clampDrag(px || base.x, py || base.y, fromW, fromH)
							setSt(function (s) { return Object.assign({}, s, { x: p.x, y: p.y }) })
						}
					}
					document.addEventListener('pointermove', onMove)
					document.addEventListener('pointerup', onUp)
				}
				function startResize(e) {
					if (e.button !== 0) return
					e.stopPropagation()
					const startX = e.clientX, startY = e.clientY
					const base = stRef.current
					const fromW = base.w, fromH = base.h
					const win = winRef.current
					const player = playerRef.current
					function onMove(ev) {
						const dw = ev.clientX - startX, dh = ev.clientY - startY
						const w = Math.max(320, fromW + dw)
						const h = Math.max(240, fromH + dh)
						if (win) {
							win.style.width = w + 'px'
							win.style.height = h + 'px'
						}
						if (player) {
							player.style.height = Math.round(w * 9 / 16) + 'px'
						}
					}
					function onUp() {
						document.removeEventListener('pointermove', onMove)
						document.removeEventListener('pointerup', onUp)
						if (win) {
							const ww = parseInt(win.style.width, 10) || fromW
							const hh = parseInt(win.style.height, 10) || fromH
							setSt(function (s) { return Object.assign({}, s, { w: Math.max(320, ww), h: Math.max(240, hh) }) })
						}
					}
					document.addEventListener('pointermove', onMove)
					document.addEventListener('pointerup', onUp)
				}
				function consume(fn) {
					return function (e) {
						if (movedRef.current) {
							movedRef.current = false
							e.stopPropagation()
							return
						}
						fn(e)
					}
				}

				function Pic(props) {
					const url = props.url
					const [fallback, setFallback] = react.useState(picsRef.current[url] || '')
					const [failed, setFailed] = react.useState(false)
					react.useEffect(function () {
						let alive = true
						if (!fallback && url) {
							apiPic(url).then(function (res) {
								if (!alive) return
								if (res && res.data) {
									const c = picsRef.current
									const next = {}
									let k
									for (k in c) next[k] = c[k]
									next[url] = res.data
									const keys = Object.keys(next)
									if (keys.length > 60) delete next[keys[0]]
									picsRef.current = next
									saveLS(LS_PICS, next)
									setFallback(res.data)
								}
							}, function () {})
						}
						return function () { alive = false }
					}, [url])
					if (failed && fallback) {
						return react.createElement('img', { className: 'dy-pic', src: fallback, alt: '' })
					}
					if (!url) return react.createElement('div', { className: 'dy-pic-ph' })
					return react.createElement('img', {
						className: 'dy-pic',
						src: url,
						referrerPolicy: 'no-referrer',
						alt: '',
						onError: function () { setFailed(true) }
					})
				}

				const hideMain = (st.uiMode === 'mini' || st.uiMode === 'video' || histView || helpView)
				const hidePlayer = (histView || helpView)
				const winCls = 'dy-win' + (st.uiMode === 'mini' ? ' dy-win--mini' : '') + (st.uiMode === 'video' ? ' dy-win--video' : '') + (histView ? ' dy-win--hist' : '')
				const chips = st.tab === 'rec' ? REC_TOPICS : (st.tab === 'ai' ? AI_TOPICS : [])
				const isFollowTab = st.tab === 'follow'
				const curKeyStr = curKey(st.cur)
				const nxt = nextItem()
				const src = st.cur ? ('https://player.bilibili.com/player.html?' + (st.cur.bvid ? 'bvid=' + st.cur.bvid : 'aid=' + st.cur.aid) + '&autoplay=' + (silentRef.current ? '0' : '1') + '&high_quality=1&danmaku=1') : ''

				function winStyle() {
					if (st.uiMode === 'mini') return { left: st.x, top: st.y, width: 300, height: 180, minHeight: 0 }
					if (st.uiMode === 'video') return { left: st.x, top: st.y, width: Math.max(st.w, 480), height: Math.max(st.h, 320), minHeight: 0 }
					return { left: st.x, top: st.y, width: st.w, height: st.h }
				}
				function playerStyle() {
					if (st.uiMode === 'normal') return { width: '100%', height: Math.round(st.w * 9 / 16) }
					return { width: '100%', height: '100%' }
				}

				const el = react.createElement

				const header = el('div', { className: 'dy-header' + (hideMain ? ' dy-hideable' : ''), onPointerDown: startDrag },
					el('div', { className: 'dy-brand' }, 'B站'),
					navStackRef.current.length ? el('button', { className: 'dy-back', onClick: consume(goBack) }, '← 返回') : null,
					el('div', { className: 'dy-search' },
						el('input', { ref: inputRef, defaultValue: st.kw || '', placeholder: '搜索或粘贴BV/av链接', onKeyDown: function (e) { if (e.key === 'Enter') doSearch() } }),
						el('button', { className: 'dy-hbtn', onClick: consume(doSearch) }, '搜索'),
						el('button', { className: 'dy-hbtn', onClick: consume(randomPlay) }, '随机'),
						el('button', { className: 'dy-hbtn', onClick: consume(function () { setHistView(true) }) }, '历史'),
						el('button', { className: 'dy-hbtn', onClick: consume(function () { setHelpView(true) }) }, '?'),
						el('button', { className: 'dy-hbtn', onClick: consume(minimizeWin) }, '—'),
						el('button', { className: 'dy-hbtn', onClick: consume(closeWin) }, '×')
					)
				)

				const tabs = el('div', { className: 'dy-tabs' + (hideMain ? ' dy-hideable' : '') },
					[['rec', '推荐'], ['hot', '热门'], ['rank', '排行'], ['pick', '精选'], ['follow', '关注'], ['ai', 'AI']].map(function (t) {
						return el('button', { key: t[0], className: 'dy-tab' + (t[0] === 'ai' ? ' ai' : '') + (t[0] === 'follow' ? ' ai' : '') + (st.tab === t[0] && !st.topic ? ' on' : ''), onClick: consume(function () { if (t[0] === 'follow') openFollowsTab(); else openTab(t[0]) }) }, t[1])
					})
				)

				const kwHist = st.tab==='search' && !st.topic && searchHist.length ? el('div',{className:'dy-chips'+(st.tab==='ai'?' ai':'')+(hideMain?' dy-hideable':''),style:{paddingBottom:'2px'}}, searchHist.slice(0,10).map(function(kw){return el('button',{key:kw,className:'dy-chip'+((st.kw===kw)?' on':''),onClick:consume(function(){doSearch(kw)})},kw)})) : null

				const chipsRow = chips.length ? el('div', { className: 'dy-chips' + (st.tab === 'ai' ? ' ai' : '') + (hideMain ? ' dy-hideable' : ''), onWheel: function (e) { if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY } },
					chips.map(function (c) {
						return el('button', { key: c, className: 'dy-chip' + (st.topic === c ? ' on' : ''), onClick: consume(function () { startTopic(c) }) }, c)
					})
				) : null

				const opts = el('div', { className: 'dy-opts' + (hideMain ? ' dy-hideable' : '') },
					el('div', { className: 'dy-opt', onClick: consume(toggleAutoplay) },
						el('span', { className: 'dy-toggle' + (st.autoplay ? ' on' : '') }),
						el('span', null, st.autoplay ? '自动播:开' : '自动播:关')
					),
					el('div', { className: 'dy-opt', onClick: consume(function () { setSt(function (s) { return Object.assign({}, s, { endMode: s.endMode === 'next' ? 'repeat' : 'next' }) }) }) },
						el('span', { className: 'dy-toggle' + (st.endMode === 'repeat' ? ' on' : '') }),
						el('span', null, st.endMode === 'next' ? '播完:下一个' : '播完:重播')
					)
				)

				const nextRow = el('div', { className: 'dy-nextrow' + (hideMain ? ' dy-hideable' : '') },
					el('span', { className: 'dy-nextinfo' },
						nxt ? el('span', null, el('b', null, '下一条'), '：' + nxt.title) : el('span', null, '暂无下一条')
					),
					el('div', { className: 'dy-meta' },
						el('button', { className: 'dy-mbtn', onClick: consume(function () { setSt(function (s) { return Object.assign({}, s, { uiMode: s.uiMode === 'mini' ? 'normal' : 'mini' }) }) }) }, '迷你'),
						el('button', { className: 'dy-mbtn', onClick: consume(function () { setSt(function (s) { return Object.assign({}, s, { uiMode: s.uiMode === 'video' ? 'normal' : 'video' }) }) }) }, '专注'),
						el('button', { className: 'dy-mbtn', onClick: consume(prevPlay) }, '上一个'),
						el('button', { className: 'dy-mbtn', onClick: consume(nextPlay) }, '下一个')
					)
				)

				const playerStatus = el('div', { className: 'dy-nextrow' + (hideMain ? ' dy-hideable' : '') },
					el('span', { className: 'dy-nextinfo' },
						st.cur ? el('span', null, '播放器：', lastMsg) : null
					)
				)

				const miniCtrl = st.uiMode !== 'normal' ? el('div', { className: 'dy-mini-ctrl' },
					el('button', { onClick: function (e) { e.stopPropagation(); prevPlay() } }, '上一个'),
					el('button', { onClick: function (e) { e.stopPropagation(); nextPlay() } }, '下一个'),
					el('button', { onClick: function () { setSt(function (s) { return Object.assign({}, s, { uiMode: 'normal' }) }) } }, '还原'),
					el('button', { onClick: minimizeWin }, '—'),
					el('button', { onClick: closeWin }, '×')
				) : null

				const dragBar = st.uiMode !== 'normal' ? el('div', { className: 'dy-dragbar', onPointerDown: startDrag }) : null

				function onIframeLoad() {
					const s = stRef.current
					if (!s.cur) return
					if (silentRef.current) return
					armTimer(s.cur.duration, Date.now())
				}

				const player = el('div', { ref: playerRef, className: 'dy-player' + (hidePlayer ? ' dy-hideable' : ''), style: playerStyle() },
					src ? el('iframe', { key: curKeyStr + '_' + seqRef.current, src: src, allow: 'autoplay; fullscreen', allowFullScreen: true, onLoad: onIframeLoad }) : null,
					dragBar,
					miniCtrl
				)

				function SkeletonItem() {
					return el('div', { className: 'dy-skel' },
						el('div', { className: 'dy-skel-img' }),
						el('div', { className: 'dy-skel-body' },
							el('div', { className: 'dy-skel-line' }),
							el('div', { className: 'dy-skel-line short' }),
							el('div', { className: 'dy-skel-line short' })
						)
					)
				}
				function WatchedBadge() {
					return el('span', { style: { position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,.5)', color: '#aaa', fontSize: '9px', padding: '1px 4px', borderRadius: '4px', lineHeight: '1.2' } }, '已看')
				}
				const watchedSet = new Set(hist.map(curKey))
				const followItems = isFollowTab && st.followTab === 'follows' ? follows.map(function (f) {
					return el('div', { key: f.mid, className: 'dy-item', style: { cursor: 'pointer' }, onClick: consume(function () { openUpVideos(f.mid, f.name) }) },
						el('div', { style: { position: 'relative', flex: 'none' } },
							el('img', { className: 'dy-pic', src: f.face || '', style: { borderRadius: '50%', width: '48px', height: '48px', objectFit: 'cover' }, alt: f.name })
						),
						el('div', { className: 'dy-info' },
							el('div', { className: 'dy-title' }, f.name),
							el('div', { className: 'dy-sub' },
								el('span', null, '关注中'),
								el('button', { className: 'dy-follow-btn dy-followed', onClick: consume(function (e) { e.stopPropagation(); toggleFollow({ mid: f.mid, author: f.name, pic: f.face }) }) }, '取消关注')
							)
						)
					)
				}) : null
				const list = el('div', { className: 'dy-list' + (hideMain ? ' dy-hideable' : ''), onScroll: function (e) {
					const el2 = e.currentTarget
					if (el2.scrollTop + el2.clientHeight >= el2.scrollHeight - 160) loadMore()
				} },
					isFollowTab && st.followTab === 'follows' ? (followLoading ? [0,1,2,3].map(function (i) { return el(SkeletonItem, { key: 'skf' + i }) }) : (follows.length ? followItems : el('div', { className: 'dy-empty' }, '还没有关注的UP主'))) :
					loading && !st.items.length ? [0,1,2,3,4].map(function (i) { return el(SkeletonItem, { key: 'sk' + i }) }) :
					st.items.length ? st.items.map(function (v, i) {
						const key = curKey(v)
						const playing = key === curKeyStr
						const watched = !playing && watchedSet.has(key)
						const followBtn = v.mid ? el('button', { className: 'dy-follow-btn' + (isFollowed(v.mid) ? ' dy-followed' : ''), onClick: consume(function (e) { e.stopPropagation(); toggleFollow(v) }) }, isFollowed(v.mid) ? '已关注' : '+ 关注') : null
						return el('div', { key: key + '_' + i, className: 'dy-item' + (playing ? ' playing' : ''), onClick: consume(function () { doPlay(v) }) },
							el('div', { style: { position: 'relative', flex: 'none' } },
								el(Pic, { url: v.pic }),
								watched ? el(WatchedBadge) : null
							),
							el('div', { className: 'dy-info' },
								el('div', { className: 'dy-title' }, v.title || '(无标题)'),
								el('div', { className: 'dy-sub' },
									el('span', null, fmtDur(v.duration)),
									el('span', null, fmtTime(v.pubdate)),
									el('span', null, v.author || ''),
									el('span', null, fmtNum(v.play) + '播放')
								),
								followBtn
							)
						)
					}) : el('div', { className: 'dy-empty' }, errMsg ? el('div', { className: 'dy-retry' }, el('div', null, errMsg), el('button', { className: 'dy-retry-btn', onClick: consume(function () { loadList(st.tab, st.topic, st.region, 1, false) }) }, '重试')) : (isFollowTab ? '该UP主暂无视频' : (st.tab === 'search' ? '无结果，换个词试试' : '列表为空')))
				)

				const histPanel = histView ? el('div', { className: 'dy-hist' },
					el('div', { className: 'dy-hist-hd' },
						el('b', null, '观看历史'),
						el('button', { className: 'dy-hbtn', onClick: function () { histRef.current = []; setHist([]); saveLS(LS_HIST, []) } }, '清空'),
						el('button', { className: 'dy-hbtn', onClick: function () { setHistView(false) } }, '返回')
					),
					el('div', { className: 'dy-hist-list' },
						(hist.length ? hist : persistHist).length ? (hist.length ? hist : persistHist).map(function (h, i) {
							return el('div', { key: curKey(h) + '_h' + i, className: 'dy-item' + (curKey(h) === curKeyStr ? ' playing' : ''), onClick: function () { doPlay(h); setHistView(false) } },
								el(Pic, { url: h.pic }),
								el('div', { className: 'dy-info' },
									el('div', { className: 'dy-title' }, h.title || '(无标题)'),
									el('div', { className: 'dy-sub' },
										el('span', null, fmtDur(h.duration)),
										el('span', null, fmtTime(h.pubdate)),
										el('span', null, h.author || ''),
										el('span', null, new Date(h.at || Date.now()).toLocaleString())
									)
								)
							)
						}) : el('div', { className: 'dy-empty' }, '还没有观看历史')
					)
				) : null
				const helpPanel = helpView ? el('div', { className: 'dy-hist' },
				el('div', { className: 'dy-hist-hd' },
					el('b', null, '关于 · 快捷键'),
					el('button', { className: 'dy-hbtn', onClick: function () { setHelpView(false) } }, '关闭')
				),
				el('div', { className: 'dy-help-body' },
					el('div', { className: 'dy-help-sec' },
						el('div', { className: 'dy-help-title' },
							el('svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: '#fb7299', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
								el('circle', { cx: '12', cy: '12', r: '10' }),
								el('polyline', { points: '12 6 12 12 16 14' })
							),
							'快捷键'
						),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-key' }, '←'), el('span', { className: 'dy-help-key' }, '→'), el('span', null, '播放上一个 / 下一个')),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-key' }, 'M'), el('span', null, '迷你模式')),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-key' }, 'N'), el('span', null, '专注模式')),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-key' }, 'Esc'), el('span', null, '返回上一页 / 关闭'))
					),
					el('div', { className: 'dy-help-sec' },
						el('div', { className: 'dy-help-title' },
							el('svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: '#fb7299', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
								el('path', { d: 'M3 11.5V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4.5' }),
								el('path', { d: 'M21 11.5v3a2 2 0 0 1-2 2h-1' }),
								el('circle', { cx: '7', cy: '17', r: '2' }),
								el('circle', { cx: '17', cy: '17', r: '2' }),
								el('path', { d: 'M9 17h6' })
							),
							'窗口操作'
						),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-dot' }), el('span', null, '拖动顶部标题栏移动窗口')),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-dot' }), el('span', null, '右下角拖拽调整大小')),
						el('div', { className: 'dy-help-row' }, el('span', { className: 'dy-help-dot' }), el('span', null, '标题栏 — 最小化到悬浮球，播放不中断'))
					),
					el('div', { className: 'dy-help-sec' },
						el('div', { className: 'dy-help-title' },
							el('svg', { viewBox: '0 0 24 24', width: '15', height: '15', fill: 'none', stroke: '#fb7299', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
								el('circle', { cx: '12', cy: '12', r: '10' }),
								el('line', { x1: '2', y1: '12', x2: '22', y2: '12' }),
								el('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' })
							),
							'关于本项目'
						),
						el('div', { className: 'dy-help-desc' }, 'DSH B站浮窗插件：在 DeepSeek Harness 里悬浮看片的小窗，支持关注 UP 主、自动连播、迷你模式、历史持久化。'),
						el('div', { className: 'dy-help-link', onClick: function () { window.open('https://github.com/pyf2818/dsh-bili-widget', '_blank') } },
							el('svg', { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'currentColor', 'aria-hidden': 'true' },
								el('path', { d: 'M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6a11.5 11.5 0 0 0 7.9-10.9C23.5 5.6 18.4.5 12 .5z' })
							),
							'github.com/pyf2818/dsh-bili-widget'
						),
						el('div', { className: 'dy-help-author' }, '由 pyf2818 制作 · 觉得好用就点个 ⭐')
					)
				)
			) : null

				const bp = ballPos()
				return el('div', { className: 'dy-root' },
					el('button', { className: 'dy-launch' + (st.minimized ? ' dy-minimized' : ''), onPointerDown: onBallDown, title: st.minimized ? '点击恢复' : 'B站', style: { left: bp.x + 'px', top: bp.y + 'px' } },
						el('svg', { viewBox: '0 0 24 24', width: '17', height: '17', fill: 'currentColor', 'aria-hidden': 'true' },
							el('path', { d: 'M8 5.14v13.72L19 12 8 5.14z' })
						)
					),
					open || (st.minimized && st.cur) ? el('div', { ref: winRef, className: winCls + (st.minimized ? ' dy-minimized-win' : ''), style: winStyle() },
						header, tabs, kwHist, chipsRow, opts, player, nextRow, playerStatus, list, histPanel, helpPanel,
						st.uiMode === 'normal' && !histView ? el('div', { className: 'dy-resize', onPointerDown: startResize }) : null
					) : null
				)
			}

			ctx.inject(['slots'], function (scope) {
				return scope.slots.inject('shell.overlay', function () {
					return scope.slots.register(
						{ name: 'shell.overlay', id: 'bili-widget', order: 1000 },
						function () { return react.createElement(Widget) }
					)
				})
			})
		}

		exports.apply = apply;
		exports.inject = ['slots'];
		return module.exports;
	}
});
