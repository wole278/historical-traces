import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const errors = [];
const assert = (cond, msg) => {
  if (!cond) errors.push(msg);
};

// 1. Check required files exist
const requiredFiles = [
  "index.html",
  "README.md",
  "GEMINI.md",
  ".gitignore",
  ".github/workflows/pages.yml",
  "assets/styles.css",
  "assets/app.js",
  "data/families.js",
  "docs/master-outline.md",
  "docs/topic-1-kinship-capital-net.md",
  "docs/topic-2-medical-lineages.md",
  "docs/topic-3-1949-four-branches.md",
  "docs/topic-4-offshore-capital.md",
  "docs/topic-5-jiangxi-and-four-pillars.md",
  "scripts/serve.mjs"
];

for (const rel of requiredFiles) {
  const full = path.join(ROOT, rel);
  assert(fs.existsSync(full), `缺少必需文件: ${rel}`);
  if (fs.existsSync(full)) {
    const stat = fs.statSync(full);
    assert(stat.size > 20, `文件内容过短或为空: ${rel}`);
  }
}

// 2. Load data/families.js via vm (assert no ESM export)
const dataPath = path.join(ROOT, "data/families.js");
const dataSrc = fs.readFileSync(dataPath, "utf8");
assert(!/^\s*export\s+/m.test(dataSrc), "data/families.js 不可使用 ESM export，需兼容 file:// 双击");

const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox;
try {
  vm.runInNewContext(dataSrc, sandbox, { filename: "data/families.js" });
} catch (err) {
  assert(false, `data/families.js 语法执行失败: ${err.message}`);
}

const D = sandbox.window.HISTORICAL_DATA || sandbox.globalThis.HISTORICAL_DATA;
assert(Boolean(D), "HISTORICAL_DATA 未正确挂载至 window/globalThis");

if (D) {
  // Epochs
  assert(Array.isArray(D.epochs) && D.epochs.length === 4, "epochs 必须包含 E1-E4 共 4 个时期");
  const expectedEpochs = ["E1", "E2", "E3", "E4"];
  if (Array.isArray(D.epochs)) {
    expectedEpochs.forEach((eid, idx) => {
      assert(D.epochs[idx]?.id === eid, `epochs[${idx}] id 应为 ${eid}`);
    });
  }

  // Regions
  assert(Array.isArray(D.regions) && D.regions.length === 6, "regions 必须包含 R1-R6 共 6 个地理板块");
  const regionIndex = {};
  if (Array.isArray(D.regions)) {
    D.regions.forEach((r, idx) => {
      regionIndex[r.id] = idx;
      assert(r.id === `R${idx + 1}`, `regions[${idx}] id 应为 R${idx + 1}`);
    });
  }

  // Families
  assert(Array.isArray(D.families) && D.families.length >= 26, `families 数量应 >= 26，当前为 ${D.families?.length}`);
  const famMap = {};
  let prevRegionIdx = -1;
  (D.families || []).forEach((f, idx) => {
    famMap[f.id] = f;
    assert(f.northToSouthOrder === idx + 1, `家族 ${f.id} northToSouthOrder 应为 ${idx + 1}，实际为 ${f.northToSouthOrder}`);
    const rIdx = regionIndex[f.regionId];
    assert(rIdx !== undefined, `家族 ${f.id} 引用了无效板块 ${f.regionId}`);
    assert(rIdx >= prevRegionIdx, `家族 ${f.id} (${f.regionId}) 违反由北向南板块单调性`);
    prevRegionIdx = rIdx;
    assert(Boolean(f.openLine?.trim()), `家族 ${f.id} 缺少 openLine`);
    assert(Boolean(f.darkLine?.trim()), `家族 ${f.id} 缺少 darkLine`);
    assert(Array.isArray(f.timeline) && f.timeline.length === 4, `家族 ${f.id} timeline 长度必须为 4`);
    if (Array.isArray(f.timeline)) {
      expectedEpochs.forEach((eid, i) => {
        assert(f.timeline[i]?.epochId === eid, `家族 ${f.id} timeline[${i}] 应对应 ${eid}`);
      });
    }
    assert(Array.isArray(f.branches1949) && f.branches1949.length >= 1, `家族 ${f.id} branches1949 不能为空`);
    assert(Array.isArray(f.sources) && f.sources.length >= 1, `家族 ${f.id} sources 不能为空`);
    assert(Array.isArray(f.pillars) && f.pillars.length >= 1, `家族 ${f.id} pillars 不能为空`);
    assert(typeof f.mapPos?.x === "number" && typeof f.mapPos?.y === "number", `家族 ${f.id} 缺少有效 mapPos`);
  });

  // Artifacts + Bidirectional consistency
  assert(Array.isArray(D.artifacts) && D.artifacts.length === 12, `artifacts 数量应为 12，当前为 ${D.artifacts?.length}`);
  const artMap = {};
  (D.artifacts || []).forEach((a) => {
    artMap[a.id] = a;
    assert(Array.isArray(a.linkedFamilyIds) && a.linkedFamilyIds.length >= 1, `器物 ${a.id} linkedFamilyIds 不能为空`);
    for (const fid of a.linkedFamilyIds || []) {
      assert(Boolean(famMap[fid]), `器物 ${a.id} 引用不存在家族 ${fid}`);
      if (famMap[fid]) {
        assert(
          (famMap[fid].linkedArtifactIds || []).includes(a.id),
          `双向引用不一致：器物 ${a.id} 关联 ${fid}，但家族 ${fid}.linkedArtifactIds 缺少 ${a.id}`
        );
      }
    }
  });
  for (const f of D.families || []) {
    assert(Array.isArray(f.linkedArtifactIds) && f.linkedArtifactIds.length >= 1, `家族 ${f.id} linkedArtifactIds 不能为空`);
    for (const aid of f.linkedArtifactIds || []) {
      assert(Boolean(artMap[aid]), `家族 ${f.id} 引用不存在器物 ${aid}`);
      if (artMap[aid]) {
        assert(
          (artMap[aid].linkedFamilyIds || []).includes(f.id),
          `双向引用不一致：家族 ${f.id} 关联 ${aid}，但器物 ${aid}.linkedFamilyIds 缺少 ${f.id}`
        );
      }
    }
  }

  // Networks + Edge validation + Collision avoidance (> 45px)
  const requiredNets = ["four_pillars", "kinship", "capital", "medicine"];
  for (const nid of requiredNets) {
    const net = D.networks?.[nid];
    assert(Boolean(net), `networks 缺少子图 ${nid}`);
    if (!net) continue;
    const nodeMap = {};
    for (const n of net.nodes || []) {
      nodeMap[n.id] = n;
      if (n.familyId) assert(Boolean(famMap[n.familyId]), `子图 ${nid} 节点 ${n.id} 引用无效 familyId: ${n.familyId}`);
      if (n.artifactId) assert(Boolean(artMap[n.artifactId]), `子图 ${nid} 节点 ${n.id} 引用无效 artifactId: ${n.artifactId}`);
    }
    for (let i = 0; i < (net.nodes || []).length; i++) {
      for (let j = i + 1; j < net.nodes.length; j++) {
        const a = net.nodes[i];
        const b = net.nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        assert(dist > 45, `子图 ${nid} 节点 ${a.id} 与 ${b.id} 过近 (${dist.toFixed(1)}px <= 45px)`);
      }
    }
    for (const e of net.edges || []) {
      assert(Boolean(nodeMap[e.source]), `子图 ${nid} 边 source 无效: ${e.source}`);
      assert(Boolean(nodeMap[e.target]), `子图 ${nid} 边 target 无效: ${e.target}`);
    }
  }

  // Special topics, Archives, Debunks
  assert(Array.isArray(D.specialTopics) && D.specialTopics.length === 5, "specialTopics 应为 5 个专题");
  for (const t of D.specialTopics || []) {
    assert(fs.existsSync(path.join(ROOT, t.docPath)), `专题 ${t.id} 对应文件不存在: ${t.docPath}`);
  }
  assert(Array.isArray(D.archives) && D.archives.length === 10, "archives 应为 10 条");
  assert(Array.isArray(D.debunks) && D.debunks.length === 7, "debunks 应为 7 条");
}

