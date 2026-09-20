/* =====================================================================
 * 社团百宝箱 - 应用逻辑
 * 一般不需要修改本文件。改数据请去 js/data.js
 * ===================================================================== */
"use strict";

var LS_KEY = "clubfair_interests_v2";
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

var TAGMAP = {};
CONFIG.tags.forEach(function (t) { TAGMAP[t.id] = t; });
var MODULEMAP = {};
(CONFIG.modules || []).forEach(function (m) { MODULEMAP[m.id] = m; });
var ZONEMAP = {};
(CONFIG.zones || []).forEach(function (z) { ZONEMAP[z.id] = z; });

var state = {
  module: null,      // 选中的四大模块 id
  selected: [],      // 已选兴趣标签 id（模块内）
  flowStep: "module",// 开屏流程：module -> tags
  page: "recommend",
  cat: "全部",
  kw: "",
  enteredMain: false,
  mapMoved: false    // 地图拖动标记（防误触点击）
};

var STATUS_TEXT = { open: "摆摊中", closed: "已收摊" };

/* ---------------- 颜色工具（渲染层降饱和，不动 data.js 里的原始色） ---------------- */
function mixHex(hex, mode, k) { // mode "w" 混白 / "d" 混黑，k=权重 0~1
  var h = String(hex).replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  var t = mode === "w" ? 255 : 34;
  r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k); b = Math.round(b + (t - b) * k);
  return "#" + [r, g, b].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join("");
}
function tint(hex, k) { return mixHex(hex, "w", k); }
function shade(hex, k) { return mixHex(hex, "d", k); }
var INK = "#22262B";

var ICONS = {
  search: '<svg class="s-ico" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
};

/* ---------------- 小工具 ---------------- */
function tagOf(id) {
  return TAGMAP[id] || { id: id, name: id, emoji: "🏷️", color: "#8A9099", module: null };
}
function moduleOf(id) {
  return MODULEMAP[id] || { id: id, name: id, emoji: "🧩", color: "#9AA0A8" };
}
function zoneColor(zoneId) {
  return ZONEMAP[zoneId] ? ZONEMAP[zoneId].color : "#9AA0A8";
}
function zoneName(zoneId) {
  return ZONEMAP[zoneId] ? ZONEMAP[zoneId].name : "未分配";
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

/* 轻提示 toast（复制成功等），自动消失 */
var _toastTimer = null;
function toast(msg, s) {
  var el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { el.classList.remove("show"); }, (s || 1.6) * 1000);
}

/* 复制文本到剪贴板（HTTPS 优先 Clipboard API，兼容旧环境走 execCommand） */
function copyText(text, okMsg) {
  function fallback() {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toast(okMsg || "已复制");
    } catch (e) { toast("复制失败，请手动长按复制"); }
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast(okMsg || "已复制"); }, fallback);
  } else {
    fallback();
  }
}

/* 图片加载失败兜底：头像回退到社团 logo emoji，照片隐藏占位（捕获阶段监听，动态插入的 img 也生效） */
document.addEventListener("error", function (e) {
  var img = e.target;
  if (!img || img.tagName !== "IMG") return;
  if (img.dataset.fb) {
    var span = document.createElement("span");
    span.textContent = img.dataset.fb;
    img.replaceWith(span);
  } else {
    var box = img.closest(".d-photo");
    if (box) box.style.display = "none";
    else img.style.display = "none";
  }
}, true);
function boothZone(club) {
  return club.booth ? String(club.booth).split("-")[0] : null;
}
function clubById(id) {
  return CONFIG.clubs.filter(function (c) { return c.id === Number(id); })[0];
}
function isRealClub(c) { return !!c.module; } // 赞助商等非社团摊位不参与推荐
function statusText(c) { return STATUS_TEXT[c.status] || "摆摊中"; }

/* ---------------- 屏幕切换 ---------------- */
function showScreen(name) {
  $$(".screen").forEach(function (el) { el.classList.remove("active"); });
  var target = $("#screen-" + name);
  if (target) target.classList.add("active");
  window.scrollTo(0, 0);
}

function switchPage(p) {
  state.page = p;
  $$(".page").forEach(function (el) { el.classList.remove("active"); });
  var pg = $("#page-" + p);
  if (pg) pg.classList.add("active");
  $$(".bottom-nav button").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-page") === p);
  });
  if (p === "recommend") renderRecommend();
  if (p === "map") renderMap();
  if (p === "clubs") renderClubs();
  window.scrollTo(0, 0);
}

function enterMain() {
  state.enteredMain = true;
  showScreen("main");
  switchPage("recommend");
}

/* ---------------- 开屏流程：第一步选模块 ---------------- */
function renderModules() {
  var grid = $("#moduleGrid");
  grid.innerHTML = (CONFIG.modules || []).map(function (m) {
    var n = CONFIG.clubs.filter(function (c) { return c.module === m.id; }).length;
    return '<button class="module-card" data-id="' + m.id + '" style="--c:' + m.color + '">' +
      '<span class="mc-emoji">' + m.emoji + '</span>' +
      '<span class="mc-name">' + esc(m.name) + '</span>' +
      '<span class="mc-desc">' + esc(m.desc) + '</span>' +
      '<span class="mc-count">' + n + ' 个社团</span>' +
      '</button>';
  }).join("");
}

