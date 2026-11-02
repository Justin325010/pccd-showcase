// Hero flame-like particle canvas
const heroCanvas = document.getElementById('heroCanvas');
const heroCtx = heroCanvas.getContext('2d');
let particles = [];
let heroWidth = 0;
let heroHeight = 0;

function resizeHero() {
  heroWidth = heroCanvas.offsetWidth;
  heroHeight = heroCanvas.offsetHeight;
  heroCanvas.width = heroWidth;
  heroCanvas.height = heroHeight;
  createParticles();
}

function createParticles() {
  const count = Math.min(130, Math.max(60, Math.floor(heroWidth / 12)));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * heroWidth,
    y: heroHeight * (0.45 + Math.random() * 0.55),
    r: 0.8 + Math.random() * 2.6,
    speed: 0.25 + Math.random() * 0.9,
    drift: -0.4 + Math.random() * 0.8,
    hue: Math.random() < 0.68 ? 28 : 195,
    alpha: 0.18 + Math.random() * 0.55
  }));
}

function drawHero() {
  heroCtx.clearRect(0, 0, heroWidth, heroHeight);
  const center = heroWidth / 2;
  for (const p of particles) {
    p.y -= p.speed;
    p.x += p.drift + Math.sin((p.y + p.x) * 0.01) * 0.08;
    if (p.y < -10) {
      p.y = heroHeight + 10;
      p.x = center + (Math.random() - 0.5) * heroWidth * 0.55;
    }
    const isOrange = p.hue === 28;
    heroCtx.beginPath();
    heroCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    heroCtx.fillStyle = isOrange
      ? `rgba(255, ${Math.floor(120 + Math.random() * 60)}, 40, ${p.alpha})`
      : `rgba(34, ${Math.floor(180 + Math.random() * 60)}, 238, ${p.alpha * 0.75})`;
    heroCtx.fill();
  }
  requestAnimationFrame(drawHero);
}

window.addEventListener('resize', resizeHero);
resizeHero();
requestAnimationFrame(drawHero);

// Field reconstruction canvas
const fieldCanvas = document.getElementById('fieldCanvas');
const fieldCtx = fieldCanvas.getContext('2d');
const fieldWidth = fieldCanvas.width;
const fieldHeight = fieldCanvas.height;
let density = Number(document.getElementById('densitySlider').value);
let fieldMode = 'sparse';
let samples = [];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const ACTUAL_FLAME_NORM = [
  [0.9365, 0.9519, 0.9539, 0.9356, 0.9229, 0.8639, 0.7918, 0.7647, 0.6852, 0.6252, 0.5478],
  [0.9515, 0.9657, 0.9412, 0.8896, 0.8447, 0.7383, 0.7084, 0.6259, 0.5967, 0.5194, 0.5110],
  [0.9765, 0.9635, 0.8763, 0.8175, 0.6531, 0.6393, 0.5817, 0.4838, 0.4255, 0.4026, 0.3567],
  [1.0000, 0.9683, 0.7875, 0.6355, 0.5099, 0.4208, 0.3806, 0.3093, 0.2647, 0.2747, 0.2599],
  [0.9621, 0.7224, 0.5113, 0.3960, 0.2550, 0.2323, 0.2215, 0.1601, 0.1169, 0.1445, 0.1388],
  [0.6445, 0.3744, 0.2522, 0.1736, 0.1320, 0.0826, 0.0584, 0.0508, 0.0772, 0.0987, 0.0819],
  [0.1343, 0.0716, 0.0379, 0.0349, 0.0225, 0.0000, 0.0178, 0.0313, 0.0055, 0.0236, 0.0306]
];

function actualField(x, y) {
  const z = clamp(x, 0, 1) * (ACTUAL_FLAME_NORM[0].length - 1);
  const r = clamp(y, 0, 1) * (ACTUAL_FLAME_NORM.length - 1);
  const z0 = Math.floor(z);
  const r0 = Math.floor(r);
  const z1 = Math.min(z0 + 1, ACTUAL_FLAME_NORM[0].length - 1);
  const r1 = Math.min(r0 + 1, ACTUAL_FLAME_NORM.length - 1);
  const tz = z - z0;
  const tr = r - r0;
  const top = lerp(ACTUAL_FLAME_NORM[r0][z0], ACTUAL_FLAME_NORM[r0][z1], tz);
  const bottom = lerp(ACTUAL_FLAME_NORM[r1][z0], ACTUAL_FLAME_NORM[r1][z1], tz);
  return lerp(top, bottom, tr);
}

