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
function isRealClub(c) { return !!(c && c.module); } // 赞助商等非社团摊位不参与推荐
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

/* 社团头像：图片图标 > 第一张活动照片 > logo emoji（data-fb 为图片加载失败兜底） */
function clubLogo(club) {
  var logo = String(club.logo || "");
  var isImg = logo.indexOf("/uploads/") === 0;
  var emoji = isImg ? "" : logo;
  if (isImg) {
    return '<img src="' + esc(logo) + '" alt="' + esc(club.name) + '" data-fb="' + esc(emoji) + '" loading="lazy" decoding="async">';
  }
  if (club.photos && club.photos[0]) {
    return '<img src="' + esc(club.photos[0]) + '" alt="' + esc(club.name) + '" data-fb="' + esc(emoji) + '" loading="lazy" decoding="async">';
  }
  return esc(emoji);
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
  return !!club && state.selected.length > 0 && isRealClub(club) && scoreClub(club).matched.length > 0;
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

/* --- 真实场馆图模式：底图 + 编号名牌（BOOTH_LAYOUT 分段等分 + 服务端拖动覆盖） --- */
function moduleColor(c) {
  var m = (CONFIG.modules || []).filter(function (x) { return x.id === c.module; })[0];
  return m ? m.color : "#E5484D";
}
function boothBasePositions() {
  var pos = {};
  (CONFIG.boothLayout.segments || []).forEach(function (s) {
    var n = Math.abs(s.to - s.from);
    for (var i = 0; i <= n; i++) {
      var t = n ? i / n : 0;
      pos[s.from + (s.to > s.from ? i : -i)] = {
        x: s.x1 + (s.x2 - s.x1) * t,
        y: s.y1 + (s.y2 - s.y1) * t,
        kind: s.kind || "ring",
        wide: !!s.wide
      };
    }
  });
  return pos;
}
function boothPosNow(label) {
  if (!state._boothBase) state._boothBase = boothBasePositions();
  var base = state._boothBase[String(label)];
  if (!base) return null;
  var ov = (state._layoutDraft && state._layoutDraft[label]) ||
    (CONFIG.remoteLayout && CONFIG.remoteLayout.positions && CONFIG.remoteLayout.positions[label]);
  return ov ? { x: ov.x, y: ov.y, kind: base.kind, wide: base.wide } : base;
}
function buildVenueImage() {
  state._boothBase = boothBasePositions();
  state._boothPosPct = {};
  var clubByBooth = {};
  CONFIG.clubs.forEach(function (c) { if (c.booth) clubByBooth[String(c.booth)] = c; });

  var html = '<div class="bo-stage" id="boStage"><img class="bo-img" src="' + esc(CONFIG.mapImage) + '" alt="场地摊位图" draggable="false">';
  html += '<div class="bo-overview" aria-hidden="true">' +
    '<span class="bo-region bo-stage-area">舞台</span>' +
    '<span class="bo-region bo-audience-area">观众<br>座位区</span>' +
    '<span class="bo-region bo-gate-area">门头</span>' +
      '<span class="bo-region bo-service-zone">服务区</span>' +
    '</div>';
  function addRange(labels, range, inset) {
    var points = labels.map(function (label) { return state._boothBase[String(label)]; }).filter(Boolean);
    if (!points.length) return;
    inset = inset == null ? 2.5 : inset;
    var xs = points.map(function (p) { return p.x; });
    var ys = points.map(function (p) { return p.y; });
    var left = Math.max(1, Math.min.apply(null, xs) - inset);
    var top = Math.max(1, Math.min.apply(null, ys) - inset);
    var right = Math.min(99, Math.max.apply(null, xs) + inset);
    var bottom = Math.min(99, Math.max.apply(null, ys) + inset);
    var vertical = (bottom - top) > (right - left);
    html += '<span class="bo-range' + (vertical ? ' vertical' : '') + '" style="left:' + left + '%;top:' + top + '%;width:' + (right - left) + '%;height:' + (bottom - top) + '%"><b>' + esc(range) + '</b></span>';
  }
  addRange([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], "1 - 23");
  addRange([24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40], "24 - 40");
  addRange([93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116], "93 - 116");
  addRange([69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92], "80 - 92");
  (CONFIG.boothLayout.segments || []).forEach(function (segment) {
    var from = Math.abs(Number(segment.from));
    var to = Math.abs(Number(segment.to));
    var grouped = (from <= 23 && to <= 23) ||
      (from >= 24 && from <= 40 && to >= 24 && to <= 40) ||
      (from >= 80 && from <= 92 && to >= 80 && to <= 92) ||
      (from >= 93 && from <= 116 && to >= 93 && to <= 116) ||
      (from === 80 && to === 69);
    if (grouped) return;
    var left = Math.min(segment.x1, segment.x2) - 2.5;
    var top = Math.min(segment.y1, segment.y2) - 2.5;
    var width = Math.abs(segment.x2 - segment.x1) + 5;
    var height = Math.abs(segment.y2 - segment.y1) + 5;
    var vertical = Math.abs(segment.y2 - segment.y1) > Math.abs(segment.x2 - segment.x1);
    var start = String(segment.from);
    var end = String(segment.to);
    var range = start === end ? start : start + " - " + end;
    html += '<span class="bo-range' + (vertical ? ' vertical' : '') + '" style="left:' + left + '%;top:' + top + '%;width:' + width + '%;height:' + height + '%"><b>' + esc(range) + '</b></span>';
  });
  Object.keys(state._boothBase).forEach(function (label) {
    var p = boothPosNow(label);
    var c = clubByBooth[label];
    var closed = c && c.status === "closed";
    var rec = c ? isRecommended(c) : false;
    var cls = "bo-chip " + p.kind + (p.wide ? " wide" : "") + (c ? (closed ? " on off" : " on") : "") + (rec ? " rec" : "");
    var style = "left:" + p.x + "%;top:" + p.y + "%;";
    if (c && !closed) style += "--bc:" + moduleColor(c) + ";";
    html += '<button class="' + cls + '" data-booth="' + esc(label) + '"' + (c ? ' data-club="' + c.id + '"' : "") +
      ' style="' + style + '"><b>' + esc(label) + '</b></button>';
    if (c) state._boothPosPct[c.id] = { x: p.x, y: p.y };
  });
  html += '</div>';
  return html;
}

/* 圆点随地图宽度等比缩放：--bo-u = 容器宽/829（原图 1px 的实际像素） */
function sizeBoothStage() {
  var stage = $("#boStage");
  if (!stage) return;
  var w = stage.getBoundingClientRect().width;
  if (w > 0) stage.style.setProperty("--bo-u", (w / 829).toFixed(4) + "px");
}

/* 管理员布局模式：拖名牌微调位置 / 点名牌分配社团 */
function setupBoothStage() {
  var stage = $("#boStage");
  if (!stage) return;
  sizeBoothStage();
  if (!window._boResizeHook) {
    window._boResizeHook = true;
    window.addEventListener("resize", sizeBoothStage);
  }
  var admin = (leadAuth() || {}).role === "admin";
  if (!admin) {
    stage.addEventListener("click", function (e) {
      var chip = e.target.closest(".bo-chip");
      if (!chip) return;
      if (chip.getAttribute("data-club")) openDetail(Number(chip.getAttribute("data-club")));
      else toast("摊位 " + chip.getAttribute("data-booth") + " 暂未分配社团");
    });
    return;
  }
  /* 布局工具条（renderMap 已生成 #layoutBar） */
  state._layoutMode = false;
  state._layoutDraft = state._layoutDraft || {};

  function setMode(on) {
    state._layoutMode = on;
    stage.classList.toggle("layout-on", on);
    $("#btnLayoutMode").classList.toggle("hidden", on);
    $("#lbActions").classList.toggle("hidden", !on);
  }
  $("#btnLayoutMode").onclick = function () { setMode(true); };
  $("#btnBatchAssign").onclick = openBatchAssign;
  $("#btnLayoutExit").onclick = function () { setMode(false); };
  $("#btnLayoutReset").onclick = function () {
    state._layoutDraft = {};
    renderMap();
    toast("已还原为本次打开时的位置");
  };
  $("#btnLayoutSave").onclick = function () {
    apiFetch("/api/layout", { method: "PUT", body: { positions: state._layoutDraft } }).then(function (j) {
      CONFIG.remoteLayout = j.layout;
      state._layoutDraft = {};
      toast("布局已保存，所有人 20 秒内同步");
    }).catch(function (e) { toast(e.message || "保存失败"); });
  };

  /* 拖动 / 点击分配 */
  var drag = null;
  stage.addEventListener("pointerdown", function (e) {
    if (!state._layoutMode) return;
    var chip = e.target.closest(".bo-chip");
    if (!chip) return;
    e.stopPropagation();
    e.preventDefault();
    drag = {
      chip: chip, label: chip.getAttribute("data-booth"),
      sx: e.clientX, sy: e.clientY, moved: false
    };
    state._chipDrag = drag;
    chip.classList.add("dragging");
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    var r = stage.getBoundingClientRect();
    var x = Math.min(99, Math.max(1, (e.clientX - r.left) / r.width * 100));
    var y = Math.min(99, Math.max(1, (e.clientY - r.top) / r.height * 100));
    drag.chip.style.left = x + "%";
    drag.chip.style.top = y + "%";
    drag.x = x; drag.y = y;
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    state._chipDrag = null;
    drag.chip.classList.remove("dragging");
    if (drag.moved && drag.x != null) state._layoutDraft[drag.label] = { x: drag.x, y: drag.y };
    else openBoothAssign(drag.label, stage);
    drag = null;
  });
}

/* 名牌点击 → 分配/换社团弹层（仅布局模式内） */
function openBoothAssign(label, stage) {
  var old = $("#boothPop");
  if (old) old.remove();
  var pop = document.createElement("div");
  pop.className = "booth-pop";
  pop.id = "boothPop";
  pop.innerHTML =
    '<div class="bp-card"><div class="bp-head"><b>摊位 ' + esc(label) + '</b>' +
    '<span class="bp-close" id="bpClose">×</span></div>' +
    '<div class="bp-search"><input id="bpSearch" type="text" placeholder="搜社团名，点选分配"></div>' +
    '<div class="bp-list" id="bpList"></div></div>';
  document.body.appendChild(pop);
  pop.addEventListener("click", function (e) { if (e.target === pop) pop.remove(); });
  $("#bpClose").onclick = function () { pop.remove(); };

  function renderList(q) {
    var rows = CONFIG.clubs.filter(function (c) {
      return c.module && (!q || c.name.indexOf(q) >= 0);
    }).sort(function (a, b) {
      return (a.booth ? 0 : 1) - (b.booth ? 0 : 1) || a.id - b.id;
    }).slice(0, 80).map(function (c) {
      return '<div class="bp-row' + (c.booth === label ? " cur" : "") + '" data-id="' + c.id + '">' +
        '<span class="bp-logo">' + esc(c.logo) + '</span><span class="bp-name">' + esc(c.name) + '</span>' +
        '<span class="bp-booth">' + (c.booth ? (c.booth === label ? "当前在此" : "摊位 " + esc(c.booth)) : "未分配") + '</span></div>';
    }).join("");
    $("#bpList").innerHTML = rows || '<div class="bp-empty">没有匹配的社团</div>';
  }
  renderList("");
  $("#bpSearch").addEventListener("input", function () { renderList(this.value.trim()); });
  $("#bpList").addEventListener("click", function (e) {
    var row = e.target.closest(".bp-row");
    if (!row) return;
    var id = Number(row.getAttribute("data-id"));
    var club = CONFIG.clubs.filter(function (c) { return c.id === id; })[0];
    if (!club) return;
    if (club.booth === label) {
      /* 点击当前占用者 → 取消分配 */
      apiFetch("/api/club/" + id, { method: "PUT", body: { booth: "" } }).then(function () {
        club.booth = ""; pop.remove(); renderMap(); toast("已取消 " + club.name + " 的摊位");
      }).catch(function (er) { toast(er.message || "操作失败"); });
      return;
    }
    var prev = CONFIG.clubs.filter(function (c) { return c.booth === label && c.id !== id; })[0];
    var doAssign = function () {
      apiFetch("/api/club/" + id, { method: "PUT", body: { booth: label } }).then(function () {
        club.booth = label; pop.remove(); renderMap();
        toast(club.name + " → 摊位 " + label);
      }).catch(function (er) { toast(er.message || "操作失败"); });
    };
    if (prev) {
      apiFetch("/api/club/" + prev.id, { method: "PUT", body: { booth: "" } }).then(doAssign)
        .catch(function (er) { toast(er.message || "操作失败"); });
    } else doAssign();
  });
}

/* 批量填号：按社团列表直接填摊位号（方案 B 的正向入口） */
function openBatchAssign() {
  if (!state._boothBase) state._boothBase = boothBasePositions();
  var old = $("#boothPop");
  if (old) old.remove();
  var pop = document.createElement("div");
  pop.className = "booth-pop";
  pop.id = "boothPop";
  pop.innerHTML =
    '<div class="bp-card bp-wide"><div class="bp-head"><b>按社团填摊位号</b>' +
    '<span class="bp-close" id="bpClose">×</span></div>' +
    '<div class="bp-search"><input id="bpSearch" type="text" placeholder="搜社团名，右侧输入摊位号（1-' +
    Object.keys(state._boothBase).length + '）"></div>' +
    '<div class="bp-list" id="bpList"></div></div>';
  document.body.appendChild(pop);
  pop.addEventListener("click", function (e) { if (e.target === pop) pop.remove(); });
  $("#bpClose").onclick = function () { pop.remove(); };

  function renderList(q) {
    var rows = CONFIG.clubs.filter(function (c) {
      return c.module && (!q || c.name.indexOf(q) >= 0);
    }).sort(function (a, b) {
      return (a.booth ? 0 : 1) - (b.booth ? 0 : 1) || a.id - b.id;
    }).slice(0, 200).map(function (c) {
      return '<div class="bp-row' + (c.booth ? " cur" : "") + '" data-id="' + c.id + '">' +
        '<span class="bp-logo">' + esc(c.logo) + '</span><span class="bp-name">' + esc(c.name) + '</span>' +
        '<input class="bp-input" type="text" inputmode="numeric" maxlength="4" placeholder="号" value="' + esc(c.booth || "") + '" data-boothinput="' + c.id + '"></div>';
    }).join("");
    $("#bpList").innerHTML = rows || '<div class="bp-empty">没有匹配的社团</div>';
  }
  renderList("");
  $("#bpSearch").addEventListener("input", function () { renderList(this.value.trim()); });
  $("#bpList").addEventListener("change", function (e) {
    var input = e.target.closest(".bp-input");
    if (!input) return;
    var id = Number(input.getAttribute("data-boothinput"));
    var club = CONFIG.clubs.filter(function (c) { return c.id === id; })[0];
    if (!club) return;
    var label = input.value.trim();

    function save(booth) {
      apiFetch("/api/club/" + id, { method: "PUT", body: { booth: booth } }).then(function () {
        club.booth = booth;
        input.value = booth || "";
        input.closest(".bp-row").classList.toggle("cur", !!booth);
        renderMap();
        toast(booth ? (club.name + " → 摊位 " + booth) : ("已清空 " + club.name + " 的摊位"));
      }).catch(function (er) {
        input.value = club.booth || "";
        toast(er.message || "保存失败");
      });
    }

    if (!label) { save(""); return; }
    if (!state._boothBase[label]) {
      input.value = club.booth || "";
      toast("没有 " + label + " 号摊位，请填 1-" + Object.keys(state._boothBase).length);
      return;
    }
    var prev = CONFIG.clubs.filter(function (c) { return c.booth === label && c.id !== id; })[0];
    var doSave = function () { save(label); };
    if (prev) {
      apiFetch("/api/club/" + prev.id, { method: "PUT", body: { booth: "" } }).then(function () {
        prev.booth = ""; doSave();
      }).catch(function (er) { toast(er.message || "腾挪失败"); });
    } else doSave();
  });
}

function renderMap() {
  var box = $("#page-map");
  var imgMode = !!(CONFIG.mapImage && CONFIG.boothLayout);
  var isAdmin = (leadAuth() || {}).role === "admin";
  var unassigned = CONFIG.clubs.filter(function (c) { return !c.booth; });

  var listRows;
  if (imgMode) {
    /* 图底模式：按摊位号排序的索引列表 */
    var assigned = CONFIG.clubs.filter(function (c) { return c.booth; })
      .sort(function (a, b) { return parseInt(a.booth, 10) - parseInt(b.booth, 10); });
    listRows = '<div class="bl-zone"><i></i>摊位对照表 · ' + assigned.length + ' 个社团已分配' +
      (unassigned.length ? '（' + unassigned.length + ' 个待定）' : "") + '</div>' +
      assigned.map(function (c) {
        return '<div class="bl-row" data-club="' + c.id + '">' +
          '<span class="bl-no' + (c.status === "closed" ? " off" : "") + '" style="--zc:' + moduleColor(c) + '">' + esc(c.booth) + '</span>' +
          '<span class="bl-name">' + esc(c.name) + (c.status === "closed" ? ' <em class="bl-closed">已收摊</em>' : "") + '</span>' +
          (isRecommended(c) ? '<span class="bl-love">' + ICONS.heart + '推荐</span>' : "") +
          '<span class="bl-arrow">›</span></div>';
      }).join("");
  } else {
    listRows = (CONFIG.zones || []).map(function (z) {
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
  }

  var mapInner;
  if (imgMode) {
    mapInner = buildVenueImage();
  } else if (CONFIG.mapLayout) {
    mapInner = buildVenueSvg(CONFIG.mapLayout);
  } else {
    mapInner = '<div class="map-stage">🎤 主舞台 · 开幕表演区</div>' +
      '<div class="map-enter">🚩 观众入口 · 签到领取社团手册</div>';
  }

  var legend;
  if (imgMode) {
    legend =
      '<span class="lg" style="--c:#10AC84"><i></i>彩色 = 出摊中（按模块配色）</span>' +
      '<span class="lg" style="--c:#A6ABB2"><i></i>灰色划线 = 已收摊</span>' +
      '<span class="lg" style="--c:#E5484D"><i></i>红圈 = 为你推荐</span>' +
      '<span class="lg" style="--c:#F5B041"><i></i>橙块 = 控台/咨询/医疗/候场</span>';
  } else {
    legend =
      (CONFIG.zones || []).map(function (z) {
        return '<span class="lg" style="--c:' + z.color + '"><i></i>' + z.id + '区 ' + esc(z.name) + '</span>';
      }).join("") +
      '<span class="lg" style="--c:' + INK + '"><i></i>主舞台 / 门头</span>' +
      '<span class="lg" style="--c:#A6ABB2"><i></i>灰色 = 已收摊</span>';
  }

  var layoutBar = imgMode && isAdmin
    ? '<div class="layout-bar" id="layoutBar">' +
      '<button class="lb-btn primary" id="btnLayoutMode">✥ 布局调整</button>' +
      '<button class="lb-btn" id="btnBatchAssign">№ 按社团填号</button>' +
      '<div class="lb-actions hidden" id="lbActions">' +
      '<span class="lb-hint">拖名牌调位置 · 点名牌分配社团</span>' +
      '<button class="lb-btn" id="btnLayoutSave">保存布局</button>' +
      '<button class="lb-btn" id="btnLayoutReset">还原本次</button>' +
      '<button class="lb-btn" id="btnLayoutExit">完成</button></div></div>'
    : "";

  box.innerHTML =
    '<div class="map-search-wrap">' +
    '<div class="search">' + ICONS.search + '<input id="mapSearch" type="text" placeholder="搜社团名 / 标签 / 摊位号，地图定位" autocomplete="off"></div>' +
    '<div class="map-results hidden" id="mapResults"></div>' +
    '</div>' +
    '<div class="map-card">' +
    '<div class="map-title">活动场地地图' + (imgMode ? '<span class="map-badge">真实场馆图 · 可缩放拖动</span>' : '<span class="map-badge">场馆平面图 · 可缩放拖动</span>') + '</div>' +
    '<div class="map-info">' +
    '<span class="info-pill">' + esc(CONFIG.eventDate) + '</span>' +
    '<span class="info-pill">' + esc(CONFIG.location) + '</span>' +
    '</div>' +
    '<div class="legend">' + legend + '</div>' +
    layoutBar +
    '<div class="map-viewport" id="mapViewport"><div class="map-canvas" id="mapCanvas">' + mapInner + '</div></div>' +
    '<div class="map-tools">' +
    '<button class="map-btn" id="zoomIn">＋</button>' +
    '<button class="map-btn" id="zoomOut">−</button>' +
    '<button class="map-btn" id="zoomReset">⟲</button>' +
    '</div>' +
    '<div class="map-note">' +
    (imgMode
      ? '图中圆点为摊位编号（双指/滚轮放大更清晰）：彩色 = 出摊中，灰色划线 = 已收摊，红圈 = 为你推荐。编号对应哪个社团看下方对照表，点击圆点也可直达社团详情。'
      : '当前为仿百团大战的场馆平面图（布局由管理员在 js/data.js 的 MAP_LAYOUT 提前标注，仅作摊位导览、非实时导航）。') +
    '带红圈的是根据你的兴趣推荐的摊位；灰色划线名牌表示该社团已收摊。</div>' +
    '</div>' +
    '<div class="booth-list">' + listRows + '</div>';

  setupMapCanvas();
  setupMapSearch();
  if (imgMode) setupBoothStage();
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
    vp.classList.toggle("map-detail-on", s >= 1.8);
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
    if (state._chipDrag) return; /* 布局模式拖名牌时禁用画布平移 */
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
    if (state._chipDrag) return;
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
  var vp = $("#mapViewport");
  var canvas = $("#mapCanvas");
  if (!vp || !canvas || !state._mapFocus) { openDetail(clubId); return; }

  /* 图底模式：名牌位置是相对 bo-stage 的百分比 */
  if (CONFIG.mapImage && CONFIG.boothLayout) {
    var pct = state._boothPosPct && state._boothPosPct[clubId];
    var stage = $("#boStage");
    if (!stage) { openDetail(clubId); return; }
    var mapImage = stage.querySelector(".bo-img");
    if (mapImage && (!mapImage.complete || !mapImage.naturalWidth)) {
      mapImage.addEventListener("load", function () { zoomToBooth(clubId); }, { once: true });
      return;
    }
    if (!pct) {
      var nb = CONFIG.clubs.filter(function (x) { return x.id === Number(clubId); })[0];
      toast(nb ? "「" + nb.name + "」的摊位待定，分配后可在这里定位" : "该社团摊位待定", 2.5);
      return;
    }
    state._mapFocus(stage.offsetLeft + stage.offsetWidth * pct.x / 100,
      stage.offsetTop + stage.offsetHeight * pct.y / 100, 2.4);
    vp.scrollIntoView({ behavior: "smooth", block: "nearest" });
    var chip = stage.querySelector('[data-club="' + clubId + '"]');
    if (chip) {
      chip.classList.add("flash");
      setTimeout(function () { chip.classList.remove("flash"); }, 3200);
    }
    return;
  }

  var pos = state._boothPos && state._boothPos[clubId];
  var svg = canvas.querySelector(".map-svg");
  if (!svg) { openDetail(clubId); return; }
  if (!pos) {
    var nb2 = CONFIG.clubs.filter(function (x) { return x.id === Number(clubId); })[0];
    toast(nb2 ? "「" + nb2.name + "」的摊位待定，分配后可在这里定位" : "该社团摊位待定", 2.5);
    return;
  }
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
    (c.branches
      ? '<div class="d-sec">社团分部</div><div class="d-branches">' +
        c.branches.map(function (b) {
          return '<button class="branch-btn" data-name="' + esc(b.name) + '" data-desc="' + esc(b.desc || "暂无介绍") + '" data-link="' + esc(b.link || "") + '">' + esc(b.name) + '</button>';
        }).join("") + '</div>'
      : "") +
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
    '<button class="d-btn" id="btnGoMap">' + ICONS.pin + '在地图中查看摊位</button>' +
    '</div>';
  $("#modal").classList.remove("hidden");
  $("#btnCloseDetail").onclick = closeModal;
  /* 分部弹窗（合并自 fly390/-1 分支）：点击分部标签弹出介绍卡片，带链接的分部显示跳转按钮 */
  var oldPop = document.querySelector(".branch-pop");
  if (oldPop) oldPop.remove();
  var popBox = document.createElement("div");
  popBox.className = "branch-pop";
  popBox.innerHTML =
    '<div class="branch-pop-card">' +
    '<h4 id="branchPopTitle"></h4>' +
    '<p id="branchPopDesc"></p>' +
    '<div id="gameBtnWrap" style="display:none">' +
    '<a id="gameLinkBtn" target="_blank" rel="noopener" class="pop-game-btn">进入 Game 部小游戏</a>' +
    '</div>' +
    '<button class="pop-close">关闭</button>' +
    '</div>';
  document.body.appendChild(popBox);
  Array.prototype.forEach.call(document.querySelectorAll(".branch-btn"), function (btn) {
    btn.onclick = function (e) {
      e.stopPropagation();
      document.getElementById("branchPopTitle").textContent = btn.getAttribute("data-name") || "分部介绍";
      document.getElementById("branchPopDesc").textContent = btn.getAttribute("data-desc") || "暂无介绍";
      var link = btn.getAttribute("data-link");
      var gameWrap = document.getElementById("gameBtnWrap");
      if (link) { document.getElementById("gameLinkBtn").href = link; gameWrap.style.display = "block"; }
      else { gameWrap.style.display = "none"; }
      popBox.classList.add("show");
    };
  });
  popBox.querySelector(".pop-close").onclick = function () { popBox.classList.remove("show"); };
  popBox.onclick = function (e) { if (e.target === popBox) popBox.classList.remove("show"); };
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

/* ---------------- 游客端数据同步（负责人改完 ≤20 秒自动生效） ---------------- */
function rerenderCurrent() {
  if (state.enteredMain) switchPage(state.page);
}

function mergeRemoteClubs(list) {
  let changed = false;
  list.forEach(function (rc) {
    var c = CONFIG.clubs.filter(function (x) { return x.id === rc.id; })[0];
    if (!c) return;
    ["name", "slogan", "intro", "activities", "qq", "logo", "status", "photos", "booth", "cat"].forEach(function (k) {
      if (JSON.stringify(c[k]) !== JSON.stringify(rc[k])) { c[k] = rc[k]; changed = true; }
    });
  });
  return changed;
}

function fetchRemote(silent) {
  if (location.protocol === "file:") return;
  fetch("/api/clubs").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.clubs) return;
    /* 摊位布局覆盖（管理员拖动保存的位置） */
    if (j.layout && JSON.stringify(j.layout.positions) !== JSON.stringify(CONFIG.remoteLayout && CONFIG.remoteLayout.positions)) {
      CONFIG.remoteLayout = j.layout;
      if (state.page === "map") { renderMap(); return; }
    }
    if (mergeRemoteClubs(j.clubs) && !silent) rerenderCurrent();
  }).catch(function () { /* 离线兜底：继续用内置数据 */ });
}

setInterval(function () {
  if (document.visibilityState === "visible") fetchRemote(false);
}, 20000);

/* ================= 负责人模式（邀请码登录，无密码） ================= */
var LLS_KEY = "clubfair_leader_auth_v1";
var LEAD_STATUS_TEXT = { open: "出摊中", closed: "已收摊" };

function leadAuth() {
  try { return JSON.parse(localStorage.getItem(LLS_KEY) || "null"); } catch (e) { return null; }
}
function leadSaveAuth(a) {
  try {
    if (a) localStorage.setItem(LLS_KEY, JSON.stringify(a));
    else localStorage.removeItem(LLS_KEY);
  } catch (e) { }
}
function apiFetch(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  var a = leadAuth();
  if (a && a.token) {
    opts.headers.Authorization = "Bearer " + a.token;
    opts.headers["X-Token"] = a.token; /* 双保险：部分反代会剥 Authorization */
  }
  if (opts.body && typeof opts.body !== "string") opts.body = JSON.stringify(opts.body);
  return fetch(path, opts).then(function (r) {
    var ct = r.headers.get("content-type") || "";
    if (ct.indexOf("application/json") < 0) {
      /* 后端不在（纯静态预览/旧版线上）时返回的是 HTML 而不是 JSON */
      throw new Error(r.status === 404 || r.status === 405
        ? "这里没有后端服务：负责人模式需要在部署后的正式环境使用"
        : "服务异常（HTTP " + r.status + "），请稍后再试");
    }
    return r.json().then(function (j) {
      if (!r.ok) throw new Error(j.err || ("HTTP " + r.status));
      return j;
    });
  }, function () {
    throw new Error("网络异常，请检查网络后重试");
  });
}

function showLeader() {
  showScreen("leader");
  var a = leadAuth();
  if (!a || !a.token) { renderLeaderLogin(); return; }
  apiFetch("/api/session").then(function (j) {
    if (j.role === "admin") renderAdminHome();
    else if (j.club) renderLeaderConsole(j.club);
    else { leadSaveAuth(null); renderLeaderLogin("登录状态已失效，请重新登录"); }
  }).catch(function (e) { leadSaveAuth(null); renderLeaderLogin(e.message || "会话校验失败，请重新登录"); });
}

/* --- 登录页 --- */
function renderLeaderLogin(msg) {
  $("#leaderBody").innerHTML =
    '<div class="ld-wrap">' +
    '<div class="ld-kicker">LEADER</div>' +
    '<h2 class="ld-title">负责人入口</h2>' +
    '<p class="ld-sub">输入管理员发放的邀请码，绑定后可管理自己的社团摊位</p>' +
    '<div class="search ld-input"><input id="ldCode" type="text" maxlength="12" placeholder="输入邀请码，如 A3K9QP" autocomplete="off"></div>' +
    '<button class="cta-solid" id="ldLoginBtn">登录</button>' +
    '<div class="ld-err" id="ldErr"></div>' +
    '<button class="ld-back" id="ldBack">‹ 返回游客端</button>' +
    '</div>';
  if (msg) $("#ldErr").textContent = msg;
  $("#ldBack").onclick = function () { history.replaceState(null, "", location.pathname); showScreen("welcome"); };
  $("#ldLoginBtn").onclick = function () {
    var code = $("#ldCode").value.trim();
    if (!code) { $("#ldErr").textContent = "请输入邀请码"; return; }
    $("#ldLoginBtn").textContent = "登录中…";
    $("#ldLoginBtn").disabled = true;
    apiFetch("/api/login", { method: "POST", body: { code: code } }).then(function (j) {
      leadSaveAuth({ token: j.token, role: j.role, clubId: j.clubId });
      showLeader();
    }).catch(function (e) {
      $("#ldErr").textContent = e.message;
      $("#ldLoginBtn").textContent = "登录";
      $("#ldLoginBtn").disabled = false;
    });
  };
  $("#ldCode").addEventListener("keydown", function (e) { if (e.key === "Enter") $("#ldLoginBtn").click(); });
}

/* --- 负责人控制台 --- */
function renderLeaderConsole(club) {
  var closed = club.status === "closed";
  var photos = club.photos || [];
  $("#leaderBody").innerHTML =
    '<div class="ld-wrap">' +
    '<div class="ld-headrow">' +
    '<div class="ld-logo">' + clubLogo(club) + '</div>' +
    '<div class="ld-headmain">' +
    '<div class="ld-name">' + esc(club.name) + '</div>' +
    '<div class="ld-sub2">' + (club.booth ? "摊位 " + esc(club.booth) : "摊位待定（由管理员分配）") + '</div>' +
    '</div>' +
    '<button class="ld-logout" id="ldLogout">退出</button>' +
    '</div>' +
    '<div class="ld-card">' +
    '<div class="ld-row"><span class="ld-label">摊位状态</span>' +
    '<button class="ld-toggle' + (closed ? " off" : "") + '" id="ldToggle"><i></i><span>' + LEAD_STATUS_TEXT[closed ? "closed" : "open"] + '</span></button>' +
    '</div>' +
    '<div class="ld-hint">点击开关，游客端地图几秒内自动变色</div>' +
    '</div>' +
    '<div class="ld-card">' +
    '<div class="ld-label">活动照片（' + photos.length + '/6）</div>' +
    '<div class="ld-photos" id="ldPhotos">' +
    photos.map(function (p, i) {
      return '<div class="ld-photo"><img src="' + esc(p) + '" alt=""><button class="ld-photo-del" data-i="' + i + '">✕</button></div>';
    }).join("") +
    (photos.length < 6
      ? '<button class="ld-photo add" id="ldAddPhoto"><b>＋</b><span>上传</span></button>'
      : "") +
    '</div>' +
    '<div class="ld-hint">从相册选择，自动压缩；游客端详情页立即展示</div>' +
    '</div>' +
    '<button class="ld-menu" id="ldEdit">' +
    '<span>编辑社团信息</span><em>口号 / 介绍 / QQ 群 / 图标</em><i>›</i></button>' +
    '<div class="ld-foot">保存即生效 · 游客端实时同步</div>' +
    '<input type="file" id="ldFile" accept="image/*" multiple style="display:none">' +
    '</div>';

  $("#ldLogout").onclick = function () { leadSaveAuth(null); renderLeaderLogin(); };
  $("#ldToggle").onclick = function () {
    var next = club.status === "closed" ? "open" : "closed";
    this.classList.toggle("off", next === "closed");
    this.querySelector("span").textContent = LEAD_STATUS_TEXT[next];
    apiFetch("/api/club/" + club.id, { method: "PUT", body: { status: next } }).then(function (j) {
      club.status = j.club.status;
      var c = CONFIG.clubs.filter(function (x) { return x.id === club.id; })[0];
      if (c) c.status = club.status;
      toast(next === "open" ? "已设为出摊中" : "已设为已收摊");
    }).catch(function (e) { toast("失败：" + e.message, 2.5); renderLeaderConsole(club); });
  };
  $("#ldEdit").onclick = function () { renderLeaderEditor(club); };
  var addBtn = $("#ldAddPhoto");
  var file = $("#ldFile");
  if (addBtn) addBtn.onclick = function () { file.click(); };
  file.addEventListener("change", function () { leaderUpload(club, file.files); });
  $$("#ldPhotos .ld-photo-del").forEach(function (btn) {
    btn.onclick = function () {
      var i = Number(btn.getAttribute("data-i"));
      var next = photos.slice();
      next.splice(i, 1);
      apiFetch("/api/club/" + club.id, { method: "PUT", body: { photos: next } }).then(function (j) {
        club.photos = j.club.photos;
        var c = CONFIG.clubs.filter(function (x) { return x.id === club.id; })[0];
        if (c) c.photos = j.club.photos;
        renderLeaderConsole(club);
      }).catch(function (e) { toast("失败：" + e.message, 2.5); });
    };
  });
}

function leaderUpload(club, files) {
  if (!files || !files.length) return;
  toast("正在压缩上传…", 8);
  var room = 6 - (club.photos || []).length;
  var picked = Array.prototype.slice.call(files, 0, room);
  var jobs = picked.map(function (f) {
    return compressImage(f).then(function (dataUrl) {
      return apiFetch("/api/upload", { method: "POST", body: { data: dataUrl } }).then(function (j) { return j.url; });
    });
  });
  Promise.all(jobs).then(function (urls) {
    return apiFetch("/api/club/" + club.id, { method: "PUT", body: { photos: (club.photos || []).concat(urls) } });
  }).then(function (j) {
    club.photos = j.club.photos;
    var c = CONFIG.clubs.filter(function (x) { return x.id === club.id; })[0];
    if (c) c.photos = j.club.photos;
    toast("上传成功");
    renderLeaderConsole(club);
  }).catch(function (e) {
    toast("失败：" + e.message, 2.5);
    renderLeaderConsole(club);
  });
}

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var max = 1280;
      var k = Math.min(1, max / Math.max(img.width, img.height));
      var cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
    img.src = url;
  });
}

