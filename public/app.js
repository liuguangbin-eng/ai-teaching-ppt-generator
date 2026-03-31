const $ = (sel) => document.querySelector(sel);

const els = {
  apiKey: $('#apiKey'),
  hskLevel: $('#hskLevel'),
  language: $('#language'),
  topic: $('#topic'),
  content: $('#content'),
  generateBtn: $('#generateBtn'),
  loading: $('#loading'),
  errorBox: $('#errorBox'),
  toolbar: $('#toolbar'),
  slideCount: $('#slideCount'),
  exportMdBtn: $('#exportMdBtn'),
  exportPptxBtn: $('#exportPptxBtn'),
  slidesContainer: $('#slidesContainer')
};

let currentSlides = [];

// Persist API key in session storage
const savedKey = sessionStorage.getItem('oai_key');
if (savedKey) els.apiKey.value = savedKey;
els.apiKey.addEventListener('input', () => {
  sessionStorage.setItem('oai_key', els.apiKey.value);
});

els.generateBtn.addEventListener('click', generate);
els.exportMdBtn.addEventListener('click', exportMarkdown);
els.exportPptxBtn.addEventListener('click', exportPptx);

async function generate() {
  const apiKey = els.apiKey.value.trim();
  const topic = els.topic.value.trim();
  const content = els.content.value.trim();

  if (!apiKey) return showError('Please enter your OpenAI API key.');
  if (!topic && !content) return showError('Please enter a topic or lesson content.');

  hideError();
  els.toolbar.classList.add('hidden');
  els.slidesContainer.innerHTML = '';
  els.loading.classList.remove('hidden');
  els.generateBtn.disabled = true;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        topic,
        content,
        hskLevel: els.hskLevel.value,
        language: els.language.value
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed.');

    currentSlides = data.slides;
    renderSlides(currentSlides);
    els.toolbar.classList.remove('hidden');
    els.slideCount.textContent = `${currentSlides.length} slides generated`;
  } catch (err) {
    showError(err.message);
  } finally {
    els.loading.classList.add('hidden');
    els.generateBtn.disabled = false;
  }
}

function showError(msg) {
  els.errorBox.textContent = msg;
  els.errorBox.classList.remove('hidden');
}

function hideError() {
  els.errorBox.classList.add('hidden');
}

// ── Rendering ──────────────────────────────────────────────

function renderSlides(slides) {
  els.slidesContainer.innerHTML = '';
  slides.forEach((slide, i) => {
    const el = document.createElement('div');
    el.className = `slide slide-type-${slide.type}`;
    el.innerHTML = `
      <div class="slide-header">Slide ${i + 1} — ${formatType(slide.type)}</div>
      <div class="slide-body">${renderSlideContent(slide)}</div>
    `;
    els.slidesContainer.appendChild(el);
  });
}

function formatType(type) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function renderSlideContent(slide) {
  const c = slide.content;
  switch (slide.type) {
    case 'title': return renderTitle(c);
    case 'vocabulary': return renderVocabulary(c);
    case 'sentence_patterns': return renderPatterns(c);
    case 'grammar': return renderGrammar(c);
    case 'practice': return renderPractice(c);
    case 'application': return renderApplication(c);
    case 'summary': return renderSummary(c);
    default: return `<pre>${JSON.stringify(c, null, 2)}</pre>`;
  }
}

function renderTitle(c) {
  return `<div class="title-slide">
    <div class="main-title">${esc(c.mainTitle)}</div>
    <div class="sub-title">${esc(c.subtitle)}</div>
    <span class="level-badge">${esc(c.level)}</span>
  </div>`;
}

function renderVocabulary(c) {
  const cards = (c.words || []).map(w => `
    <div class="vocab-card">
      <div class="vocab-chinese">${esc(w.chinese)}</div>
      <div class="vocab-pinyin">${esc(w.pinyin)}</div>
      <div class="vocab-meaning">${esc(w.meaning)}</div>
      <div class="vocab-example">${esc(w.example)}</div>
      <div class="vocab-example" style="margin-top:2px">${esc(w.exampleTranslation || '')}</div>
      <div class="vocab-image-prompt">🖼 ${esc(w.imagePrompt)}</div>
    </div>
  `).join('');
  return `<div class="vocab-grid">${cards}</div>`;
}