function makeSamples() {
  samples = [];
  for (let i = 0; i < density; i += 1) {
    const x = 0.08 + Math.random() * 0.84;
    const y = 0.06 + Math.random() * 0.88;
    const noise = (Math.random() - 0.5) * 0.05;
    samples.push({ x, y, v: clamp(actualField(x, y) + noise, 0, 1) });
  }
}

function reconstructAt(x, y) {
  let weighted = 0;
  let totalWeight = 0;
  for (const s of samples) {
    const dx = x - s.x;
    const dy = y - s.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 0.00015) return s.v;
    const w = 1 / (d2 + 0.004);
    weighted += w * s.v;
    totalWeight += w;
  }
  return totalWeight === 0 ? 0 : weighted / totalWeight;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function colorMap(value) {
  const stops = [
    { t: 0.0, r: 6, g: 12, b: 30 },
    { t: 0.38, r: 26, g: 84, b: 140 },
    { t: 0.68, r: 255, g: 140, b: 60 },
    { t: 1.0, r: 255, g: 222, b: 120 }
  ];
  for (let i = 1; i < stops.length; i += 1) {
    if (value <= stops[i].t) {
      const a = stops[i - 1];
      const b = stops[i];
      const t = (value - a.t) / (b.t - a.t);
      return [lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t)];
    }
  }
  return [255, 222, 120];
}

function drawFieldImage() {
  const image = fieldCtx.createImageData(fieldWidth, fieldHeight);
  const data = image.data;
  for (let py = 0; py < fieldHeight; py += 1) {
    for (let px = 0; px < fieldWidth; px += 1) {
      const x = px / (fieldWidth - 1);
      const y = 1 - py / (fieldHeight - 1);
      const value = fieldMode === 'reconstructed' ? reconstructAt(x, y) : actualField(x, y);
      const [r, g, b] = colorMap(value);
      const idx = (py * fieldWidth + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }
  fieldCtx.putImageData(image, 0, 0);
}

function drawSparseMode() {
  fieldCtx.clearRect(0, 0, fieldWidth, fieldHeight);
  fieldCtx.fillStyle = '#05070d';
  fieldCtx.fillRect(0, 0, fieldWidth, fieldHeight);
  for (const s of samples) {
    const px = s.x * fieldWidth;
    const py = (1 - s.y) * fieldHeight;
    const [r, g, b] = colorMap(s.v);
    fieldCtx.beginPath();
    fieldCtx.arc(px, py, 6, 0, Math.PI * 2);
    fieldCtx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    fieldCtx.fill();
    fieldCtx.strokeStyle = 'rgba(255,255,255,0.7)';
    fieldCtx.lineWidth = 1;
    fieldCtx.stroke();
  }
}

function updateFieldMetrics() {
  const rmse = Math.max(0.07, 0.245 - density * 0.00145).toFixed(3);
  const coverage = Math.min(97.8, 78.2 + density * 0.205).toFixed(1);
  document.getElementById('rmseValue').textContent = rmse;
  document.getElementById('coverageValue').textContent = `${coverage}%`;
  document.getElementById('densityValue').textContent = density;
}

function renderField() {
  makeSamples();
  if (fieldMode === 'sparse') {
    drawSparseMode();
  } else {
    drawFieldImage();
  }
  updateFieldMetrics();
}

document.getElementById('densitySlider').addEventListener('input', (event) => {
  density = Number(event.target.value);
  renderField();
});

document.querySelectorAll('.mode-btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    fieldMode = button.dataset.mode;
    renderField();
  });
});

renderField();