/* 图标专用：256px + PNG（保留透明底；JPEG 会把透明区域变成黑底） */
function compressLogoIcon(file) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function () {
      var max = 256;
      var k = Math.min(1, max / Math.max(img.width, img.height));
      var cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/png"));
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("图片读取失败")); };
    img.src = url;
  });
}

/* --- 编辑表单 --- */
function renderLeaderEditor(club) {
  var isAdmin = (leadAuth() || {}).role === "admin";
  var logoIsImg = /^\/uploads\//.test(club.logo || "");
  $("#leaderBody").innerHTML =
    '<div class="ld-wrap">' +
    '<div class="ld-headrow">' +
    '<button class="ld-back2" id="ldEdBack">‹</button>' +
    '<div class="ld-name">编辑社团信息</div>' +
    '</div>' +
    '<div class="ld-card form">' +
    '<label class="ld-field"><span>社团名称' + (isAdmin ? "（管理员）" : "（不可修改）") + '</span>' +
    '<input id="ldName" type="text" value="' + esc(club.name) + '" maxlength="20"' + (isAdmin ? "" : " disabled") + '></label>' +
    '<label class="ld-field"><span>一句话口号</span>' +
    '<input id="ldSlogan" type="text" value="' + esc(club.slogan || "") + '" maxlength="60" placeholder="一句话介绍你的社团"></label>' +
    '<div class="ld-field"><span>社团图标</span>' +
    '<div class="ld-logo-row">' +
    '<div class="ld-logo-cur" id="ldLogoCur">' + clubLogo(club) + '</div>' +
    '<div class="ld-logo-main">' +
    '<button type="button" class="ld-logo-btn" id="ldLogoUp">上传图片图标</button>' +
    '<em class="ld-logo-tip">' + (logoIsImg
      ? "已用图片图标，游客端优先显示；输入 emoji 并保存可替换"
      : "方形图片效果最佳，自动压缩；也可直接填 emoji") + '</em>' +
    '</div></div></div>' +
    '<label class="ld-field"><span>emoji 图标（选填）</span>' +
    '<input id="ldLogo" type="text" value="' + (logoIsImg ? "" : esc(club.logo || "")) + '" maxlength="8" placeholder="如 🎸 🏀 🎮"></label>' +
    '<label class="ld-field"><span>咨询 QQ 群</span>' +
    '<input id="ldQq" type="text" value="' + esc(club.qq || "") + '" maxlength="30" placeholder="新生加群用"></label>' +
    '<label class="ld-field"><span>社团介绍</span>' +
    '<textarea id="ldIntro" maxlength="800" rows="5" placeholder="社团简介，游客端详情页展示">' + esc(club.intro || "") + '</textarea></label>' +
    '<label class="ld-field"><span>社团活动（可选）</span>' +
    '<textarea id="ldAct" maxlength="800" rows="3" placeholder="文化节当天/近期举办的活动">' + esc(club.activities || "") + '</textarea></label>' +
    (isAdmin
      ? '<label class="ld-field"><span>摊位号（仅管理员可改）</span>' +
        '<input id="ldBooth" type="text" value="' + esc(club.booth || "") + '" maxlength="12" placeholder="如 B-01"></label>'
      : "") +
    '</div>' +
    '<button class="cta-solid" id="ldSave">保存并同步到游客端</button>' +
    '<div class="ld-err" id="ldErr2"></div>' +
    '<input type="file" id="ldLogoFile" accept="image/*" style="display:none">' +
    '</div>';
  $("#ldEdBack").onclick = function () {
    if (isAdmin) renderAdminHome(); else renderLeaderConsole(club);
  };
  /* 图片图标上传：压缩(256px PNG) → 上传 → 立即生效 */
  var lf = $("#ldLogoFile");
  $("#ldLogoUp").onclick = function () { lf.click(); };
  lf.addEventListener("change", function () {
    var f = lf.files && lf.files[0];
    if (!f) return;
    var btn = $("#ldLogoUp");
    btn.textContent = "上传中…";
    btn.disabled = true;
    compressLogoIcon(f)
      .then(function (dataUrl) { return apiFetch("/api/upload", { method: "POST", body: { data: dataUrl } }); })
      .then(function (j) { return apiFetch("/api/club/" + club.id, { method: "PUT", body: { logo: j.url } }); })
      .then(function (j) {
        Object.assign(club, j.club);
        var c = CONFIG.clubs.filter(function (x) { return x.id === club.id; })[0];
        if (c) c.logo = j.club.logo;
        toast("图标已更新，游客端正在同步");
        renderLeaderEditor(club);
      })
      .catch(function (e) {
        toast("失败：" + e.message, 2.5);
        var b = $("#ldLogoUp");
        if (b) { b.textContent = "上传图片图标"; b.disabled = false; }
      });
  });
  $("#ldSave").onclick = function () {
    var patch = {
      slogan: $("#ldSlogan").value.trim(),
      qq: $("#ldQq").value.trim(),
      intro: $("#ldIntro").value.trim(),
      activities: $("#ldAct").value.trim()
    };
    var logoVal = $("#ldLogo").value.trim();
    if (logoVal) patch.logo = logoVal;                          /* 填了 emoji → 用 emoji */
    else if (!logoIsImg) patch.logo = "";                       /* 原为 emoji 且清空 → 置空 */
    /* 原为图片 URL 且未填 emoji → 不带 logo 字段，保持图片图标 */
    if (isAdmin) { patch.name = $("#ldName").value.trim(); patch.booth = $("#ldBooth").value.trim(); }
    $("#ldSave").textContent = "保存中…";
    $("#ldSave").disabled = true;
    apiFetch("/api/club/" + club.id, { method: "PUT", body: patch }).then(function (j) {
      Object.assign(club, j.club);
      var c = CONFIG.clubs.filter(function (x) { return x.id === club.id; })[0];
      if (c) Object.assign(c, publicize(j.club));
      toast("已保存，游客端正在同步");
      if (isAdmin) renderAdminHome(); else renderLeaderConsole(club);
    }).catch(function (e) {
      $("#ldErr2").textContent = e.message;
      $("#ldSave").textContent = "保存并同步到游客端";
      $("#ldSave").disabled = false;
    });
  };
}