function showFlowStep(step) {
  state.flowStep = step;
  $("#stepModule").style.display = step === "module" ? "" : "none";
  $("#stepTags").style.display = step === "tags" ? "" : "none";
  if (step === "tags") {
    var m = moduleOf(state.module);
    $("#curModule").innerHTML = '<span class="mp-emoji">' + m.emoji + '</span>' + esc(m.name) +
      '<em>模块 · 点击更换</em>';
    renderTagGrid();
  }
  updateInterestBar();
}

function renderTagGrid() {
  var grid = $("#tagGrid");
  var tags = CONFIG.tags.filter(function (t) { return t.module === state.module; });
  grid.innerHTML = tags.map(function (t) {
    return '<button class="tag-card" data-id="' + t.id + '" style="--c:' + t.color + '">' +
      '<span class="tag-emoji">' + t.emoji + '</span>' +
      '<span class="tag-name">' + esc(t.name) + '</span>' +
      '<span class="tag-check">✓</span>' +
      '</button>';
  }).join("");
}

function syncTagGrid() {
  $$("#tagGrid .tag-card").forEach(function (card) {
    var id = card.getAttribute("data-id");
    card.classList.toggle("on", state.selected.indexOf(id) >= 0);
  });
  updateInterestBar();
}

function updateInterestBar() {
  var btn = $("#btnConfirm");
  var prev = $("#btnPrevStep");
  if (state.flowStep === "module") {
    $("#selCount").textContent = "第 1 步 / 共 2 步";
    btn.style.display = "none";
    prev.style.display = "none";
  } else {
    var n = state.selected.length;
    $("#selCount").textContent = "已选 " + n + " 个";
    btn.style.display = "";
    if (n === 0) {
      btn.classList.add("disabled");
      btn.textContent = "至少选择 1 个兴趣";
    } else {
      btn.classList.remove("disabled");
      btn.textContent = "开始探索（已选 " + n + " 个）";
    }
  }
}

function saveFlow() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ module: state.module, tags: state.selected }));
  } catch (e) { }
}

function restoreFlow() {
  try {
    var saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    if (saved.module && MODULEMAP[saved.module]) state.module = saved.module;
    if (Array.isArray(saved.tags)) {
      state.selected = saved.tags.filter(function (id) { return TAGMAP[id] && TAGMAP[id].module === state.module; });
    }
  } catch (e) { }
}

/* ---------------- 推荐算法 ----------------
 * 标签匹配：社团 tags 与新生选中的兴趣求交集。
 *   排序：命中兴趣数多者优先；并列时「所选模块」的社团优先；
 *   匹配度 = 命中数 / min(已选兴趣数, 4) * 100，封顶 100%
 * ------------------------------------------ */
function scoreClub(club) {
  var sel = state.selected;
  if (!sel.length) return { matched: [], pct: 0 };
  var matched = club.tags.filter(function (t) { return sel.indexOf(t) >= 0; });
  var base = Math.min(sel.length, 4);
  var pct = Math.min(100, Math.round(matched.length / base * 100));
  return { matched: matched, pct: pct };
}

/* ---------------- 卡片渲染 ---------------- */
function boothPill(club) {
  var closed = club.status === "closed";
  if (club.booth) {
    return '<span class="booth-pill' + (closed ? ' off' : '') + '">' + esc(club.booth) +
      (closed ? ' · 已收摊' : '') + '</span>';
  }
  return '<span class="booth-pill pending">摊位待定</span>';
}

/* 社团头像：有照片用第一张照片，没有用 logo emoji（照片接口；data-fb 为加载失败兜底） */
function clubLogo(club) {
  if (club.photos && club.photos[0]) {
    return '<img src="' + esc(club.photos[0]) + '" alt="' + esc(club.name) + '" data-fb="' + esc(club.logo) + '" loading="lazy" decoding="async">';
  }
  return club.logo;
}

function clubCard(club, s, i, ranked) {
  var t0 = tagOf(club.tags[0] || "volunteer");
  var rank = (ranked && i < 3) ? '<span class="rank r' + (i + 1) + '">TOP ' + (i + 1) + '</span>' : "";
  var match = (ranked && s.matched.length)
    ? '<span class="match">' + ICONS.heart + ' 匹配 ' + s.pct + '%</span>' : "";
  var tags = club.tags.map(function (t) {
    return '<span class="t-chip">' + esc(tagOf(t).name) + '</span>';
  }).join("");
  return '<div class="club-card" data-club="' + club.id + '" style="animation-delay:' + (Math.min(i, 6) * 45) + 'ms">' +
    '<div class="c-top">' +
    '<div class="c-logo" style="background:' + t0.color + '12">' + clubLogo(club) + '</div>' +
    '<div class="c-main">' +
    '<div class="c-name">' + esc(club.name) + rank +
    '<span class="cat-chip" style="color:' + t0.color + ';background:' + t0.color + '1A">' + esc(club.cat) + '</span></div>' +
    '<div class="c-slogan">' + esc(club.slogan) + '</div>' +
    '</div></div>' +
    (tags ? '<div class="c-tags">' + tags + '</div>' : "") +
    '<div class="c-foot">' + match + boothPill(club) + '<span class="c-more">查看详情 ›</span></div>' +
    '</div>';
}