// GNN interactive diagram
const gnnData = {
  T: {
    name: '温度场 T',
    direct: 0.46,
    indirect: 0.14,
    explain: '温度场通过提高普朗克发射强度直接主导谱辐射，同时通过改变组分生成与反应路径产生间接贡献。'
  },
  OH: {
    name: 'OH 自由基',
    direct: 0.28,
    indirect: 0.10,
    explain: 'OH 是高温放热与化学发光的关键中间体，其浓度分布直接影响局部辐射强度，并参与多条反应路径。'
  },
  CO2: {
    name: 'CO₂',
    direct: 0.12,
    indirect: 0.08,
    explain: 'CO₂ 通过红外发射产生直接辐射贡献，并通过碳氧化路径影响温度与局部组分分布。'
  },
  Soot: {
    name: '碳烟 Soot',
    direct: 0.08,
    indirect: 0.05,
    explain: '碳烟具有强连续谱发射能力，其生成与氧化路径由局部当量比和温度共同控制。'
  },
  P1: {
    name: 'H₂/O₂ 链分支路径',
    direct: 0.15,
    indirect: 0.10,
    explain: '该路径通过提升自由基池浓度，间接增强放热与辐射活性组分生成。'
  },
  P2: {
    name: 'C₁ 氧化路径',
    direct: 0.12,
    indirect: 0.09,
    explain: 'C₁ 氧化路径影响 CO₂ 生成与温度释放，进而改变谱辐射中的红外贡献。'
  },
  P3: {
    name: 'C₂ 生成路径',
    direct: 0.07,
    indirect: 0.08,
    explain: 'C₂ 生成路径与碳烟前驱体形成相关，对可见光连续辐射具有显著间接影响。'
  }
};

const gnnNodes = [
  { id: 'P1', x: 70, y: 58 },
  { id: 'P2', x: 70, y: 140 },
  { id: 'P3', x: 70, y: 222 },
  { id: 'T', x: 230, y: 55 },
  { id: 'OH', x: 230, y: 130 },
  { id: 'CO2', x: 230, y: 205 },
  { id: 'Soot', x: 230, y: 280 },
  { id: 'Radiation', x: 382, y: 167 }
];

const gnnEdges = [
  { from: 'P1', to: 'T' },
  { from: 'P1', to: 'OH' },
  { from: 'P2', to: 'CO2' },
  { from: 'P2', to: 'T' },
  { from: 'P3', to: 'Soot' },
  { from: 'P3', to: 'CO2' },
  { from: 'T', to: 'Radiation' },
  { from: 'OH', to: 'Radiation' },
  { from: 'CO2', to: 'Radiation' },
  { from: 'Soot', to: 'Radiation' }
];