function publicize(c) {
  var o = {};
  ["name", "slogan", "intro", "activities", "qq", "logo", "status", "photos", "booth", "cat"].forEach(function (k) { o[k] = c[k]; });
  return o;
}

/* --- 超管首页：全部社团 + 邀请码管理 --- */
function renderAdminHome() {
  apiFetch("/api/codes").then(function (j) {
    var codes = {};
    j.codes.forEach(function (x) { codes[x.id] = x.code; });
    $("#leaderBody").innerHTML =
      '<div class="ld-wrap">' +
      '<div class="ld-headrow">' +
      '<div class="ld-headmain"><div class="ld-name">管理员面板</div>' +
      '<div class="ld-sub2">可修改所有社团 · 分配摊位 · 管理邀请码</div></div>' +
      '<button class="ld-logout" id="ldLogout">退出</button>' +
      '</div>' +
      '<div class="ld-card">' +
      '<div class="ld-batchrow"><button class="lb-btn primary" id="btnBatchAssign2">№ 按社团填号</button>' +
      '<span class="lb-hint">给各社团/国际展位填 1-' + Object.keys(boothBasePositions()).length + ' 号摊位</span></div>' +
      '<div class="ld-label">社团列表（点击编辑）</div>' +
      dbListHtml(codes) +
      '</div>' +
      '<div class="ld-foot">邀请码请通过私聊发给对应负责人；泄露可点「换码」作废重发</div>' +
      '</div>';
    $("#ldLogout").onclick = function () { leadSaveAuth(null); renderLeaderLogin(); };
    $("#btnBatchAssign2").onclick = openBatchAssign;
    $$("#leaderBody .ld-club-row").forEach(function (row) {
      row.onclick = function () {
        var id = Number(row.getAttribute("data-id"));
        var c = CONFIG.clubs.filter(function (x) { return x.id === id; })[0];
        if (c) renderLeaderEditor(c);
      };
    });
    $$("#leaderBody .ld-regen").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = Number(btn.getAttribute("data-id"));
        apiFetch("/api/code/regen", { method: "POST", body: { clubId: id } }).then(function (r) {
          toast("新邀请码：" + r.code, 4);
          renderAdminHome();
        }).catch(function (er) { toast("失败：" + er.message, 2.5); });
      };
    });
  }).catch(function (e) { renderLeaderLogin(e.message); });
}