function renderRecommend() {
  var box = $("#page-recommend");
  var n = state.selected.length;
  var pool = CONFIG.clubs.filter(isRealClub);
  var list = pool.map(function (c) { return { c: c, s: scoreClub(c) }; });
  if (n) {
    list.sort(function (a, b) {
      var d = b.s.matched.length - a.s.matched.length;
      if (d) return d;
      var ma = a.c.module === state.module ? 1 : 0;
      var mb = b.c.module === state.module ? 1 : 0;
      return (mb - ma) || (a.c.id - b.c.id);
    });
  } else {
    list.sort(function (a, b) { return a.c.id - b.c.id; });
  }
  var m = state.module ? moduleOf(state.module) : null;
  var head = '<div class="rec-head"><h1>为你推荐</h1><p>' +
    (n
      ? '根据你选择的「' + esc(m ? m.name : "") + '」模块和 <b style="color:var(--red)">' + n + '</b> 个兴趣匹配生成，越靠前越契合'
      : '还没有选择兴趣，下面是全部社团；点击右上角「换兴趣」可获得个性化推荐') +
    '</p></div>';
  var body;
  if (!n) {
    body = '<div class="tip-card">选择兴趣标签后，这里会按匹配度为你排序推荐最合适的社团。</div>' +
      list.map(function (x, i) { return clubCard(x.c, x.s, i, false); }).join("");
  } else {
    body = list.map(function (x, i) { return clubCard(x.c, x.s, i, true); }).join("");
  }
  box.innerHTML = head + body;
}

/* ---------------- 场地地图（缩放 / 拖动 / 搜索） ---------------- */
function isRecommended(club) {
  return state.selected.length > 0 && isRealClub(club) && scoreClub(club).matched.length > 0;
}

/* --- 场馆平面图（仿百团大战场馆图）：由 MAP_LAYOUT 生成 SVG，可缩放/点击/搜索定位 --- */
function genRunCells(run) {
  var mf = String(run.from).match(/^(.*?)(\d+)$/);
  var mt = String(run.to).match(/^(.*?)(\d+)$/);
  if (!mf || !mt) return [];
  var prefix = mf[1], a = parseInt(mf[2], 10), b = parseInt(mt[2], 10), pad = mf[2].length;
  var step = b >= a ? 1 : -1, cells = [], v = a, n = 0;
  while (n < 300) {
    var x = run.dir === "h" ? run.x + n * (run.size + run.gap) : run.x;
    var y = run.dir === "v" ? run.y + n * (run.size + run.gap) : run.y;
    cells.push({ label: prefix + String(v).padStart(pad, "0"), x: x, y: y });
    if (v === b) break;
    v += step; n++;
  }
  return cells;
}