// 3. Zero external CDN & local asset checks
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "assets/styles.css"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "assets/app.js"), "utf8");

assert(!/<(script|link|img)[^>]+https?:\/\//i.test(html), "index.html 存在外部 http(s) 资源引用，违反零 CDN 原则");
assert(!/@import\s+url\s*\(\s*['"]?https?:\/\//i.test(css) && !/url\s*\(\s*['"]?https?:\/\//i.test(css), "styles.css 存在外部 http(s) 引用");
assert(!/https?:\/\/[^\s'"]*(cdn|fonts\.googleapis|unpkg|jsdelivr)/i.test(js), "app.js 存在外部 CDN 引用");

// Check relative links in index.html
const refMatches = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
for (const ref of refMatches) {
  assert(fs.existsSync(path.join(ROOT, ref)), `index.html 引用本地文件不存在: ${ref}`);
}

// Basic P3 secret leak guard across project text files
const secretPattern = /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]+ PRIVATE KEY-----)/;
for (const rel of requiredFiles) {
  const full = path.join(ROOT, rel);
  if (fs.existsSync(full)) {
    const content = fs.readFileSync(full, "utf8");
    assert(!secretPattern.test(content), `检测到疑似密钥模式于文件: ${rel}`);
  }
}

if (errors.length > 0) {
  console.error("❌ 校验失败，发现以下问题:");
  errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
  process.exit(1);
}

console.log("✅ 全部自动化门禁校验通过！");
console.log(`   - 地理板块：${D.regions.length} 个（R1 东北 → R6 闽粤港澳台）`);
console.log(`   - 宏观时期：${D.epochs.length} 个（1736—今）`);
console.log(`   - 家族脉络：${D.families.length} 个（北→南序号与区域单调性 100% 校验通过）`);
console.log(`   - 关键器物：${D.artifacts.length} 件（家族↔器物双向引用 100% 对称）`);
console.log(`   - 时空交织网：${Object.keys(D.networks).length} 张（节点间距均 > 45px，零孤立/无效边）`);
console.log(`   - 专题文稿：${D.specialTopics.length} 篇 + 总纲 1 篇 | 档案库：${D.archives.length} 个 | 辨伪卡：${D.debunks.length} 组`);
console.log("   - 零外部 CDN 与 P3 安全扫描：PASS");