function renderPatterns(c) {
  return (c.patterns || []).map(p => `
    <div class="pattern-block">
      <div class="pattern-main">${esc(p.pattern)}</div>
      <div class="pattern-translation">${esc(p.patternTranslation)}</div>
      ${(p.examples || []).map(e => `
        <div class="pattern-example">
          <div class="ch">${esc(e.chinese)}</div>
          <div class="py">${esc(e.pinyin)}</div>
          <div class="tr">${esc(e.translation)}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderGrammar(c) {
  const examples = (c.examples || []).map(e => `
    <div class="grammar-example-item">
      <div class="ch">${esc(e.chinese)}</div>
      <div class="py">${esc(e.pinyin || '')}</div>
      <div class="tr">${esc(e.translation)}</div>
      ${e.highlight ? `<div class="highlight">Key: ${esc(e.highlight)}</div>` : ''}
    </div>
  `).join('');

  return `
    <div class="grammar-point">${esc(c.point)}</div>
    <div class="grammar-explanation">${esc(c.explanation)}</div>
    <div class="grammar-structure">${esc(c.structure)}</div>
    <div class="grammar-examples">${examples}</div>
    ${c.tip ? `<div class="grammar-tip">💡 ${esc(c.tip)}</div>` : ''}
  `;
}

function renderPractice(c) {
  return (c.exercises || []).map(ex => {
    let optionsHtml = '';
    if (ex.options && ex.options.length) {
      optionsHtml = `<ul class="exercise-options">${
        ex.options.map((o, i) => `<li>${String.fromCharCode(65 + i)}. ${esc(o)}</li>`).join('')
      }</ul>`;
    }

    const answerId = 'ans-' + Math.random().toString(36).slice(2, 9);
    return `
      <div class="exercise-block">
        <span class="exercise-type">${esc(ex.type.replace(/_/g, ' '))}</span>
        <div class="exercise-instruction">${esc(ex.instruction)}</div>
        <div class="exercise-question">${esc(ex.question)}</div>
        ${optionsHtml}
        <div class="exercise-answer" id="${answerId}" onclick="this.classList.add('revealed')">
          <span class="reveal-btn">👁 Show Answer</span>
          <span class="answer-text">✅ ${esc(ex.answer)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderApplication(c) {
  const lines = (c.dialogue || []).map(d => `
    <div class="dialogue-line">
      <div class="dialogue-speaker speaker-${d.speaker.toLowerCase()}">${esc(d.speaker)}</div>
      <div class="dialogue-content">
        <div class="ch">${esc(d.chinese)}</div>
        <div class="py">${esc(d.pinyin)}</div>
        <div class="tr">${esc(d.translation)}</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="scenario-label">Scenario: ${esc(c.scenario)}</div>
    <div class="dialogue">${lines}</div>
    ${c.task ? `<div class="dialogue-task">🎯 Task: ${esc(c.task)}</div>` : ''}
  `;
}

function renderSummary(c) {
  const words = (c.keyWords || []).map(w =>
    `<span class="summary-word"><span class="ch">${esc(w.chinese)}</span> ${esc(w.pinyin)} — ${esc(w.meaning)}</span>`
  ).join('');

  const patterns = (c.keyPatterns || []).map(p =>
    `<li>${esc(p)}</li>`
  ).join('');

  return `
    <div class="summary-section">
      <h4>Key Vocabulary</h4>
      <div class="summary-words">${words}</div>
    </div>
    <div class="summary-section">
      <h4>Key Patterns</h4>
      <ul class="summary-patterns">${patterns}</ul>
    </div>
    ${c.homework ? `
    <div class="summary-section">
      <h4>Homework</h4>
      <div class="summary-homework">${esc(c.homework)}</div>
    </div>` : ''}
  `;
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ── Markdown Export ────────────────────────────────────────

function exportMarkdown() {
  if (!currentSlides.length) return;

  let md = '';
  currentSlides.forEach((slide, i) => {
    md += `---\n## Slide ${i + 1}: ${slide.title}\n\n`;
    md += slideToMarkdown(slide);
    md += '\n\n';
  });

  download(`chinese-lesson.md`, md, 'text/markdown');
}

function slideToMarkdown(slide) {
  const c = slide.content;
  switch (slide.type) {
    case 'title':
      return `# ${c.mainTitle}\n### ${c.subtitle}\n**Level:** ${c.level}`;

    case 'vocabulary':
      return (c.words || []).map(w =>
        `### ${w.chinese} (${w.pinyin})\n- **Meaning:** ${w.meaning}\n- **Example:** ${w.example}\n- ${w.exampleTranslation || ''}\n- *Image:* ${w.imagePrompt}`
      ).join('\n\n');

    case 'sentence_patterns':
      return (c.patterns || []).map(p =>
        `### ${p.pattern}\n*${p.patternTranslation}*\n` +
        (p.examples || []).map(e => `- ${e.chinese} (${e.pinyin}) — ${e.translation}`).join('\n')
      ).join('\n\n');

    case 'grammar':
      return `### ${c.point}\n${c.explanation}\n\n**Structure:** \`${c.structure}\`\n\n` +
        (c.examples || []).map(e => `- ${e.chinese} (${e.pinyin || ''}) — ${e.translation}`).join('\n') +
        (c.tip ? `\n\n> 💡 ${c.tip}` : '');

    case 'practice':
      return (c.exercises || []).map(ex => {
        let s = `**[${ex.type}]** ${ex.instruction}\n\n**Q:** ${ex.question}\n`;
        if (ex.options) s += ex.options.map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`).join('\n') + '\n';
        s += `**Answer:** ${ex.answer}`;
        return s;
      }).join('\n\n');

    case 'application':
      return `*Scenario: ${c.scenario}*\n\n` +
        (c.dialogue || []).map(d => `**${d.speaker}:** ${d.chinese} (${d.pinyin}) — ${d.translation}`).join('\n') +
        (c.task ? `\n\n🎯 **Task:** ${c.task}` : '');

    case 'summary':
      return `**Key Words:** ` +
        (c.keyWords || []).map(w => `${w.chinese}(${w.pinyin}) = ${w.meaning}`).join(', ') +
        `\n\n**Key Patterns:**\n` +
        (c.keyPatterns || []).map(p => `- ${p}`).join('\n') +
        (c.homework ? `\n\n**Homework:** ${c.homework}` : '');

    default:
      return JSON.stringify(c, null, 2);
  }
}

// ── PPTX Export ───────────────────────────────────────────

function exportPptx() {
  if (!currentSlides.length) return;

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_16x9', width: 13.33, height: 7.5 });
  pptx.layout = 'LAYOUT_16x9';

  const colors = {
    title: 'C62828',
    vocabulary: '1565C0',
    sentence_patterns: '2E7D32',
    grammar: '6A1B9A',
    practice: 'E65100',
    application: '00838F',
    summary: 'F9A825'
  };

  currentSlides.forEach(slide => {
    const s = pptx.addSlide();
    const color = colors[slide.type] || '333333';

    // Top bar
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color } });
    s.addText(slide.title || formatType(slide.type), { x: 0.5, y: 0.08, w: 12, h: 0.45, color: 'FFFFFF', fontSize: 16, bold: true });

    const c = slide.content;

    switch (slide.type) {
      case 'title':
        s.addText(c.mainTitle, { x: 1, y: 2, w: 11, h: 1.5, fontSize: 36, bold: true, color, align: 'center' });
        s.addText(c.subtitle, { x: 1, y: 3.5, w: 11, h: 0.8, fontSize: 18, color: '616161', align: 'center' });
        s.addText(c.level, { x: 5.5, y: 4.8, w: 2, h: 0.5, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center', fill: { color } , shape: pptx.ShapeType.roundRect, rectRadius: 0.15 });
        break;

      case 'vocabulary':
        (c.words || []).forEach((w, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const xBase = 0.5 + col * 6.2;
          const yBase = 1 + row * 2.1;
          s.addText(w.chinese, { x: xBase, y: yBase, w: 2, h: 0.55, fontSize: 22, bold: true, color });
          s.addText(w.pinyin, { x: xBase + 2.1, y: yBase, w: 3.5, h: 0.3, fontSize: 11, color: '9E9E9E' });
          s.addText(w.meaning, { x: xBase + 2.1, y: yBase + 0.3, w: 3.5, h: 0.3, fontSize: 12, bold: true, color: '333333' });
          s.addText(w.example, { x: xBase, y: yBase + 0.65, w: 5.8, h: 0.3, fontSize: 10, color: '616161' });
          s.addText(w.exampleTranslation || '', { x: xBase, y: yBase + 0.95, w: 5.8, h: 0.3, fontSize: 9, color: '9E9E9E', italic: true });
        });
        break;

      case 'sentence_patterns':
        (c.patterns || []).forEach((p, pi) => {
          const yBase = 1 + pi * 2.2;
          s.addText(p.pattern, { x: 0.5, y: yBase, w: 12, h: 0.4, fontSize: 16, bold: true, color });
          s.addText(p.patternTranslation, { x: 0.5, y: yBase + 0.4, w: 12, h: 0.3, fontSize: 10, color: '9E9E9E', italic: true });
          (p.examples || []).forEach((e, ei) => {
            const ey = yBase + 0.8 + ei * 0.55;
            s.addText(`${e.chinese}  (${e.pinyin})`, { x: 0.8, y: ey, w: 8, h: 0.28, fontSize: 12, color: '333333' });
            s.addText(e.translation, { x: 9, y: ey, w: 4, h: 0.28, fontSize: 10, color: '616161' });
          });
        });
        break;

      case 'grammar':
        s.addText(c.point, { x: 0.5, y: 1, w: 12, h: 0.5, fontSize: 18, bold: true, color });
        s.addText(c.explanation, { x: 0.5, y: 1.6, w: 12, h: 0.8, fontSize: 11, color: '333333', wrap: true });
        s.addText(`Structure: ${c.structure}`, { x: 0.5, y: 2.5, w: 12, h: 0.4, fontSize: 12, bold: true, color, fill: { color: 'F3E5F5' }, shape: pptx.ShapeType.roundRect, rectRadius: 0.1 });
        (c.examples || []).forEach((e, ei) => {
          const ey = 3.2 + ei * 0.6;
          s.addText(`${e.chinese}  —  ${e.translation}`, { x: 0.8, y: ey, w: 11, h: 0.35, fontSize: 12, color: '333333' });
        });
        if (c.tip) {
          s.addText(`💡 ${c.tip}`, { x: 0.5, y: 5.8, w: 12, h: 0.5, fontSize: 10, color: 'E65100', fill: { color: 'FFF8E1' }, shape: pptx.ShapeType.roundRect, rectRadius: 0.1 });
        }
        break;

      case 'practice':
        (c.exercises || []).forEach((ex, ei) => {
          const yBase = 1 + ei * 1.5;
          s.addText(`[${ex.type.replace(/_/g, ' ').toUpperCase()}] ${ex.instruction}`, { x: 0.5, y: yBase, w: 12, h: 0.3, fontSize: 9, color: '9E9E9E' });
          s.addText(ex.question, { x: 0.5, y: yBase + 0.35, w: 12, h: 0.35, fontSize: 13, bold: true, color: '333333' });
          if (ex.options && ex.options.length) {
            const optText = ex.options.map((o, oi) => `${String.fromCharCode(65 + oi)}. ${o}`).join('    ');
            s.addText(optText, { x: 0.8, y: yBase + 0.75, w: 11, h: 0.3, fontSize: 11, color: '616161' });
          }
        });
        break;

      case 'application':
        s.addText(`Scenario: ${c.scenario}`, { x: 0.5, y: 1, w: 12, h: 0.4, fontSize: 12, italic: true, color: '616161' });
        (c.dialogue || []).forEach((d, di) => {
          const yBase = 1.6 + di * 0.8;
          const speakerColor = d.speaker === 'A' ? '1565C0' : '2E7D32';
          s.addText(d.speaker, { x: 0.5, y: yBase, w: 0.5, h: 0.35, fontSize: 12, bold: true, color: speakerColor });
          s.addText(`${d.chinese}  (${d.pinyin})`, { x: 1.2, y: yBase, w: 7, h: 0.35, fontSize: 12, color: '333333' });
          s.addText(d.translation, { x: 8.5, y: yBase, w: 4.5, h: 0.35, fontSize: 10, color: '9E9E9E' });
        });
        if (c.task) {
          s.addText(`🎯 Task: ${c.task}`, { x: 0.5, y: 6.2, w: 12, h: 0.5, fontSize: 11, color: '2E7D32', fill: { color: 'E8F5E9' }, shape: pptx.ShapeType.roundRect, rectRadius: 0.1 });
        }
        break;

      case 'summary':
        s.addText('Key Vocabulary', { x: 0.5, y: 1, w: 12, h: 0.4, fontSize: 14, bold: true, color: '333333' });
        const wordText = (c.keyWords || []).map(w => `${w.chinese} (${w.pinyin}) = ${w.meaning}`).join('  |  ');
        s.addText(wordText, { x: 0.5, y: 1.5, w: 12, h: 0.8, fontSize: 11, color: '616161', wrap: true });

        s.addText('Key Patterns', { x: 0.5, y: 2.5, w: 12, h: 0.4, fontSize: 14, bold: true, color: '333333' });
        const patText = (c.keyPatterns || []).map(p => `• ${p}`).join('\n');
        s.addText(patText, { x: 0.5, y: 3, w: 12, h: 1.5, fontSize: 11, color: '616161', wrap: true });

        if (c.homework) {
          s.addText(`📝 Homework: ${c.homework}`, { x: 0.5, y: 5, w: 12, h: 0.6, fontSize: 12, color: '1565C0', fill: { color: 'E3F2FD' }, shape: pptx.ShapeType.roundRect, rectRadius: 0.1 });
        }
        break;
    }
  });

  pptx.writeFile({ fileName: 'chinese-lesson.pptx' });
}

// ── Helpers ───────────────────────────────────────────────

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