function buildVenueSvg(L) {
  state._boothPos = {};
  var clubByBooth = {};
  CONFIG.clubs.forEach(function (c) { if (c.booth) clubByBooth[String(c.booth)] = c; });

  var svg = '<svg class="map-svg" viewBox="0 0 ' + L.width + ' ' + L.height + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<rect x="0" y="0" width="' + L.width + '" height="' + L.height + '" fill="#FFFFFF" rx="12"/>';

  (L.blocks || []).forEach(function (b) {
    if (b.type === "area") {
      svg += '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h +
        '" fill="#FAFBFC" stroke="#C6CBD2" stroke-width="1.5" stroke-dasharray="6 4" rx="10"/>' +
        '<text x="' + (b.x + b.w / 2) + '" y="' + (b.y + b.h / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="19" font-weight="600" letter-spacing="4" fill="#B0B6BE">' + esc(b.label) + '</text>';
    } else {
      /* 舞台 / 门头：近黑色块（渲染层定色，data.js 的 color 字段不再使用） */
      svg += '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h +
        '" fill="' + INK + '" rx="8"/>';
      var lines = String(b.label).split(" ");
      var cy = b.y + b.h / 2;
      lines.forEach(function (ln, i) {
        var off = (i - (lines.length - 1) / 2) * 21;
        svg += '<text x="' + (b.x + b.w / 2) + '" y="' + (cy + off) + '" text-anchor="middle" dominant-baseline="central" font-size="' +
          (lines.length > 1 ? 16 : 18) + '" font-weight="700" letter-spacing="2" fill="#FFFFFF">' + esc(ln) + '</text>';
      });
    }
  });

  (L.runs || []).forEach(function (run) {
    var zc = zoneColor(String(run.from).split("-")[0]);
    genRunCells(run).forEach(function (cell) {
      var c = clubByBooth[cell.label];
      var closed = c && c.status === "closed";
      var rec = isRecommended(c);
      var fill = c ? (closed ? "#ECEDF0" : tint(zc, 0.86)) : "#F2F3F5";
      var txt = c ? (closed ? "#A6ABB2" : shade(zc, 0.42)) : "#B7BCC3";
      var stroke = rec
        ? ' stroke="#E5484D" stroke-width="2.5"'
        : ' stroke="' + (c ? zc : "#D9DCE1") + '" stroke-width="1.2"';
      var click = c ? ' data-club="' + c.id + '" style="cursor:pointer"' : "";
      svg += '<g' + click + '><title>' + esc(c ? c.name + " · " + statusText(c) : "预留摊位 " + cell.label) + '</title>' +
        '<rect x="' + cell.x + '" y="' + cell.y + '" width="' + run.size + '" height="' + run.size + '" rx="5" fill="' + fill + '"' + stroke + '/>' +
        '<text x="' + (cell.x + run.size / 2) + '" y="' + (cell.y + run.size / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="' +
        Math.max(10, Math.round(run.size * 0.32)) + '" font-weight="700" fill="' + txt + '"' +
        (closed ? ' text-decoration="line-through"' : "") + '>' + esc(cell.label) + '</text>' +
        (rec ? '<circle cx="' + (cell.x + run.size - 4.5) + '" cy="' + (cell.y + 4.5) + '" r="2.6" fill="#E5484D"/>' : "") +
        '</g>';
      if (c) state._boothPos[c.id] = { x: cell.x + run.size / 2, y: cell.y + run.size / 2 };
    });
  });

  svg += '</svg>';
  return svg;
}

function renderMap() {
  var box = $("#page-map");
  var unassigned = CONFIG.clubs.filter(function (c) { return !c.booth; });

  var listRows = (CONFIG.zones || []).map(function (z) {
    var clubs = CONFIG.clubs.filter(function (c) { return boothZone(c) === z.id; });
    if (!clubs.length) return "";
    return '<div class="bl-zone" style="--zc:' + z.color + '"><i></i>' + z.id + '区 · ' + esc(z.name) + '</div>' +
      clubs.map(function (c) {
        return '<div class="bl-row" data-club="' + c.id + '">' +
          '<span class="bl-no' + (c.status === "closed" ? " off" : "") + '" style="--zc:' + z.color + '">' + esc(c.booth) + '</span>' +
          '<span class="bl-name">' + esc(c.name) + (c.status === "closed" ? ' <em class="bl-closed">已收摊</em>' : "") + '</span>' +
          (isRecommended(c) ? '<span class="bl-love">' + ICONS.heart + '推荐</span>' : "") +
          '<span class="bl-arrow">›</span></div>';
      }).join("");
  }).join("");

  var mapInner;
  if (CONFIG.mapImage) {
    mapInner = '<img class="map-img" src="' + esc(CONFIG.mapImage) + '" alt="场地摊位图">';
  } else if (CONFIG.mapLayout) {
    mapInner = buildVenueSvg(CONFIG.mapLayout);
  } else {
    mapInner = '<div class="map-stage">🎤 主舞台 · 开幕表演区</div>' +
      '<div class="map-enter">🚩 观众入口 · 签到领取社团手册</div>';
  }

  box.innerHTML =
    '<div class="map-search-wrap">' +
    '<div class="search">' + ICONS.search + '<input id="mapSearch" type="text" placeholder="搜社团名 / 标签 / 摊位号，地图定位" autocomplete="off"></div>' +
    '<div class="map-results hidden" id="mapResults"></div>' +
    '</div>' +
    '<div class="map-card">' +
    '<div class="map-title">活动场地地图' + (CONFIG.mapImage ? '' : '<span class="map-badge">场馆平面图 · 可缩放拖动</span>') + '</div>' +
    '<div class="map-info">' +
    '<span class="info-pill">' + esc(CONFIG.eventDate) + '</span>' +
    '<span class="info-pill">' + esc(CONFIG.location) + '</span>' +
    '</div>' +
    '<div class="legend">' +
    (CONFIG.zones || []).map(function (z) {
      return '<span class="lg" style="--c:' + z.color + '"><i></i>' + z.id + '区 ' + esc(z.name) + '</span>';
    }).join("") +
    '<span class="lg" style="--c:' + INK + '"><i></i>主舞台 / 门头</span>' +
    '<span class="lg" style="--c:#A6ABB2"><i></i>灰色 = 已收摊</span>' +
    '<span class="lg" style="--c:#E5484D"><i></i>红点 = 为你推荐</span>' +
    '</div>' +
    '<div class="map-viewport" id="mapViewport"><div class="map-canvas" id="mapCanvas">' + mapInner + '</div></div>' +
    '<div class="map-tools">' +
    '<button class="map-btn" id="zoomIn">＋</button>' +
    '<button class="map-btn" id="zoomOut">−</button>' +
    '<button class="map-btn" id="zoomReset">⟲</button>' +
    '</div>' +
    '<div class="map-note">' +
    (CONFIG.mapImage ? '以上摊位图由负责人上传，可缩放查看。' : '当前为仿百团大战的场馆平面图（布局由管理员在 js/data.js 的 MAP_LAYOUT 提前标注，仅作摊位导览、非实时导航）。') +
    '带红点的是根据你的兴趣推荐的摊位；灰色划线格子表示该社团已收摊。点击摊位格子可查看社团详情。</div>' +
    '</div>' +
    '<div class="booth-list">' + listRows + '</div>';

  setupMapCanvas();
  setupMapSearch();
}

/* --- 缩放 + 拖动（双指捏合 / 滚轮 / 按钮 / 拖拽） --- */
function setupMapCanvas() {
  var vp = $("#mapViewport");
  var canvas = $("#mapCanvas");
  if (!vp || !canvas) return;
  var s = 1, tx = 0, ty = 0;
  var start = null, pinch = null;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function apply() {
    var cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    var vw = vp.clientWidth, vh = vp.clientHeight;
    tx = clamp(tx, Math.min(0, vw - cw * s), 0);
    ty = clamp(ty, Math.min(0, vh - ch * s), 0);
    canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
  }
  function setScale(ns, cx, cy) { // cx/cy: 视口内缩放中心，缺省居中
    ns = clamp(ns, 1, 4);
    if (cx == null) { cx = vp.clientWidth / 2; cy = vp.clientHeight / 2; }
    var k = ns / s;
    tx = cx - (cx - tx) * k;
    ty = cy - (cy - ty) * k;
    s = ns;
    if (s === 1) { tx = 0; ty = 0; }
    apply();
  }

  vp.addEventListener("touchstart", function (e) {
    state.mapMoved = false;
    if (e.touches.length === 1) {
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, tx: tx, ty: ty };
      canvas.style.transition = "none";
    } else if (e.touches.length === 2) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch = { d: Math.hypot(dx, dy), s: s };
      start = null;
    }
  }, { passive: true });

  vp.addEventListener("touchmove", function (e) {
    if (e.touches.length === 1 && start) {
      var dx = e.touches[0].clientX - start.x;
      var dy = e.touches[0].clientY - start.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) state.mapMoved = true;
      if (s > 1) { tx = start.tx + dx; ty = start.ty + dy; apply(); }
    } else if (e.touches.length === 2 && pinch) {
      state.mapMoved = true;
      var d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      canvas.style.transition = "none";
      setScale(pinch.s * d / pinch.d);
    }
  }, { passive: true });

  vp.addEventListener("touchend", function () {
    start = null; pinch = null;
    canvas.style.transition = "";
  });

  vp.addEventListener("mousedown", function (e) {
    state.mapMoved = false;
    start = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
    canvas.style.transition = "none";
  });
  if (state._mmMove) window.removeEventListener("mousemove", state._mmMove);
  if (state._mmUp) window.removeEventListener("mouseup", state._mmUp);
  state._mmMove = function (e) {
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { state.mapMoved = true; if (s > 1) { tx = start.tx + dx; ty = start.ty + dy; apply(); } }
  };
  state._mmUp = function () {
    if (start) { canvas.style.transition = ""; }
    start = null;
  };
  window.addEventListener("mousemove", state._mmMove);
  window.addEventListener("mouseup", state._mmUp);
  vp.addEventListener("wheel", function (e) {
    e.preventDefault();
    var r = vp.getBoundingClientRect();
    setScale(s * (e.deltaY < 0 ? 1.15 : 0.87), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  $("#zoomIn").addEventListener("click", function () { setScale(s * 1.35); });
  $("#zoomOut").addEventListener("click", function () { setScale(s / 1.35); });
  $("#zoomReset").addEventListener("click", function () { s = 1; tx = 0; ty = 0; canvas.style.transition = "transform .2s"; apply(); setTimeout(function () { canvas.style.transition = ""; }, 220); });

  state._mapApply = apply;
  /* 定位到画布坐标 (bx,by)：缩放到 ns 倍并把该点移到视口中心 */
  state._mapFocus = function (bx, by, ns) {
    s = clamp(ns, 1, 4);
    var vw = vp.clientWidth, vh = vp.clientHeight;
    var cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    tx = vw / 2 - bx * s;
    ty = vh / 2 - by * s;
    tx = clamp(tx, Math.min(0, vw - cw * s), 0);
    ty = clamp(ty, Math.min(0, vh - ch * s), 0);
    canvas.style.transition = "transform .35s ease";
    apply();
    setTimeout(function () { canvas.style.transition = ""; }, 380);
  };
  apply();
}

function zoomToBooth(clubId) {
  var pos = state._boothPos && state._boothPos[clubId];
  var vp = $("#mapViewport");
  var canvas = $("#mapCanvas");
  var svg = canvas ? canvas.querySelector(".map-svg") : null;
  if (!pos || !vp || !canvas || !svg || !state._mapFocus) { openDetail(clubId); return; }
  /* SVG viewBox 坐标 → 画布像素坐标 */
  var kx = svg.clientWidth / CONFIG.mapLayout.width;
  var ky = svg.clientHeight / CONFIG.mapLayout.height;
  var bx = svg.offsetLeft + pos.x * kx;
  var by = svg.offsetTop + pos.y * ky;
  state._mapFocus(bx, by, 2.4);
  vp.scrollIntoView({ behavior: "smooth", block: "nearest" });
  var node = svg.querySelector('[data-club="' + clubId + '"]');
  if (node) {
    node.classList.add("flash-svg");
    setTimeout(function () { node.classList.remove("flash-svg"); }, 3200);
  }
}

/* --- 地图搜索：名称 / 标签 / 摊位号 → 定位放大 + 高亮 --- */
function setupMapSearch() {
  var input = $("#mapSearch");
  var results = $("#mapResults");
  if (!input || !results) return;

  function doSearch() {
    var kw = input.value.trim().toLowerCase();
    if (!kw) { results.classList.add("hidden"); return; }
    var hits = CONFIG.clubs.filter(function (c) {
      var hay = (c.name + " " + c.cat + " " + (c.booth || "") + " " +
        c.tags.map(function (t) { return tagOf(t).name; }).join(" ")).toLowerCase();
      return hay.indexOf(kw) >= 0;
    }).slice(0, 8);
    results.innerHTML = hits.length
      ? hits.map(function (c) {
        var zc = zoneColor(boothZone(c));
        return '<div class="map-result" data-club="' + c.id + '" style="--zc:' + zc + '">' +
          '<span class="c-logo mini" style="background:' + zc + '12">' + clubLogo(c) + '</span>' +
          '<span class="mr-name">' + esc(c.name) + '</span>' +
          '<span class="mr-booth">' + (c.booth ? esc(c.booth) : "待定") + '</span></div>';
      }).join("")
      : '<div class="map-result none">没有找到匹配的社团或摊位</div>';
    results.classList.remove("hidden");
  }

  input.addEventListener("input", doSearch);
  input.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    /* 回车直达第一个结果 */
    var first = results.querySelector(".map-result[data-club]");
    if (first && !results.classList.contains("hidden")) first.click();
  });
  results.addEventListener("click", function (e) {
    var item = e.target.closest(".map-result[data-club]");
    if (!item) return;
    results.classList.add("hidden");
    input.value = "";
    zoomToBooth(item.getAttribute("data-club"));
  });
  /* 重渲染地图会重复执行本函数，先摘掉旧监听再挂新的，避免 document 上监听器累积 */
  if (state._docHideResults) document.removeEventListener("click", state._docHideResults);
  state._docHideResults = function (e) {
    if (!e.target.closest(".map-search-wrap")) results.classList.add("hidden");
  };
  document.addEventListener("click", state._docHideResults);
}