function buildGnn() {
  const svg = document.getElementById('gnnSvg');
  const nodesById = {};
  let edgeMarkup = '';
  for (const edge of gnnEdges) {
    const a = gnnNodes.find((node) => node.id === edge.from);
    const b = gnnNodes.find((node) => node.id === edge.to);
    edgeMarkup += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="gnn-edge" />`;
  }
  let nodeMarkup = '';
  for (const node of gnnNodes) {
    nodesById[node.id] = node;
    const isTarget = node.id === 'Radiation';
    const label = isTarget ? '谱辐射' : (gnnData[node.id] ? gnnData[node.id].name : node.id);
    const fill = isTarget ? 'rgba(255,122,26,0.28)' : 'rgba(34,211,238,0.22)';
    const stroke = isTarget ? '#ff9d45' : '#22d3ee';
    nodeMarkup += `
      <g class="gnn-node ${isTarget ? 'target-node' : ''}" data-node="${node.id}">
        <circle cx="${node.x}" cy="${node.y}" r="${isTarget ? 28 : 22}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />
        <text x="${node.x}" y="${node.y - 2}" text-anchor="middle" class="gnn-node-title">${label.split(' ')[0]}</text>
        <text x="${node.x}" y="${node.y + 15}" text-anchor="middle" class="gnn-node-sub">${isTarget ? 'RAD' : (gnnData[node.id] ? node.id : '')}</text>
      </g>`;
  }
  svg.innerHTML = `
    <defs>
      <style>
        .gnn-edge { stroke: rgba(255,255,255,0.18); stroke-width: 1.4; }
        .gnn-node { cursor: pointer; }
        .gnn-node circle { transition: fill 0.25s ease, stroke 0.25s ease, r 0.25s ease; }
        .gnn-node:hover circle { stroke: #ffffff; stroke-width: 2.4; }
        .gnn-node.selected circle { fill: rgba(255,122,26,0.38); stroke: #ffc857; stroke-width: 3; }
        .gnn-node-title { fill: #eef3ff; font-size: 15px; font-weight: 700; pointer-events: none; }
        .gnn-node-sub { fill: #9aa8c7; font-size: 10px; pointer-events: none; }
        .target-node .gnn-node-title { fill: #ffe3bd; font-size: 14px; }
      </style>
    </defs>
    ${edgeMarkup}
    ${nodeMarkup}
  `;

  svg.querySelectorAll('.gnn-node').forEach((group) => {
    group.addEventListener('click', () => {
      const id = group.dataset.node;
      if (id === 'Radiation') return;
      svg.querySelectorAll('.gnn-node').forEach((node) => node.classList.remove('selected'));
      group.classList.add('selected');
      setGnnSelection(id);
    });
  });

  setGnnSelection('T');
  svg.querySelector('[data-node="T"]').classList.add('selected');
}

function setGnnSelection(id) {
  const item = gnnData[id];
  if (!item) return;
  const max = 0.6;
  document.getElementById('gnnNodeName').textContent = item.name;
  document.getElementById('directValue').textContent = item.direct.toFixed(2);
  document.getElementById('indirectValue').textContent = item.indirect.toFixed(2);
  document.getElementById('totalValue').textContent = (item.direct + item.indirect).toFixed(2);
  document.getElementById('directBar').style.width = `${(item.direct / max) * 100}%`;
  document.getElementById('indirectBar').style.width = `${(item.indirect / max) * 100}%`;
  document.getElementById('totalBar').style.width = `${((item.direct + item.indirect) / max) * 100}%`;
  document.getElementById('gnnExplain').textContent = item.explain;
}

buildGnn();

// Decision demo
const decisionForm = document.getElementById('decisionForm');
const decisionOutput = document.getElementById('decisionOutput');
const decisionBtn = document.getElementById('decisionBtn');
const burnerHeight = document.getElementById('burnerHeight');
const targetRadiation = document.getElementById('targetRadiation');
const heightText = document.getElementById('heightText');
const radiationText = document.getElementById('radiationText');

function updateRangeLabels() {
  heightText.textContent = `${burnerHeight.value} mm`;
  radiationText.textContent = `${targetRadiation.value} kW/m²`;
}

burnerHeight.addEventListener('input', updateRangeLabels);
targetRadiation.addEventListener('input', updateRangeLabels);
updateRangeLabels();

function selectedFuels() {
  return Array.from(document.querySelectorAll('input[name="fuel"]:checked')).map((input) => input.value);
}

function buildPathSuggestion(height, radiation, fuels) {
  const paths = [];
  const hot = radiation > 65;
  if (hot) {
    paths.push({ name: 'OH 主导高温放热路径', contribution: 0.34, confidence: 0.86, reason: '高辐射目标要求提高局部放热强度，OH 路径贡献显著。' });
    paths.push({ name: 'C₁ 氧化路径', contribution: 0.26, confidence: 0.79, reason: '促进 CO₂ 生成，增强红外辐射贡献。' });
    paths.push({ name: 'C₂ 生成路径', contribution: 0.18, confidence: 0.72, reason: '增加碳烟前驱体，改善可见光连续辐射。' });
  } else if (radiation > 35) {
    paths.push({ name: 'OH 主导放热路径', contribution: 0.29, confidence: 0.84, reason: '在中等辐射目标下平衡放热与组分分布。' });
    paths.push({ name: 'C₁ 氧化路径', contribution: 0.25, confidence: 0.80, reason: '稳定生成 CO₂，提供红外辐射基础。' });
    paths.push({ name: 'H₂/O₂ 链分支路径', contribution: 0.20, confidence: 0.76, reason: '增强自由基池，改善燃烧稳定性。' });
  } else {
    paths.push({ name: 'H₂/O₂ 链分支路径', contribution: 0.27, confidence: 0.82, reason: '低辐射目标下优先保证点火与稳定燃烧。' });
    paths.push({ name: 'OH 主导放热路径', contribution: 0.24, confidence: 0.78, reason: '提供基础放热与辐射贡献。' });
    paths.push({ name: 'C₁ 氧化路径', contribution: 0.21, confidence: 0.74, reason: '降低不完全燃烧，维持较低排放。' });
  }
  return paths;
}

function buildFuelSuggestion(fuels, height, radiation) {
  const hasCH4 = fuels.includes('CH4');
  const hasH2 = fuels.includes('H2');
  const hasNH3 = fuels.includes('NH3');
  let fuel = '未选择可用燃料';
  let score = 0;
  let reason = '请至少选择一种燃料。';
  const risks = [];

  if (hasCH4 && hasH2 && hasNH3) {
    fuel = '65% CH₄ + 25% H₂ + 10% NH₃';
    score = 0.84;
    reason = '兼顾甲烷的稳定辐射、氢气的快速放热与氨气的低碳属性。';
    risks.push('需评估氨逃逸与点火延迟');
    risks.push('需验证高氢比例下的回火风险');
  } else if (hasCH4 && hasH2) {
    fuel = radiation > 65 ? '65% CH₄ + 35% H₂' : '80% CH₄ + 20% H₂';
    score = 0.88;
    reason = '利用氢气提升反应活性与辐射强度，同时保留甲烷的稳定燃烧特性。';
    risks.push('需验证回火风险');
  } else if (hasCH4 && hasNH3) {
    fuel = '90% CH₄ + 10% NH₃';
    score = 0.76;
    reason = '引入氨气降低燃料碳强度，并保持主要辐射贡献。';
    risks.push('需评估 NOx 排放与点火稳定性');
  } else if (hasH2 && hasNH3) {
    fuel = '80% H₂ + 20% NH₃';
    score = 0.68;
    reason = '构建低碳富氢燃烧路径，但对燃烧器与安全设计要求更高。';
    risks.push('需重点评估回火与 NOx 排放');
  } else if (hasCH4) {
    fuel = '纯 CH₄';
    score = 0.90;
    reason = '甲烷是当前最稳定的基准燃料，辐射与点火性能可预测。';
    risks.push('碳排放强度相对较高');
  } else if (hasH2) {
    fuel = '纯 H₂';
    score = 0.65;
    reason = '氢气反应活性高，可快速提升局部辐射，但燃烧组织难度更大。';
    risks.push('需重点评估回火风险');
  } else if (hasNH3) {
    fuel = '纯 NH₃';
    score = 0.55;
    reason = '氨气为零碳载体，但点火困难、燃烧速度低。';
    risks.push('需解决点火稳定性与 NOx 排放问题');
  }

  return { fuel, score, reason, risks };
}

function renderDecisionLoading() {
  decisionOutput.innerHTML = `
    <div class="output-empty">
      <div class="output-orbit"></div>
      <p>正在生成候选反应路径与燃料建议…</p>
    </div>`;
}

function renderDecisionResult(height, radiation, fuels) {
  const paths = buildPathSuggestion(height, radiation, fuels);
  const fuelResult = buildFuelSuggestion(fuels, height, radiation);
  const pathMarkup = paths.map((path) => `
    <div class="path-card">
      <div class="path-head"><span class="path-name">${path.name}</span><span class="path-conf">置信度 ${path.confidence.toFixed(2)}</span></div>
      <p>辐射贡献 ${(path.contribution * 100).toFixed(0)}% · ${path.reason}</p>
    </div>`).join('');
  const riskMarkup = fuelResult.risks.length
    ? `<p class="warn">风险提示：${fuelResult.risks.join('；')}</p>`
    : '';
  decisionOutput.innerHTML = `
    <h3 class="decision-heading">候选反应路径</h3>
    ${pathMarkup}
    <div class="fuel-card">
      <h3>推荐燃料：${fuelResult.fuel}</h3>
      <p>综合评分：${fuelResult.score.toFixed(2)}</p>
      <p>${fuelResult.reason}</p>
      ${riskMarkup}
    </div>`;
}

decisionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const height = Number(burnerHeight.value);
  const radiation = Number(targetRadiation.value);
  const fuels = selectedFuels();
  decisionBtn.disabled = true;
  decisionBtn.textContent = '推理中…';
  renderDecisionLoading();
  window.setTimeout(() => {
    renderDecisionResult(height, radiation, fuels);
    decisionBtn.disabled = false;
    decisionBtn.textContent = '生成决策建议';
  }, 620);
});

// Reveal animations for major cards
const revealElements = document.querySelectorAll('.section-heading, .problem-card, .innovation-card, .stat-card, .app-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealElements.forEach((element) => observer.observe(element));