function dbListHtml(codes) {
  return CONFIG.clubs.map(function (c) {
    return '<div class="ld-club-row" data-id="' + c.id + '">' +
      '<span class="ld-club-logo">' + clubLogo(c) + '</span>' +
      '<span class="ld-club-name">' + esc(c.name) + (c.status === "closed" ? ' <em>已收摊</em>' : "") + '</span>' +
      '<span class="ld-code">' + esc(codes[c.id] || "----") + '</span>' +
      '<button class="ld-regen" data-id="' + c.id + '">换码</button>' +
      '</div>';
  }).join("");
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
  $("#btnLeader").addEventListener("click", function () {
    if (location.protocol === "file:") {
      toast("负责人模式需要在线环境使用", 2.5);
      return;
    }
    location.hash = "#leader";
    showLeader();
  });
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
    if (e.target.closest(".map-search-wrap")) return;
    var row = e.target.closest(".bl-row[data-club]");
    if (row) {
      zoomToBooth(row.getAttribute("data-club"));
      return;
    }
    if (state.mapMoved) return;
    var target = e.target.closest("[data-club]");
    if (target) openDetail(target.getAttribute("data-club"));
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
  /* 游客端：拉取服务端最新数据（负责人改动 ≤20 秒生效）；带 #leader 直接进负责人模式 */
  if (location.hash === "#leader" && location.protocol !== "file:") showLeader();
  else fetchRemote(true);
}

document.addEventListener("DOMContentLoaded", init);