/* ---------------- 全部社团 ---------------- */
var CATS = ["文化艺术", "体育运动", "学术科技", "兴趣娱乐", "实践公益", "赞助商", "院系展示"];

function renderClubs() {
  var box = $("#page-clubs");
  var kw = state.kw.trim().toLowerCase();
  var list = CONFIG.clubs.filter(function (c) {
    if (state.cat !== "全部" && c.cat !== state.cat) return false;
    if (kw) {
      var hay = (c.name + c.slogan + c.cat + (c.booth || "") + c.tags.map(function (t) { return tagOf(t).name; }).join("")).toLowerCase();
      if (hay.indexOf(kw) < 0) return false;
    }
    return true;
  });
  var catRow = ['<button class="cat-chip2' + (state.cat === "全部" ? " on" : "") + '" data-cat="全部">全部</button>']
    .concat(CATS.map(function (cat) {
      return '<button class="cat-chip2' + (state.cat === cat ? " on" : "") + '" data-cat="' + cat + '">' + cat + '</button>';
    })).join("");

  var grid = list.length
    ? '<div class="club-grid">' + list.map(function (c) {
      var t0 = tagOf(c.tags[0] || "volunteer");
      return '<div class="g-card" data-club="' + c.id + '">' +
        '<div class="g-logo" style="background:' + t0.color + '12">' + clubLogo(c) + '</div>' +
        '<div class="g-name">' + esc(c.name) + (c.status === "closed" ? ' <em class="g-closed">已收摊</em>' : "") + '</div>' +
        '<div class="g-cat">' + esc(c.cat) + '</div>' +
        (c.booth
          ? '<span class="g-booth' + (c.status === "closed" ? " off" : "") + '">' + esc(c.booth) + '</span>'
          : '<span class="g-booth pending">待定</span>') +
        '</div>';
    }).join("") + '</div>'
    : '<div class="tip-card">没有找到匹配的社团，换个关键词试试。</div>';

  box.innerHTML =
    '<div class="search">' + ICONS.search + '<input id="kwInput" type="text" placeholder="搜索社团名 / 兴趣 / 关键词" value="' + esc(state.kw) + '"></div>' +
    '<div class="cat-row">' + catRow + '</div>' + grid;
}

