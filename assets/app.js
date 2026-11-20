(function () {
  "use strict";

  const DATA = window.HISTORICAL_DATA;
  if (!DATA) {
    document.body.innerHTML = "<p style='padding:24px;color:red'>未能加载 data/families.js，请确认文件完整。</p>";
    return;
  }

  const state = {
    view: "map",
    search: "",
    regionId: "ALL",
    pillar: "ALL",
    evidence: "ALL",
    activeEpoch: "E1",
    activeNetwork: "four_pillars",
    activeEdgeFilter: "ALL",
    selectedNodeId: null,
    activeArtifactCategory: "ALL",
    highlightedArtifactId: null,
    activeTopicId: "T05",
    drawerFamilyId: null,
    drawerPerspective: "both",
    theme: "light"
  };

  const HOT_CHIPS = [
    { label: "全部", value: "" },
    { label: "江西", value: "江西" },
    { label: "佛", value: "佛" },
    { label: "道", value: "道" },
    { label: "儒", value: "儒" },
    { label: "王氏", value: "王氏" },
    { label: "盛宣怀", value: "盛宣怀" },
    { label: "胡雪岩", value: "胡雪岩" },
    { label: "钱氏", value: "钱氏" },
    { label: "名医", value: "名医" },
    { label: "东北王", value: "东北王" },
    { label: "西南王", value: "西南王" },
    { label: "十三行", value: "十三行" }
  ];

  const EDGE_TYPES = {
    ALL: { label: "全部连线", color: "#5C544B" },
    doctrine: { label: "佛道儒与医学法脉", color: "#5E4B73" },
    kinship: { label: "姻亲、师门与幕府", color: "#2B4C59" },
    capital: { label: "资本、票号与离岸流", color: "#9A7B3E" },
    medical_intel: { label: "国药供应与秘线掩护", color: "#9E2A2B" }
  };

  const PILLAR_COLORS = {
    "政权": "#2B4C59",
    "儒": "#7C5836",
    "佛": "#8D6A2F",
    "道": "#5E4B73",
    "商金融": "#9E2A2B",
    "医": "#2F6661"
  };

  const $ = (sel) => document.querySelector(sel);
  const esc = (str) =>
    String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  function init() {
    renderHeaderStats();
    initTheme();
    initNav();
    initFilters();
    renderGeoMap();
    renderFamilyList();
    renderEpochView();
    renderNetworkView();
    renderArtifactsAndTopics();
    renderArchivesAndDebunks();
    initDrawerEvents();
  }

  function renderHeaderStats() {
    const netCount = Object.keys(DATA.networks).length;
    $("#statStrip").innerHTML = [
      `<strong>${DATA.families.length}</strong>家族脉络`,
      `<strong>${DATA.artifacts.length}</strong>关键器物`,
      `<strong>${netCount}</strong>时空交织网`,
      `<strong>${DATA.specialTopics.length}</strong>深度专题`
    ]
      .map((s) => `<span class="stat-chip">${s}</span>`)
      .join("");
  }

  function initTheme() {
    $("#themeToggle").addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", state.theme);
      $("#themeIcon").textContent = state.theme === "dark" ? "☀" : "☾";
      $("#themeLabel").textContent = state.theme === "dark" ? "宣纸亮色" : "墨玉夜间";
    });
  }

  function initNav() {
    document.querySelectorAll(".nav-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchView(btn.dataset.view);
      });
    });
  }

  function switchView(viewId) {
    state.view = viewId;
    document.querySelectorAll(".nav-tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === viewId);
    });
    document.querySelectorAll(".view-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `view-${viewId}`);
    });
  }

  function initFilters() {
    const regionSel = $("#regionSelect");
    regionSel.innerHTML =
      `<option value="ALL">全部 6 大板块（北 → 南）</option>` +
      DATA.regions.map((r) => `<option value="${r.id}">${r.code} · ${r.name}（${r.provinces}）</option>`).join("");

    const hotWrap = $("#hotChips");
    hotWrap.innerHTML = HOT_CHIPS.map(
      (c) => `<button type="button" class="hot-chip ${c.value === "" ? "active" : ""}" data-val="${esc(c.value)}">${esc(c.label)}</button>`
    ).join("");

    hotWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".hot-chip");
      if (!btn) return;
      const val = btn.dataset.val;
      if (val === "佛" || val === "道" || val === "儒") {
        state.pillar = val;
        state.search = "";
        $("#pillarSelect").value = val;
        $("#searchInput").value = "";
      } else {
        state.search = val;
        if (val === "") {
          state.pillar = "ALL";
          state.regionId = "ALL";
          state.evidence = "ALL";
          $("#pillarSelect").value = "ALL";
          $("#regionSelect").value = "ALL";
          $("#evidenceSelect").value = "ALL";
        }
        $("#searchInput").value = val;
      }
      syncHotChips();
      updateView1();
    });

    $("#searchInput").addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      syncHotChips();
      updateView1();
    });

    regionSel.addEventListener("change", (e) => {
      state.regionId = e.target.value;
      updateView1();
    });

    $("#pillarSelect").addEventListener("change", (e) => {
      state.pillar = e.target.value;
      syncHotChips();
      updateView1();
    });

    $("#evidenceSelect").addEventListener("change", (e) => {
      state.evidence = e.target.value;
      updateView1();
    });

    $("#clearFiltersBtn").addEventListener("click", () => {
      state.search = "";
      state.regionId = "ALL";
      state.pillar = "ALL";
      state.evidence = "ALL";
      $("#searchInput").value = "";
      $("#regionSelect").value = "ALL";
      $("#pillarSelect").value = "ALL";
      $("#evidenceSelect").value = "ALL";
      syncHotChips();
      updateView1();
    });
  }

  function syncHotChips() {
    document.querySelectorAll(".hot-chip").forEach((b) => {
      const v = b.dataset.val;
      const active =
        (v === "" && !state.search && state.pillar === "ALL" && state.regionId === "ALL") ||
        (v && (state.search === v || state.pillar === v));
      b.classList.toggle("active", Boolean(active));
    });
  }

  function getFilteredFamilies() {
    const q = state.search.toLowerCase();
    return DATA.families.filter((f) => {
      if (state.regionId !== "ALL" && f.regionId !== state.regionId) return false;
      if (state.pillar !== "ALL" && !f.pillars.includes(state.pillar)) return false;
      if (state.evidence !== "ALL" && f.evidenceLevel !== state.evidence) return false;
      if (!q) return true;
      const hay = [
        f.name,
        f.location,
        f.badge,
        f.summary,
        f.openLine,
        f.darkLine,
        ...f.surnameTags,
        ...f.pillars,
        ...f.categories,
        ...f.darkMechanisms,
        ...f.sources,
        ...(f.timeline || []).map((t) => t.event)
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  function updateView1() {
    renderFamilyList();
    renderGeoMap();
  }

  function renderGeoMap() {
    const svg = $("#geoMapSvg");
    const filteredIds = new Set(getFilteredFamilies().map((f) => f.id));

    const defs = `
      <defs>
        <marker id="arrowSouth" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,1 L7,4 L0,7 Z" fill="#9E2A2B" opacity="0.65"></path>
        </marker>
        <marker id="arrowSea" markerWidth="7" markerHeight="7" refX="4" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#9A7B3E" opacity="0.85"></path>
        </marker>
      </defs>
    `;

    // 纬度标尺与北→南指示线
    const axis = `
      <g opacity="0.72">
        <line x1="42" y1="45" x2="42" y2="555" stroke="#9E2A2B" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arrowSouth)"></line>
        <text x="16" y="64" font-size="11" fill="var(--ink-muted)" font-weight="700">北 48°</text>
        <text x="16" y="185" font-size="11" fill="var(--ink-muted)">北 39°</text>
        <text x="16" y="315" font-size="11" fill="var(--ink-muted)">中 30°</text>
        <text x="16" y="475" font-size="11" fill="var(--ink-muted)">南 22°</text>
        <text x="14" y="575" font-size="10.5" fill="var(--dark-crimson)" font-weight="700">北→南空间轴</text>
      </g>
    `;

    // 黄河与长江水系淡纹 + 海上虚线出海弧
    const riversAndArcs = `
      <g fill="none">
        <path d="M 160 228 Q 280 250 370 212 T 490 228" stroke="#9A7B3E" stroke-width="1.5" opacity="0.35"></path>
        <path d="M 175 362 Q 305 385 405 335 T 558 310" stroke="#2B4C59" stroke-width="1.8" opacity="0.35"></path>
        <path d="M 555 312 Q 615 260 652 215" stroke="#9A7B3E" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#arrowSea)"></path>
        <path d="M 435 488 Q 510 535 645 505" stroke="#9A7B3E" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#arrowSea)"></path>
        <path d="M 435 488 Q 495 470 530 456" stroke="#9E2A2B" stroke-width="1.3" stroke-dasharray="3 3"></path>
        <text x="582" y="212" font-size="10" fill="#9A7B3E" font-weight="700">沪→日美欧</text>
        <text x="565" y="532" font-size="10" fill="#9A7B3E" font-weight="700">粤港澳→南洋/欧美</text>
        <text x="536" y="476" font-size="10" fill="#9E2A2B">台</text>
      </g>
    `;

    const regionsSvg = DATA.regions
      .map((r) => {
        const isSelected = state.regionId === r.id;
        return `
          <g class="region-group-svg" data-region="${r.id}">
            <rect class="region-rect" x="${r.box.x}" y="${r.box.y}" width="${r.box.w}" height="${r.box.h}" rx="12"
              fill="${r.color}" fill-opacity="${isSelected ? "0.24" : "0.11"}"
              stroke="${r.color}" stroke-width="${isSelected ? "2.4" : "1.2"}" stroke-dasharray="${isSelected ? "none" : "4 2"}"></rect>
            <text x="${r.labelPos.x}" y="${r.labelPos.y}" text-anchor="middle" font-size="12" font-weight="700" fill="${r.color}">${r.code} · ${r.name}</text>
          </g>
        `;
      })
      .join("");

    // 江西局部高亮框（在 R3 内部突出龙虎山/云居山/庐山/樟树）
    const jxHighlight = `
      <g opacity="0.88">
        <rect x="392" y="318" width="70" height="66" rx="8" fill="#5E4B73" fill-opacity="0.08" stroke="#5E4B73" stroke-width="1" stroke-dasharray="2 2"></rect>
        <text x="427" y="395" text-anchor="middle" font-size="9.5" fill="#5E4B73" font-weight="700">江西佛道儒医十字枢</text>
      </g>
    `;

    const pinsSvg = DATA.families
      .map((f) => {
        const matched = filteredIds.has(f.id);
        const pinColor = PILLAR_COLORS[f.pillars[0]] || "#9E2A2B";
        return `
          <g class="map-pin ${matched ? "" : "dimmed"}" data-id="${f.id}" transform="translate(${f.mapPos.x},${f.mapPos.y})">
            <circle r="8.5" fill="${pinColor}" stroke="#FDFBF7" stroke-width="1.6"></circle>
            <text y="3.2" text-anchor="middle" font-size="8.5" font-weight="700" fill="#FDFBF7">${String(f.northToSouthOrder).padStart(2, "0")}</text>
          </g>
        `;
      })
      .join("");

    svg.innerHTML = defs + axis + riversAndArcs + regionsSvg + jxHighlight + pinsSvg;

    svg.querySelectorAll(".region-group-svg").forEach((g) => {
      g.addEventListener("click", () => {
        const rid = g.dataset.region;
        state.regionId = state.regionId === rid ? "ALL" : rid;
        $("#regionSelect").value = state.regionId;
        updateView1();
      });
    });

    const tooltip = $("#mapTooltip");
    svg.querySelectorAll(".map-pin").forEach((pin) => {
      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        openDrawer(pin.dataset.id);
      });
      pin.addEventListener("mouseenter", (e) => {
        const f = DATA.families.find((x) => x.id === pin.dataset.id);
        if (!f) return;
        tooltip.innerHTML = `<strong>#${String(f.northToSouthOrder).padStart(2, "0")} ${esc(f.name)}</strong><br>${esc(f.location)} · ${esc(f.pillars.join("/"))}`;
        tooltip.classList.remove("hidden");
        const rect = $("#geoMapWrap").getBoundingClientRect();
        tooltip.style.left = `${Math.min(rect.width - 210, Math.max(8, e.clientX - rect.left + 12))}px`;
        tooltip.style.top = `${Math.max(8, e.clientY - rect.top - 20)}px`;
      });
      pin.addEventListener("mouseleave", () => {
        tooltip.classList.add("hidden");
      });
    });
  }

  function renderFamilyList() {
    const filtered = getFilteredFamilies();
    $("#resultCounter").textContent = `当前显示 ${filtered.length} / ${DATA.families.length} 个家族与精神脉络`;

    const container = $("#familyListContainer");
    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state">未命中匹配的家族或线索，请尝试清空筛选条件或改用“江西”“王氏”“名医”“道”等词。</div>`;
      return;
    }

    const html = DATA.regions
      .map((region) => {
        const items = filtered.filter((f) => f.regionId === region.id);
        if (items.length === 0) return "";
        return `
          <div class="region-group">
            <div class="region-header">
              <h3>${region.code} · ${region.name}（${items.length}）</h3>
              <span class="region-provinces">${region.provinces}</span>
              <p class="region-feature">${esc(region.feature)}</p>
            </div>
            <div class="family-cards-grid">
              ${items.map(renderFamilyCard).join("")}
            </div>
          </div>
        `;
      })
      .join("");

    container.innerHTML = html;
    container.querySelectorAll(".family-card").forEach((card) => {
      card.addEventListener("click", () => openDrawer(card.dataset.id));
    });
  }

  function renderFamilyCard(f) {
    const orderText = `#${String(f.northToSouthOrder).padStart(2, "0")}`;
    const evClass = f.evidenceLevel === "档案确证" ? "" : "oral";
    return `
      <article class="family-card" data-id="${f.id}">
        <div class="fc-top">
          <span class="order-num">${orderText}</span>
          <span class="fc-location">${esc(f.location)}</span>
          <span class="ev-badge ${evClass}">${esc(f.evidenceLevel)}</span>
        </div>
        <div class="fc-title-row">
          <h4 class="fc-title">${esc(f.name)}</h4>
          <span class="fc-badge">${esc(f.badge)}</span>
        </div>
        <div class="pillar-row">
          ${f.pillars.map((p) => `<span class="pillar-tag">${esc(p)}</span>`).join("")}
        </div>
        <p class="fc-summary">${esc(f.summary)}</p>
        <div class="dual-preview">
          <div class="line-snippet open"><strong>【明】</strong>${esc(f.openLine)}</div>
          <div class="line-snippet dark"><strong>【暗】</strong>${esc(f.darkLine)}</div>
        </div>
        <div class="fc-footer">
          <div class="dest-chips">
            ${f.branches1949.map((b) => `<span class="dest-chip">${esc(b.dest)}</span>`).join("")}
          </div>
          <span class="artifact-mini">器物×${f.linkedArtifactIds.length} · 点击详考 →</span>
        </div>
      </article>
    `;
  }

  /* 视图 2：乾隆编年 */
  function renderEpochView() {
    const tabsWrap = $("#epochTabs");
    tabsWrap.innerHTML = DATA.epochs
      .map(
        (ep) => `
      <button type="button" class="epoch-tab ${state.activeEpoch === ep.id ? "active" : ""}" data-epoch="${ep.id}">
        <span class="et-span">${esc(ep.span)}</span>
        <span class="et-title">${esc(ep.label)}</span>
      </button>
    `
      )
      .join("");

    tabsWrap.querySelectorAll(".epoch-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeEpoch = btn.dataset.epoch;
        renderEpochView();
      });
    });

    const ep = DATA.epochs.find((e) => e.id === state.activeEpoch) || DATA.epochs[0];
    $("#epochBanner").innerHTML = `
      <h2>${esc(ep.title)}</h2>
      <p style="margin:0;color:var(--ink-muted);font-size:14px">${esc(ep.summary)}</p>
      <ul class="milestone-list">
        ${ep.milestones.map((m) => `<li>${esc(m)}</li>`).join("")}
      </ul>
    `;

    const regionMap = Object.fromEntries(DATA.regions.map((r) => [r.id, r]));
    $("#timelineMatrix").innerHTML = DATA.families
      .map((f) => {
        const item = f.timeline.find((t) => t.epochId === ep.id) || f.timeline[0];
        const r = regionMap[f.regionId];
        return `
          <div class="tm-card" data-id="${f.id}">
            <div class="tm-meta">
              <span>#${String(f.northToSouthOrder).padStart(2, "0")} · ${esc(r.code)} ${esc(r.name)}</span>
              <span>${esc(f.pillars.join(" / "))}</span>
            </div>
            <h4>${esc(f.name)}</h4>
            <span class="tm-period">${esc(item.period)}</span>
            <p class="tm-event">${esc(item.event)}</p>
          </div>
        `;
      })
      .join("");

    $("#timelineMatrix").querySelectorAll(".tm-card").forEach((c) => {
      c.addEventListener("click", () => openDrawer(c.dataset.id));
    });
  }

  /* 视图 3：时空交织网 */
  function renderNetworkView() {
    const netList = Object.values(DATA.networks);
    const tabsWrap = $("#networkSubtabs");
    tabsWrap.innerHTML = netList
      .map(
        (n) => `
      <button type="button" class="net-tab ${state.activeNetwork === n.id ? "active" : ""}" data-net="${n.id}">${esc(n.title)}</button>
    `
      )
      .join("");

    tabsWrap.querySelectorAll(".net-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeNetwork = btn.dataset.net;
        state.selectedNodeId = null;
        renderNetworkView();
      });
    });

    const edgeLegend = $("#edgeLegendRow");
    edgeLegend.innerHTML =
      `<span style="color:var(--ink-muted)">连线类型过滤：</span>` +
      Object.entries(EDGE_TYPES)
        .map(
          ([k, info]) => `
        <button type="button" class="edge-filter-btn ${state.activeEdgeFilter === k ? "active" : ""}" data-edge="${k}">
          <span class="dot" style="background:${info.color}"></span>${info.label}
        </button>
      `
        )
        .join("");

    edgeLegend.querySelectorAll(".edge-filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeEdgeFilter = btn.dataset.edge;
        renderNetworkView();
      });
    });

    const net = DATA.networks[state.activeNetwork];
    $("#networkTitle").textContent = net.title;
    $("#networkDesc").textContent = net.description;

    if (!state.selectedNodeId || !net.nodes.some((n) => n.id === state.selectedNodeId)) {
      state.selectedNodeId = net.nodes[0].id;
    }

    drawNetworkSvg(net);
    renderNetworkInspector(net);
  }

  function drawNetworkSvg(net) {
    const svg = $("#networkSvg");
    const nodeMap = Object.fromEntries(net.nodes.map((n) => [n.id, n]));
    const selId = state.selectedNodeId;

    const visibleEdges = net.edges.filter((e) => state.activeEdgeFilter === "ALL" || e.type === state.activeEdgeFilter);
    const connectedNodeIds = new Set([selId]);
    visibleEdges.forEach((e) => {
      if (e.source === selId) connectedNodeIds.add(e.target);
      if (e.target === selId) connectedNodeIds.add(e.source);
    });

    const edgesSvg = visibleEdges
      .map((e) => {
        const s = nodeMap[e.source];
        const t = nodeMap[e.target];
        if (!s || !t) return "";
        const isHit = e.source === selId || e.target === selId;
        const color = (EDGE_TYPES[e.type] && EDGE_TYPES[e.type].color) || "#9A7B3E";
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2 - 22;
        return `
          <path class="net-edge" d="M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}"
            fill="none" stroke="${color}"
            stroke-width="${isHit ? "2.8" : "1.4"}"
            stroke-opacity="${isHit ? "0.95" : "0.28"}"
            stroke-dasharray="${e.type === "medical_intel" ? "5 3" : "none"}"></path>
        `;
      })
      .join("");

    const nodesSvg = net.nodes
      .map((n) => {
        const isSel = n.id === selId;
        const isConn = connectedNodeIds.has(n.id);
        const color = PILLAR_COLORS[n.pillar] || "#9E2A2B";
        const opacity = isConn ? "1" : "0.35";
        const w = Math.max(122, n.label.length * 10 + 18);
        return `
          <g class="net-node" data-nid="${n.id}" opacity="${opacity}" transform="translate(${n.x},${n.y})">
            <circle r="${isSel ? "22" : "18"}" fill="${color}" stroke="${isSel ? "#D1AE65" : "#FDFBF7"}" stroke-width="${isSel ? "3.5" : "2"}"></circle>
            <text y="4" text-anchor="middle" font-size="11" font-weight="700" fill="#FDFBF7">${esc(n.pillar)}</text>
            <rect x="${-w / 2}" y="23" width="${w}" height="21" rx="5" fill="var(--surface)" stroke="${isSel ? color : "var(--line-strong)"}" stroke-width="${isSel ? "1.6" : "1"}"></rect>
            <text y="37" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--ink)">${esc(n.label)}</text>
          </g>
        `;
      })
      .join("");

    svg.innerHTML = edgesSvg + nodesSvg;

    svg.querySelectorAll(".net-node").forEach((g) => {
      g.addEventListener("click", () => {
        state.selectedNodeId = g.dataset.nid;
        drawNetworkSvg(net);
        renderNetworkInspector(net);
      });
    });
  }

  function renderNetworkInspector(net) {
    const node = net.nodes.find((n) => n.id === state.selectedNodeId) || net.nodes[0];
    const nodeMap = Object.fromEntries(net.nodes.map((n) => [n.id, n]));
    const relatedEdges = net.edges.filter((e) => e.source === node.id || e.target === node.id);

    const linksHtml = relatedEdges
      .map((e) => {
        const otherId = e.source === node.id ? e.target : e.source;
        const other = nodeMap[otherId];
        const dir = e.source === node.id ? "→ 关联" : "← 承接";
        const et = EDGE_TYPES[e.type] ? EDGE_TYPES[e.type].label : e.type;
        return `<li><strong>${dir} ${esc(other ? other.label : otherId)}</strong>（${esc(et)}）<br><span style="color:var(--ink-muted)">${esc(e.label)}</span></li>`;
      })
      .join("");

    const fam = DATA.families.find((f) => f.id === node.familyId);
    const art = DATA.artifacts.find((a) => a.id === node.artifactId);

    $("#networkInspector").innerHTML = `
      <span class="pillar-tag">${esc(node.pillar)} · ${esc(node.role)}</span>
      <h3 class="ni-title">${esc(node.label)}</h3>
      <div class="ni-block">
        <strong>【事 · 关键转折】</strong><br>${esc(node.event)}
      </div>
      <div class="ni-block" style="border-left:3px solid var(--gold)">
        <strong>【物 · 核心信物/机构】</strong><br>${esc(node.objectTag)}${art ? `（关联库藏：${esc(art.name)}）` : ""}
      </div>
      <h4 style="margin:12px 0 4px;font-family:var(--font-serif)">时空交织连线（${relatedEdges.length} 条）</h4>
      <ul class="ni-links">${linksHtml || "<li>暂无关联边</li>"}</ul>
      <div class="ni-actions">
        ${fam ? `<button type="button" class="btn-primary" id="insOpenFam">查看家族考据：${esc(fam.name.slice(0, 12))}…</button>` : ""}
        ${art ? `<button type="button" class="btn-secondary" id="insJumpArt">查看器物锚点</button>` : ""}
      </div>
    `;

    const btnFam = $("#insOpenFam");
    if (btnFam && fam) btnFam.addEventListener("click", () => openDrawer(fam.id));
    const btnArt = $("#insJumpArt");
    if (btnArt && art) btnArt.addEventListener("click", () => jumpToArtifact(art.id));
  }

  /* 视图 4：器物信物与五大专题 */
  function renderArtifactsAndTopics() {
    const cats = ["ALL", "信物", "档案", "商号金融", "典籍建筑"];
    $("#artifactCatFilters").innerHTML = cats
      .map(
        (c) => `
      <button type="button" class="hot-chip ${state.activeArtifactCategory === c ? "active" : ""}" data-cat="${c}">
        ${c === "ALL" ? "全部器物（12）" : c}
      </button>
    `
      )
      .join("");

    $("#artifactCatFilters").querySelectorAll(".hot-chip").forEach((b) => {
      b.addEventListener("click", () => {
        state.activeArtifactCategory = b.dataset.cat;
        state.highlightedArtifactId = null;
        renderArtifactsAndTopics();
      });
    });

    const famMap = Object.fromEntries(DATA.families.map((f) => [f.id, f]));
    const filteredArts = DATA.artifacts.filter(
      (a) => state.activeArtifactCategory === "ALL" || a.category === state.activeArtifactCategory
    );

    $("#artifactsGrid").innerHTML = filteredArts
      .map(
        (a) => `
      <article class="artifact-card ${state.highlightedArtifactId === a.id ? "highlighted" : ""}" id="art-${a.id}">
        <div class="fc-top">
          <span class="order-num">${esc(a.id)} · ${esc(a.category)}</span>
          <span class="fc-location">${esc(a.era)}</span>
          <span class="ev-badge">${esc(a.evidenceLevel)}</span>
        </div>
        <h3>${esc(a.name)}</h3>
        <div style="font-size:12px;color:var(--ink-muted)">空间锚点：${esc(a.location)}</div>
        <p style="margin:0;font-size:13.5px">${esc(a.description)}</p>
        <div class="art-sig"><strong>串联历史事件（事）：</strong>${esc(a.linkedEvents)}<br><strong>实证意义：</strong>${esc(a.significance)}</div>
        <div class="link-pills">
          ${a.linkedFamilyIds
            .map((fid) => {
              const f = famMap[fid];
              return f ? `<button type="button" class="link-pill-btn" data-fid="${fid}">#${String(f.northToSouthOrder).padStart(2, "0")} ${esc(f.name.split("（")[0])}</button>` : "";
            })
            .join("")}
        </div>
      </article>
    `
      )
      .join("");

    $("#artifactsGrid").querySelectorAll(".link-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => openDrawer(btn.dataset.fid));
    });

    // 五大纵深专题
    $("#topicTabs").innerHTML = DATA.specialTopics
      .map(
        (t) => `
      <button type="button" class="net-tab ${state.activeTopicId === t.id ? "active" : ""}" data-tid="${t.id}">${esc(t.title)}</button>
    `
      )
      .join("");

    $("#topicTabs").querySelectorAll(".net-tab").forEach((b) => {
      b.addEventListener("click", () => {
        state.activeTopicId = b.dataset.tid;
        renderArtifactsAndTopics();
      });
    });

    const activeTopic = DATA.specialTopics.find((t) => t.id === state.activeTopicId) || DATA.specialTopics[0];
    $("#topicReader").innerHTML = `
      <div class="fc-top" style="margin-bottom:6px">
        <span class="ev-badge">${esc(activeTopic.evidenceLevel)}</span>
        <code>${esc(activeTopic.docPath)}</code>
      </div>
      <h3>${esc(activeTopic.title)}</h3>
      <p style="margin:0;color:var(--ink-muted);font-size:14px">${esc(activeTopic.subtitle)}</p>
      <div class="topic-thesis"><strong>核心命题：</strong>${esc(activeTopic.keyThesis)}</div>
      <div class="topic-sec-grid">
        ${activeTopic.sections
          .map(
            (s) => `
          <div class="topic-sec-box">
            <h4>${esc(s.heading)}</h4>
            <p style="margin:0;font-size:13.5px">${esc(s.text)}</p>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  function jumpToArtifact(artifactId) {
    state.activeArtifactCategory = "ALL";
    state.highlightedArtifactId = artifactId;
    closeDrawer();
    switchView("artifacts");
    renderArtifactsAndTopics();
    setTimeout(() => {
      const el = document.getElementById(`art-${artifactId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  /* 视图 5：一手档案与辨伪台 */
  function renderArchivesAndDebunks() {
    $("#archivesGrid").innerHTML = DATA.archives
      .map(
        (ar) => `
      <article class="archive-card">
        <div class="fc-top">
          <span class="order-num">${esc(ar.id)}</span>
          <span class="fc-location">${esc(ar.location)}</span>
        </div>
        <h4>${esc(ar.name)}</h4>
        <p style="margin:0 0 6px;font-size:13px"><strong>馆藏规模：</strong>${esc(ar.scope)}</p>
        <p style="margin:0 0 6px;font-size:13px;color:var(--open-indigo)"><strong>对应家族：</strong>${esc(ar.targetFamilies)}</p>
        <p style="margin:0;font-size:12.5px;color:var(--ink-muted)"><strong>检索提示：</strong>${esc(ar.accessNote)}</p>
      </article>
    `
      )
      .join("");

    const famMap = Object.fromEntries(DATA.families.map((f) => [f.id, f]));
    $("#debunksGrid").innerHTML = DATA.debunks
      .map(
        (d) => `
      <article class="debunk-card">
        <div class="fc-top">
          <span class="order-num">${esc(d.id)} 史料辨伪</span>
          <span class="ev-badge">${esc(d.evidenceLevel)}</span>
        </div>
        <div class="debunk-rumor"><strong>【民间传闻】</strong>${esc(d.rumor)}</div>
        <div class="debunk-truth"><strong>【实证档案辨伪】</strong>${esc(d.truth)}</div>
        <div class="link-pills">
          ${d.relatedIds
            .map((fid) => {
              const f = famMap[fid];
              return f ? `<button type="button" class="link-pill-btn" data-fid="${fid}">核验：${esc(f.name.split("（")[0])}</button>` : "";
            })
            .join("")}
        </div>
      </article>
    `
      )
      .join("");

    $("#debunksGrid").querySelectorAll(".link-pill-btn").forEach((btn) => {
      btn.addEventListener("click", () => openDrawer(btn.dataset.fid));
    });
  }

  /* 侧滑考据抽屉 */
  function initDrawerEvents() {
    $("#closeDrawerBtn").addEventListener("click", closeDrawer);
    $("#drawerOverlay").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && state.drawerFamilyId) closeDrawer();
    });
    $("#perspectiveToggle").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      state.drawerPerspective = btn.dataset.mode;
      $("#perspectiveToggle").querySelectorAll("button").forEach((b) => {
        b.classList.toggle("active", b.dataset.mode === state.drawerPerspective);
      });
      renderDrawerBody();
    });
  }

  function openDrawer(familyId) {
    state.drawerFamilyId = familyId;
    const f = DATA.families.find((x) => x.id === familyId);
    if (!f) return;
    const r = DATA.regions.find((x) => x.id === f.regionId);
    $("#drawerHeaderMeta").innerHTML = `
      <div class="seal-row" style="margin-bottom:4px">
        <span class="order-num">#${String(f.northToSouthOrder).padStart(2, "0")}</span>
        <span class="meta-pill">${r ? `${esc(r.code)} · ${esc(r.name)}` : ""}</span>
        <span class="ev-badge">${esc(f.evidenceLevel)}</span>
      </div>
      <h2 style="margin:0;font-family:var(--font-serif);font-size:20px">${esc(f.name)}</h2>
      <div style="font-size:12.5px;color:var(--ink-muted);margin-top:2px">${esc(f.location)} ｜ 核心标签：${esc(f.surnameTags.join(" · "))}</div>
    `;
    renderDrawerBody();
    $("#drawerOverlay").classList.remove("hidden");
    $("#detailDrawer").classList.remove("hidden");
    $("#detailDrawer").setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    state.drawerFamilyId = null;
    $("#drawerOverlay").classList.add("hidden");
    $("#detailDrawer").classList.add("hidden");
    $("#detailDrawer").setAttribute("aria-hidden", "true");
  }

  function renderDrawerBody() {
    const f = DATA.families.find((x) => x.id === state.drawerFamilyId);
    if (!f) return;
    const mode = state.drawerPerspective;
    const showOpen = mode === "both" || mode === "open";
    const showDark = mode === "both" || mode === "dark";
    const artMap = Object.fromEntries(DATA.artifacts.map((a) => [a.id, a]));

    $("#drawerBody").innerHTML = `
      <div class="pillar-row">
        ${f.pillars.map((p) => `<span class="pillar-tag">${esc(p)}脉络</span>`).join("")}
        ${f.darkMechanisms.map((m) => `<span class="meta-pill">暗线机制：${esc(m)}</span>`).join("")}
      </div>

      <p style="margin:0;font-size:14px">${esc(f.summary)}</p>

      <div class="drawer-dual-grid ${mode !== "both" ? "single-col" : ""}">
        ${
          showOpen
            ? `<div class="line-box open">
                <h4>【明线 · 正史与显性建制】</h4>
                <p style="margin:0">${esc(f.openLine)}</p>
              </div>`
            : ""
        }
        ${
          showDark
            ? `<div class="line-box dark">
                <h4>【暗线 · 隐性网络与跨界避险】</h4>
                <p style="margin:0">${esc(f.darkLine)}</p>
              </div>`
            : ""
        }
      </div>

      <div class="drawer-section">
        <h4>乾隆至今四阶段演化坐标（1736—今）</h4>
        <div class="tl-steps">
          ${f.timeline
            .map(
              (t) => `
            <div class="tl-step">
              <strong style="color:var(--gold)">${esc(t.epochId)} · ${esc(t.period)}</strong>
              <span>${esc(t.event)}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="drawer-section">
        <h4>1949 年前后四向分流格局</h4>
        <div class="branch-grid">
          ${f.branches1949
            .map(
              (b) => `
            <div class="branch-item">
              <strong style="color:var(--dark-crimson)">${esc(b.dest)}</strong>
              <p style="margin:4px 0 0">${esc(b.desc)}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <div class="drawer-section">
        <h4>关联器物信物（“物”之交叉索引）</h4>
        <div class="link-pills">
          ${f.linkedArtifactIds
            .map((aid) => {
              const a = artMap[aid];
              return a ? `<button type="button" class="btn-secondary drawer-art-btn" data-aid="${aid}">${esc(aid)} · ${esc(a.name)}</button>` : "";
            })
            .join("")}
        </div>
      </div>

      <div class="drawer-section">
        <h4>可核验一手史料来源</h4>
        <ul style="margin:0;padding-left:18px;font-size:13px">
          ${f.sources.map((s) => `<li>${esc(s)}</li>`).join("")}
        </ul>
      </div>

      ${f.debunkNote ? `<div class="debunk-callout"><strong>【史料辨伪注】</strong>${esc(f.debunkNote)}</div>` : ""}
    `;

    $("#drawerBody").querySelectorAll(".drawer-art-btn").forEach((btn) => {
      btn.addEventListener("click", () => jumpToArtifact(btn.dataset.aid));
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