/* ---------------- 详情弹层 ---------------- */
function openDetail(clubId) {
  var c = clubById(clubId);
  if (!c) return;
  var t0 = tagOf(c.tags[0] || "volunteer");
  var tags = c.tags.map(function (t) {
    var tg = tagOf(t);
    return '<span class="d-tag" style="background:' + tg.color + '14;color:' + shade(tg.color, 0.25) + '">' + tg.emoji + ' ' + esc(tg.name) + '</span>';
  }).join("");
  var s = scoreClub(c);
  var photos = c.photos || [];
  var photoSection = '<div class="d-sec">社团照片</div>' +
    (photos.length
      ? '<div class="d-photos">' + photos.map(function (p) {
        return '<div class="d-photo"><img src="' + esc(p) + '" alt="' + esc(c.name) + ' 照片" loading="lazy" decoding="async"></div>';
      }).join("") + '</div>'
      : '<div class="d-photo-empty"><b>社团照片待补充</b><span>负责人上传照片后将自动在此展示</span></div>');
  var matchCell = state.selected.length && isRealClub(c)
    ? '<div class="d-cell"><b>匹配你的兴趣</b><span>' +
      (s.matched.length
        ? s.matched.map(function (t) { return tagOf(t).name; }).join("、") + '（' + s.pct + '%）'
        : "换个兴趣看看～") + '</span></div>'
    : "";
  $("#sheetBody").innerHTML =
    '<div class="d-cover">' +
    '<button class="d-close" id="btnCloseDetail">✕</button>' +
    '<div class="d-headrow">' +
    '<div class="d-logo" style="background:' + t0.color + '12">' + clubLogo(c) + '</div>' +
    '<div class="d-headmain">' +
    '<div class="d-name">' + esc(c.name) + '<span class="d-cat">' + esc(c.cat) + '</span></div>' +
    '<div class="d-slogan">' + esc(c.slogan) + '</div>' +
    '</div></div></div>' +
    '<div class="d-body">' +
    (tags ? '<div class="d-sec">兴趣标签</div><div class="d-tags">' + tags + '</div>' : "") +
    '<div class="d-sec">摊位状态</div><div class="d-status' + (c.status === "closed" ? " closed" : "") + '">' + statusText(c) + '</div>' +
    '<div class="d-sec">社团介绍</div><div class="d-intro">' + esc(c.intro) + '</div>' +
    (c.branches ?
'<div class="d-sec">社团分部</div><div class="d-branches">' +
c.branches.map(function (b) {
  // 全部生成为button，link存到data-link
  return '<button ' +
    'class="branch-btn" ' +
    'data-name="' + esc(b.name) + '" ' +
    'data-desc="' + esc(b.desc || "暂无介绍") + '" ' +
    'data-link="' + esc(b.link || "") + '"' +
    '>' + esc(b.name) + '</button>';
}).join("") + '</div>' : "") +
    (c.activities ? '<div class="d-sec">社团活动</div><div class="d-intro">' + esc(c.activities) + '</div>' : "") +
    photoSection +
    '<div class="d-sec">关键信息</div>' +
    '<div class="d-info">' +
    '<div class="d-cell"><b>摊位位置</b><span>' + (c.booth ? esc(c.booth) + '（' + esc(zoneName(boothZone(c))) + '）' : "摊位待定") + '</span></div>' +
    (c.qq
      ? '<div class="d-cell tap" id="cellQQ" role="button" title="点击复制群号"><b>咨询 QQ 群（点击复制）</b><span>' + esc(c.qq) + '</span></div>'
      : '<div class="d-cell"><b>咨询 QQ 群</b><span>见摊位</span></div>') +
    matchCell +
    '</div>' +
    (c.booth ? '<button class="d-btn" id="btnGoMap">' + ICONS.pin + '在地图中查看摊位</button>' : "") +
    '</div>';
// 先移除旧的居中弹窗，避免叠加
 var oldPop = document.querySelector(".branch-pop");
 if (oldPop) oldPop.remove();
 // 创建弹窗，预留游戏按钮位置
 var popBox = document.createElement("div");
 popBox.className = "branch-pop";
 popBox.innerHTML =
   '<div class="branch-pop-card">' +
   '<h4 id="branchPopTitle"></h4>' +
   '<p id="branchPopDesc"></p>' +
   '<div id="gameBtnWrap" style="display:none; margin:12px 0;">' +
   '<a id="gameLinkBtn" target="_blank" class="pop-game-btn">进入神秘小游戏</a>' +
   '</div>' +
   '<button class="pop-close">关闭</button>' +
   "</div>";
 document.body.appendChild(popBox);
 // 给圆形分部标签绑定点击事件
 document.querySelectorAll(".branch-btn").forEach(function (btn) {
   btn.onclick = function (e) {
     e.stopPropagation();
     var name = this.getAttribute("data-name") || "分部介绍";
     var desc = this.getAttribute("data-desc") || "暂无介绍";
     var link = this.getAttribute("data-link");
     document.getElementById("branchPopTitle").innerText = name;
     document.getElementById("branchPopDesc").innerText = desc;
     // 判断是否有游戏链接，有就显示游戏按钮
     const gameWrap = document.getElementById("gameBtnWrap");
     const gameLink = document.getElementById("gameLinkBtn");
     if(link){
       gameWrap.style.display = "block";
       gameLink.href = link;
     }else{
       gameWrap.style.display = "none";
     }
     popBox.classList.add("show");
   };
 });
 // 关闭按钮
 popBox.querySelector(".pop-close").onclick = function () {
   popBox.classList.remove("show");
 };
 // 点击遮罩背景关闭弹窗
 popBox.onclick = function (e) {
   if (e.target === popBox) {
     popBox.classList.remove("show");
   }
 };
  $("#modal").classList.remove("hidden");
  $("#btnCloseDetail").onclick = closeModal;
  var qqCell = $("#cellQQ");
  if (qqCell) qqCell.onclick = function () { copyText(c.qq, "QQ 群号已复制"); };
  var go = $("#btnGoMap");
  if (go) go.onclick = function () { closeModal(); switchPage("map"); zoomToBooth(c.id); };
}

/* ---------------- 玩法说明弹层 ---------------- */
function openGuide() {
  $("#sheetBody").innerHTML =
    '<div class="d-cover plain">' +
    '<button class="d-close" id="btnCloseDetail">✕</button>' +
    '<div class="d-kicker">GUIDE</div>' +
    '<div class="d-name">活动介绍 · 玩法说明</div>' +
    '<div class="d-slogan">' + esc(CONFIG.eventName) + '</div>' +
    '</div>' +
    '<div class="d-body">' +
    '<div class="guide-box">' +
    (CONFIG.guide || []).map(function (line) { return '<p class="guide-p"><span>' + esc(line) + '</span></p>'; }).join("") +
    '</div>' +
    '<div class="d-info" style="margin-top:16px">' +
    '<div class="d-cell"><b>活动时间</b><span>' + esc(CONFIG.eventDate) + '</span></div>' +
    '<div class="d-cell"><b>活动地点</b><span>' + esc(CONFIG.location) + '</span></div>' +
    '</div>' +
    '<button class="d-btn" id="btnGuideStart">去选兴趣，获取专属推荐</button>' +
    '</div>';
  $("#modal").classList.remove("hidden");
  $("#btnCloseDetail").onclick = closeModal;
  $("#btnGuideStart").onclick = function () {
    closeModal();
    state.flowStep = state.module ? "tags" : "module";
    showScreen("interests");
    showFlowStep(state.flowStep);
  };
}

function closeModal() {
  $("#modal").classList.add("hidden");
}

/* ---------------- 欢迎 / 开屏 ---------------- */
function buildWelcome() {
  $("#wDate").textContent = CONFIG.eventDate;
  $("#wSub").textContent = CONFIG.eventName;
  $("#wOrg").textContent = CONFIG.organizer;
  $("#wChips").innerHTML = (CONFIG.modules || []).map(function (m) {
    return '<span style="--c:' + m.color + '"><i></i>' + esc(m.name) + '</span>';
  }).join("");
}

/* ---------------- 事件绑定 ---------------- */
function bindEvents() {
  $("#btnStart").addEventListener("click", function () {
    showScreen("interests");
    showFlowStep(state.module ? "tags" : "module");
  });
  $("#btnGuide").addEventListener("click", openGuide);
  $("#btnWGuide").addEventListener("click", openGuide);
  $("#btnBrowse").addEventListener("click", enterMain);
  $("#btnBack").addEventListener("click", function () {
    if (state.flowStep === "tags") {
      showFlowStep("module");
    } else {
      showScreen(state.enteredMain ? "main" : "welcome");
    }
  });
  $("#btnPrevStep").addEventListener("click", function () { showFlowStep("module"); });
  $("#btnRechoose").addEventListener("click", function () {
    showScreen("interests");
    showFlowStep("module");
  });
  $("#btnConfirm").addEventListener("click", function () {
    if (!state.selected.length) return;
    saveFlow();
    enterMain();
  });

  $("#moduleGrid").addEventListener("click", function (e) {
    var card = e.target.closest(".module-card");
    if (!card) return;
    var id = card.getAttribute("data-id");
    if (state.module !== id) { state.module = id; state.selected = []; } // 换模块清空标签
    saveFlow();
    showFlowStep("tags");
  });

  $("#curModule").addEventListener("click", function () { showFlowStep("module"); });

  $("#tagGrid").addEventListener("click", function (e) {
    var card = e.target.closest(".tag-card");
    if (!card) return;
    var id = card.getAttribute("data-id");
    var i = state.selected.indexOf(id);
    if (i >= 0) state.selected.splice(i, 1); else state.selected.push(id);
    saveFlow();
    syncTagGrid();
  });

  $(".bottom-nav").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) switchPage(b.getAttribute("data-page"));
  });

  $("#page-recommend").addEventListener("click", function (e) {
    var card = e.target.closest(".club-card");
    if (card) openDetail(card.getAttribute("data-club"));
  });
  $("#page-map").addEventListener("click", function (e) {
    if (state.mapMoved) return; // 拖动地图后不触发点击
    var t = e.target.closest("[data-club]");
    if (t) openDetail(t.getAttribute("data-club"));
  });
  $("#page-clubs").addEventListener("click", function (e) {
    var chip = e.target.closest(".cat-chip2");
    if (chip) {
      state.cat = chip.getAttribute("data-cat");
      renderClubs();
      return;
    }
    var card = e.target.closest(".g-card");
    if (card) openDetail(card.getAttribute("data-club"));
  });
  $("#page-clubs").addEventListener("input", function (e) {
    if (e.target.id === "kwInput") {
      state.kw = e.target.value;
      clearTimeout(state._kwTimer);
      state._kwTimer = setTimeout(function () {
        var pos = e.target.selectionStart;
        renderClubs();
        var input = $("#kwInput");
        if (input) { input.focus(); input.setSelectionRange(pos, pos); }
      }, 250);
    }
  });

  $("#modal").addEventListener("click", function (e) {
    if (e.target.classList.contains("mask")) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });
}

/* ---------------- 启动 ---------------- */
function init() {
  document.title = CONFIG.appName + " · " + CONFIG.eventName;
  $("#brandName").textContent = CONFIG.appName;
  buildWelcome();
  renderModules();
  bindEvents();
  restoreFlow();
  if (state.module) { renderTagGrid(); }
  syncTagGrid();
  showFlowStep(state.module ? "tags" : "module");
  showScreen("welcome");
}

document.addEventListener("DOMContentLoaded", init);
