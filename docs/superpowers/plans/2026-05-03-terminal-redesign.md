# Terminal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pisanvs.cl with a terminal-themed single-page site where content is served from Markdown files, a build script generates `content.js`, and the UI is a navigable virtual filesystem with clickable buttons.

**Architecture:** `content/` holds all copy as Markdown files. `scripts/build-content.js` (Node.js, no deps) converts them to a global `CONTENT` object in `content.js`. The terminal reads `content.js` → `fs.js` (virtual filesystem) → `terminal.js` (commands + rendering) → `index.html` (shell + CSS). GitHub Actions rebuilds `content.js` on every push to `main` that touches `content/` or the build script.

**Tech Stack:** Vanilla HTML/CSS/JS, Node.js (build script only), GitHub Actions, GitHub Pages. Zero npm dependencies.

---

### Task 1: Create `content/` folder with all Markdown files

**Files:**
- Create: `content/bio.md`
- Create: `content/contact.md`
- Create: `content/pubkey.asc`
- Create: `content/now.md`
- Create: `content/projects/numotics.md`
- Create: `content/projects/tedx.md`
- Create: `content/projects/blog.md`
- Create: `content/projects/school-violence.md`
- Create: `content/tools/chordid.md`
- Create: `content/tools/mic-al.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p content/projects content/tools
```

- [ ] **Step 2: Write `content/bio.md`**

```markdown
Hey, I'm pisanvs. This is my humble website. I'm a kid based in Chile who likes to keep himself busy doing hard things! If you're reading this and end up unsatisfied with the brevity of my "bio", go ahead and look into my blog!
```

- [ ] **Step 3: Write `content/contact.md`**

```
mail:         maxmorel@pisanvs.cl
gpg:          cat ~/me/pubkey.asc
matrix:       @pisanvs:matrix.org
calendar:     pisanvs.cl/meet
afterschool:  pisanvs.cl/afterschool
```

- [ ] **Step 4: Write `content/now.md`**

```markdown
numotics is shipping · last commit 3h ago · last post 2d ago
```

- [ ] **Step 5: Write `content/projects/numotics.md`**

```markdown
# numotics

Startup. Website is just the tip of it — real code behind the scenes.

run ./run to open the site.
```

- [ ] **Step 6: Write `content/projects/tedx.md`**

```markdown
# TEDxLINTAC Youth

Not just the website — interactive lightning & badges for the event.

run ./run to open it.
```

- [ ] **Step 7: Write `content/projects/blog.md`**

```markdown
# blog

Long-form thinking, on substack. ./latest opens the blog.
```

- [ ] **Step 8: Write `content/projects/school-violence.md`**

```markdown
# school-violence

Data visualization of school violence statistics in Chile. An independent project — impactful numbers, rendered.

run ./run to open it.
```

- [ ] **Step 9: Write `content/tools/chordid.md`**

```markdown
# chordid

Chord & interval identification for piano. Point your mic at a piano, get the chord name and intervals. No install.
```

- [ ] **Step 10: Write `content/tools/mic-al.md`**

```markdown
# mic-al

beta — frequency response and polar response analyzer for microphones. Runs entirely in the browser. No install.
```

- [ ] **Step 11: Copy existing pubkey into `content/pubkey.asc`**

```bash
cp pubkey.asc content/pubkey.asc
```

- [ ] **Step 12: Commit**

```bash
git add content/
git commit -m "feat: add content/ markdown source files"
```

---

### Task 2: Write `scripts/build-content.js`

**Files:**
- Create: `scripts/build-content.js`

- [ ] **Step 1: Create `scripts/` directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Write `scripts/build-content.js`**

```js
#!/usr/bin/env node
// Reads content/ folder, outputs content.js as a global CONTENT object.
// Run: node scripts/build-content.js
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUTPUT      = path.join(__dirname, '..', 'content.js');
const TEXT_EXTS   = new Set(['.md', '.txt', '.asc']);

function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function walk(dir) {
  const result = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result[toCamelCase(entry.name)] = walk(full);
    } else {
      const ext  = path.extname(entry.name);
      const base = path.basename(entry.name, ext);
      if (TEXT_EXTS.has(ext)) {
        result[toCamelCase(base)] = fs.readFileSync(full, 'utf8');
      }
    }
  }
  return result;
}

const content = walk(CONTENT_DIR);
const output  = [
  '// AUTO-GENERATED — do not edit manually. Run: node scripts/build-content.js',
  `const CONTENT = ${JSON.stringify(content, null, 2)};`,
].join('\n') + '\n';

fs.writeFileSync(OUTPUT, output);
console.log('content.js written (' + Buffer.byteLength(output) + ' bytes)');
```

- [ ] **Step 3: Verify the script runs without errors**

```bash
node scripts/build-content.js
```

Expected output: `content.js written (XXXX bytes)`

- [ ] **Step 4: Verify `content.js` has correct shape**

```bash
node -e "const CONTENT = require('./content.js'); console.log(Object.keys(CONTENT))"
```

Wait — `content.js` uses `const CONTENT = ...` (not `module.exports`). Check shape this way instead:

```bash
node -e "
const src = require('fs').readFileSync('content.js','utf8');
eval(src);
console.log('top-level keys:', Object.keys(CONTENT));
console.log('projects keys:', Object.keys(CONTENT.projects));
console.log('tools keys:', Object.keys(CONTENT.tools));
console.log('bio preview:', CONTENT.bio.slice(0,40));
"
```

Expected:
```
top-level keys: [ 'bio', 'contact', 'pubkey', 'now', 'projects', 'tools' ]
projects keys: [ 'numotics', 'tedx', 'blog', 'schoolViolence' ]
tools keys: [ 'chordid', 'micAl' ]
bio preview: Hey, I'm pisanvs. This is my humble web
```

- [ ] **Step 5: Commit**

```bash
git add scripts/build-content.js content.js
git commit -m "feat: add content build script and initial content.js"
```

---

### Task 3: Write `fs.js`

**Files:**
- Create: `fs.js`

This file defines the virtual filesystem. It reads from the global `CONTENT` (loaded by `content.js` first). Load order in `index.html` must be: `content.js` → `fs.js` → `terminal.js`.

- [ ] **Step 1: Write `fs.js`**

```js
// Virtual filesystem for pisanvs.cl terminal.
// Loaded after content.js — CONTENT global must exist.
const FS = {
  '/home/pisanvs': {
    type: 'dir',
    children: ['me', 'projects', 'tools', 'code', 'now'],
  },

  // ── me ──────────────────────────────────────────────────────────────
  '/home/pisanvs/me': {
    type: 'dir',
    children: ['bio.md', 'contact.txt', 'socials', 'pubkey.asc'],
  },
  '/home/pisanvs/me/bio.md': {
    type: 'file',
    content: CONTENT.bio,
  },
  '/home/pisanvs/me/contact.txt': {
    type: 'file',
    content: CONTENT.contact,
  },
  '/home/pisanvs/me/pubkey.asc': {
    type: 'file',
    content: CONTENT.pubkey,
  },
  '/home/pisanvs/me/socials': {
    type: 'exec',
    describe: 'print social links',
    run: (term) => {
      term.print('github     https://github.com/pisanvs', 'cyan');
      term.print('instagram  https://instagram.com/pisanvs', 'cyan');
      term.print('linkedin   https://linkedin.com/in/pisanvs', 'cyan');
      term.print('substack   https://pisanvs.substack.com', 'cyan');
    },
  },

  // ── projects ─────────────────────────────────────────────────────────
  '/home/pisanvs/projects': {
    type: 'dir',
    children: ['numotics', 'tedx', 'blog', 'misc'],
  },

  '/home/pisanvs/projects/numotics': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/projects/numotics/README.md': {
    type: 'file',
    content: CONTENT.projects.numotics,
  },
  '/home/pisanvs/projects/numotics/run': {
    type: 'exec',
    describe: 'open numotics.cl',
    run: (term) => { term.openPane('https://numotics.cl', 'numotics.cl'); },
  },

  '/home/pisanvs/projects/tedx': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/projects/tedx/README.md': {
    type: 'file',
    content: CONTENT.projects.tedx,
  },
  '/home/pisanvs/projects/tedx/run': {
    type: 'exec',
    describe: 'open tedxlintacyouth',
    run: (term) => { term.openPane('https://tedxlintacyouth.vercel.app', 'tedxlintacyouth'); },
  },

  '/home/pisanvs/projects/blog': {
    type: 'dir',
    children: ['README.md', 'latest'],
  },
  '/home/pisanvs/projects/blog/README.md': {
    type: 'file',
    content: CONTENT.projects.blog,
  },
  '/home/pisanvs/projects/blog/latest': {
    type: 'exec',
    describe: 'open substack blog',
    run: (term) => { term.openPane('https://pisanvs.substack.com', 'pisanvs — substack'); },
  },

  '/home/pisanvs/projects/misc': {
    type: 'dir',
    children: ['school-violence'],
  },
  '/home/pisanvs/projects/misc/school-violence': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/projects/misc/school-violence/README.md': {
    type: 'file',
    content: CONTENT.projects.schoolViolence,
  },
  '/home/pisanvs/projects/misc/school-violence/run': {
    type: 'exec',
    describe: 'open school-violence visualization',
    run: (term) => { term.openPane('/school-violence.html', 'school-violence'); },
  },

  // ── tools ─────────────────────────────────────────────────────────────
  '/home/pisanvs/tools': {
    type: 'dir',
    children: ['chordid', 'mic-al'],
  },

  '/home/pisanvs/tools/chordid': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/tools/chordid/README.md': {
    type: 'file',
    content: CONTENT.tools.chordid,
  },
  '/home/pisanvs/tools/chordid/run': {
    type: 'exec',
    describe: 'open chordid',
    run: (term) => { term.openPane('/tools/chordid.html', 'chordid'); },
  },

  '/home/pisanvs/tools/mic-al': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/tools/mic-al/README.md': {
    type: 'file',
    content: CONTENT.tools.micAl,
  },
  '/home/pisanvs/tools/mic-al/run': {
    type: 'exec',
    describe: 'open mic-al analyzer',
    run: (term) => { term.openPane('/tools/mic-al.html', 'mic-al'); },
  },

  // ── code (lazy) ──────────────────────────────────────────────────────
  '/home/pisanvs/code': {
    type: 'dir',
    children: ['__lazy__'],
    lazy: true,
  },

  // ── now ──────────────────────────────────────────────────────────────
  '/home/pisanvs/now': {
    type: 'file',
    content: CONTENT.now,
  },

  // ── hidden ───────────────────────────────────────────────────────────
  '/home/pisanvs/.dj': {
    type: 'exec',
    hidden: true,
    describe: 'audio-reactive mode',
    run: (term) => { term.djMode(); },
  },
};

window.PISANVS_FS   = FS;
window.PISANVS_HOME = '/home/pisanvs';
```

- [ ] **Step 2: Commit**

```bash
git add fs.js
git commit -m "feat: add virtual filesystem (fs.js)"
```

---

### Task 4: Write `terminal.js`

**Files:**
- Create: `terminal.js`

- [ ] **Step 1: Write `terminal.js`**

```js
// pisanvs.cl — terminal logic
// Depends on: content.js (CONTENT global), fs.js (PISANVS_FS, PISANVS_HOME globals)
(() => {
  const FS     = window.PISANVS_FS;
  const HOME   = window.PISANVS_HOME;

  const indexEl    = document.getElementById('index');
  const logEl      = document.getElementById('log');
  const input      = document.getElementById('input');
  const form       = document.getElementById('form');
  const pathEl     = document.getElementById('path');
  const statusFeed = document.getElementById('status-feed');

  let cwd     = HOME;
  let prevCwd = HOME;
  const history = [];
  let histIdx = -1;

  // ── fs helpers ──────────────────────────────────────────────────────
  function resolve(p) {
    if (!p) return cwd;
    if (p === '~') return HOME;
    if (p === '-') return prevCwd;
    if (p.startsWith('~/')) p = HOME + '/' + p.slice(2);
    if (!p.startsWith('/')) p = cwd + '/' + p;
    const parts = [];
    for (const seg of p.split('/')) {
      if (!seg || seg === '.') continue;
      if (seg === '..') { parts.pop(); continue; }
      parts.push(seg);
    }
    return '/' + parts.join('/');
  }
  function node(p)        { return FS[p]; }
  function displayPath(p) {
    if (p === HOME) return '~';
    if (p.startsWith(HOME + '/')) return '~/' + p.slice(HOME.length + 1);
    return p;
  }
  function escHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── output ──────────────────────────────────────────────────────────
  function echoCmd(cmd) {
    const div = document.createElement('div');
    div.className = 'echo';
    div.innerHTML = `<span class="prompt">pisanvs@cl:<span class="path">${displayPath(cwd)}</span>$</span> <span class="cmd">${escHtml(cmd)}</span>`;
    logEl.appendChild(div);
  }
  function out(text, cls = '') {
    const div = document.createElement('div');
    div.className = 'out' + (cls ? ' ' + cls : '');
    div.textContent = text;
    logEl.appendChild(div);
    return div;
  }
  function outHTML(html, cls = '') {
    const div = document.createElement('div');
    div.className = 'out' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    logEl.appendChild(div);
    return div;
  }
  function scrollToEnd() {
    requestAnimationFrame(() => {
      const last = logEl.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // ── term API (passed to exec nodes) ─────────────────────────────────
  const term = {
    print: out,
    printHTML: outHTML,
    openPane(url, title) {
      const wrap = document.createElement('div');
      wrap.className = 'pane';
      wrap.innerHTML = `
        <div class="pane-head">
          <span>${escHtml(title || url)}</span>
          <button data-close>close</button>
        </div>
        <iframe src="${escHtml(url)}" referrerpolicy="no-referrer"></iframe>`;
      wrap.querySelector('[data-close]').onclick = () => wrap.remove();
      logEl.appendChild(wrap);
      scrollToEnd();
    },
    djMode() { out('[dj mode — coming soon]', 'faint'); },
  };

  // ── commands ─────────────────────────────────────────────────────────
  const COMMANDS = {
    help() {
      outHTML(`available commands:
  <span style="color:var(--cyan)">ls</span>      list directory
  <span style="color:var(--cyan)">cd</span>      change directory
  <span style="color:var(--cyan)">cat</span>     read file
  <span style="color:var(--cyan)">pwd</span>     print working directory
  <span style="color:var(--cyan)">whoami</span>  identity
  <span style="color:var(--cyan)">socials</span> print social links
  <span style="color:var(--cyan)">history</span> command history
  <span style="color:var(--cyan)">clear</span>   clear log
  <span style="color:var(--cyan)">./x</span>     run an executable
or just <em style="color:var(--cyan)">click any button</em> in the page above.`);
    },
    pwd()    { out(displayPath(cwd)); },
    whoami() { out('pisanvs — max morel · kid in chile · building hard things', 'cyan'); },
    socials() {
      outHTML(`<a href="https://github.com/pisanvs" target="_blank">github</a>     https://github.com/pisanvs
<a href="https://instagram.com/pisanvs" target="_blank">instagram</a>  https://instagram.com/pisanvs
<a href="https://linkedin.com/in/pisanvs" target="_blank">linkedin</a>   https://linkedin.com/in/pisanvs
<a href="https://pisanvs.substack.com" target="_blank">substack</a>   https://pisanvs.substack.com`);
    },
    history() { history.forEach((h, i) => out(`${String(i + 1).padStart(4)}  ${h}`)); },
    clear()   { logEl.innerHTML = ''; },

    ls(arg) {
      const target = arg ? resolve(arg) : cwd;
      const n = node(target);
      if (!n) return out(`ls: ${arg || target}: no such file or directory`, 'err');
      if (n.type !== 'dir') return out(displayPath(target));
      const items = (n.children || []).filter(name => {
        if (name === '__lazy__') return false;
        return !node(target + '/' + name)?.hidden;
      });
      if (items.length === 0) { out('(empty)'); return; }
      const html = items.map(name => {
        const full = target + '/' + name;
        const ch   = node(full);
        if (!ch) return escHtml(name);
        const color   = ch.type === 'dir' ? 'var(--cyan)' : ch.type === 'exec' ? 'var(--green)' : 'var(--fg)';
        const suffix  = ch.type === 'dir' ? '/' : ch.type === 'exec' ? '*' : '';
        const display = ch.type === 'exec' ? './' + name : name;
        const cmd     = ch.type === 'dir' ? `cd ${name}` : ch.type === 'exec' ? `./${name}` : `cat ${name}`;
        return `<button class="inline" data-run="${escHtml(cmd)}" style="color:${color};text-decoration:none">${escHtml(display)}${suffix}</button>`;
      }).join('   ');
      outHTML(html);
    },

    cd(arg) {
      const target = resolve(arg || '~');
      const n = node(target);
      if (!n)            return out(`cd: ${arg}: no such file or directory`, 'err');
      if (n.type !== 'dir') return out(`cd: ${arg}: not a directory`, 'err');
      prevCwd = cwd;
      cwd = target;
      if (pathEl) pathEl.textContent = displayPath(cwd);
      COMMANDS.ls();
    },

    cat(arg) {
      if (!arg) return out('cat: missing operand', 'err');
      const target = resolve(arg);
      const n = node(target);
      if (!n)               return out(`cat: ${arg}: no such file or directory`, 'err');
      if (n.type === 'dir') return out(`cat: ${arg}: is a directory`, 'err');
      out(n.content || '');
    },

    man() { COMMANDS.help(); },
  };

  function runExec(absPath) {
    const n = node(absPath);
    if (!n || n.type !== 'exec') return out(`${absPath}: not executable`, 'err');
    n.run(term);
  }

  // ── dispatcher ───────────────────────────────────────────────────────
  function run(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    history.push(cmd);
    histIdx = history.length;
    if (/^https?:\/\//.test(cmd)) {
      echoCmd(cmd);
      window.open(cmd, '_blank', 'noopener');
      out(`opened ${cmd}`, 'faint');
      return;
    }
    echoCmd(cmd);
    if (cmd.startsWith('/')) {
      const n = node(cmd);
      if (n && n.type === 'exec') { runExec(cmd); scrollToEnd(); return; }
    }
    const [head, ...rest] = cmd.split(/\s+/);
    if (head.startsWith('./')) {
      runExec(resolve(head.slice(2)));
    } else if (COMMANDS[head]) {
      try { COMMANDS[head](rest.join(' ')); }
      catch (e) { out(String(e), 'err'); }
    } else {
      out(`-bash: ${head}: command not found`, 'err');
    }
    scrollToEnd();
  }
  window.PV_RUN = run;

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-run]');
    if (!t) return;
    e.preventDefault();
    run(t.dataset.run);
  });

  // ── commit graph ─────────────────────────────────────────────────────
  function commitGraph() {
    const weeks = 53, days = 7;
    let s = 1337;
    const rnd  = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const ramp = ' .-+#';
    const rows = [];
    for (let d = 0; d < days; d++) {
      let row = '';
      for (let w = 0; w < weeks; w++) {
        const recency = w / weeks;
        const v = rnd() * (0.35 + recency * 0.9);
        row += ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
      }
      rows.push(row);
    }
    return rows.join('\n');
  }

  // ── ASCII portrait ───────────────────────────────────────────────────
  const PORTRAIT = String.raw`        ......
     ..::--==-::..
   .:-=+**####**+=-:.
  .-+*##%%%%%%%%##*+-.
 :=*#%%%@@@@@@@%%%#*=:
.=*#%%@@@@@@@@@@@%%#*=.
=*#%%@@@@@@@@@@@@@%%#*=
+*#%@@@@@@@@@@@@@@@%#*+
+*#%@@@@@@##@@@@@@@%#*+
+*#%@@@@@%::%@@@@@@%#*+
=*#%@@@@@@##@@@@@@@%#*=
.=*#%@@@@@@@@@@@@@%#*=.
 :=*#%@@@@@@@@@@@%#*=:
  .-+*#%%@@@@@%%#*+-.
   .:-=+*######*+=-:.
     ..::--==-::..
        ......`;

  // ── index page ───────────────────────────────────────────────────────
  function buildIndex() {
    indexEl.innerHTML = `
      <div class="block reveal">
        <div class="index-head">
          <div>
            <h1># pisanvs</h1>
            <p>i'm <span style="color:var(--cyan)">max morel</span>, a kid in chile who likes to keep himself busy doing hard things.
            i dj, produce music, write code, and stream sometimes. this site is a terminal — you can
            <button class="inline" data-run="help">read the manual</button>
            or just click around.</p>
          </div>
          <pre class="ascii-portrait" aria-hidden="true">${PORTRAIT}</pre>
        </div>
      </div>

      <div class="block reveal" style="animation-delay:.15s">
        <h2>## projects</h2>
        <ul>
          <li><span style="color:var(--green)">numotics</span> — building a startup. there's a lot more code behind the scenes than the website lets on.
            <button class="chip" data-run="cat /home/pisanvs/projects/numotics/README.md">cat README</button>
            <button class="chip cyan" data-run="/home/pisanvs/projects/numotics/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">tedxlintacyouth</span> — not just the website. interactive lightning &amp; badges for the event.
            <button class="chip" data-run="cat /home/pisanvs/projects/tedx/README.md">cat README</button>
            <button class="chip cyan" data-run="/home/pisanvs/projects/tedx/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">blog</span> — long-form thinking, on substack.
            <button class="chip cyan" data-run="/home/pisanvs/projects/blog/latest">./latest ↗</button>
          </li>
          <li><span style="color:var(--green-dim)">misc/school-violence</span> — data visualization of school violence statistics in chile.
            <button class="chip cyan" data-run="/home/pisanvs/projects/misc/school-violence/run">./run ↗</button>
          </li>
        </ul>
      </div>

      <div class="block reveal" style="animation-delay:.3s">
        <h2>## tools</h2>
        <ul>
          <li><span style="color:var(--green)">chordid</span> — chord &amp; interval identification. point your mic at a piano, get the chord.
            <button class="chip cyan" data-run="/home/pisanvs/tools/chordid/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">mic-al</span> — frequency response and polar response analyzer. no install. <span style="color:var(--muted)">(beta)</span>
            <button class="chip cyan" data-run="/home/pisanvs/tools/mic-al/run">./run ↗</button>
          </li>
        </ul>
      </div>

      <div class="block reveal" style="animation-delay:.4s">
        <h2>## code</h2>
        <pre class="commit-graph" aria-hidden="true">${commitGraph()}</pre>
        <p>everything else lives in <button class="inline" data-run="cd /home/pisanvs/code">~/code/</button> — every public repo, every weekend project. <button class="inline" data-run="ls /home/pisanvs/code">list them</button>.</p>
      </div>

      <div class="block reveal" style="animation-delay:.45s">
        <h2>## elsewhere</h2>
        <p>find me on
          <a href="https://github.com/pisanvs" target="_blank">github</a>,
          <a href="https://instagram.com/pisanvs" target="_blank">instagram</a>,
          <a href="https://linkedin.com/in/pisanvs" target="_blank">linkedin</a>, and
          <a href="https://pisanvs.substack.com" target="_blank">substack</a>.
          mail: <a href="mailto:maxmorel@pisanvs.cl">maxmorel@pisanvs.cl</a>
          (<button class="inline" data-run="cat ~/me/pubkey.asc">gpg key</button>).</p>
      </div>

      <div class="block reveal" style="animation-delay:.6s">
        <h2>## now</h2>
        <p style="color:var(--green-dim)">${escHtml((CONTENT.now || '').trim())}</p>
      </div>
    `;
  }

  // ── input handling ────────────────────────────────────────────────────
  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    run(v);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      histIdx = Math.max(0, histIdx - 1);
      input.value = history[histIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      histIdx = Math.min(history.length, histIdx + 1);
      input.value = history[histIdx] || '';
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault(); COMMANDS.clear();
    }
  });

  // ── CRT canvas ────────────────────────────────────────────────────────
  function startCRT() {
    const c   = document.getElementById('crt-bg');
    const ctx = c.getContext('2d');
    function resize() { c.width = innerWidth; c.height = innerHeight; }
    resize();
    addEventListener('resize', resize);
    let t = 0;
    (function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = 'rgba(0,255,0,.18)';
      ctx.lineWidth = 1;
      const step   = 36;
      const offset = (t * 0.4) % step;
      for (let y = -step + offset; y < c.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
      }
      for (let x = 0; x < c.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
      }
      t++;
      requestAnimationFrame(tick);
    })();
  }

  // ── boot ──────────────────────────────────────────────────────────────
  buildIndex();
  startCRT();
  input.focus();
})();
```

- [ ] **Step 2: Commit**

```bash
git add terminal.js
git commit -m "feat: add terminal logic (terminal.js)"
```

---

### Task 5: Write `index.html`

**Files:**
- Modify: `index.html` (full replacement)

This replaces the current `index.html` entirely. Key differences from the design prototype:
- Self-hosted Roboto Mono (from `assets/fonts/`) instead of Google Fonts CDN
- `id="path"` added to the prompt path span for dynamic updates
- Script load order: `content.js` → `fs.js` → `terminal.js`
- SEO meta tags preserved from current site

- [ ] **Step 1: Replace `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="pisanvs — max morel. kid in chile. building hard things.">
  <meta name="keywords" content="pisanvs, max morel, DJ, music, programming, Chile">
  <meta name="author" content="pisanvs, maxmorel@pisanvs.cl">
  <meta property="og:title" content="pisanvs">
  <meta property="og:description" content="kid in chile. building hard things.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://pisanvs.cl">
  <meta name="theme-color" content="#000000">
  <title>pisanvs</title>
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WZQJQTH');</script>
  <!-- End Google Tag Manager -->
  <style>
    @font-face {
      font-family: 'Roboto Mono';
      src: url('./assets/fonts/RobotoMono-VariableFont_wght.ttf') format('truetype-variations');
      font-weight: 100 900;
      font-style: normal;
    }
    :root {
      --green:      #0f0;
      --green-dim:  #6c6;
      --green-faint:rgba(0,255,0,.25);
      --cyan:       #18BCBC;
      --orange:     #E58D3C;
      --bg:         #000;
      --fg:         #d8d8d8;
      --muted:      #888;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: var(--bg);
      color: var(--fg);
      font-family: 'Roboto Mono', ui-monospace, monospace;
      font-size: 15px;
      line-height: 1.7;
      min-height: 100vh;
    }
    body::before {
      content: '';
      position: fixed; inset: 0;
      background: repeating-linear-gradient(
        to bottom,
        rgba(0,255,0,0.025) 0 1px,
        transparent 1px 3px
      );
      pointer-events: none;
      z-index: 10;
    }
    #crt-bg { position: fixed; inset: 0; z-index: 0; opacity: 0.12; pointer-events: none; }

    #status {
      position: fixed; top: 10px; right: 14px;
      font-size: 11px; color: var(--green-dim);
      z-index: 5; text-align: right; letter-spacing: 0.02em;
    }
    #status .dot { color: var(--green); animation: blink 2s infinite; }
    @keyframes blink { 50% { opacity: 0.3; } }

    #bios {
      position: fixed; top: 10px; left: 14px;
      font-size: 11px; color: var(--orange); font-weight: 700;
      letter-spacing: 0.1em; z-index: 5;
    }

    main {
      position: relative; z-index: 2;
      max-width: 720px; margin: 0 auto;
      padding: 80px 24px 200px;
    }
    .index-head {
      display: grid; grid-template-columns: 1fr auto;
      gap: 24px; align-items: start; margin-bottom: 1.6em;
    }
    .commit-graph {
      color: var(--green); font-size: 9px; line-height: 1.05;
      letter-spacing: 1px; white-space: pre; margin: 0 0 .6em; opacity: .85;
      user-select: none;
    }
    .ascii-portrait {
      color: var(--green-dim); font-size: 7px; line-height: 1;
      white-space: pre; margin: 0; opacity: .75; user-select: none;
    }
    @media (max-width: 600px) {
      .index-head { grid-template-columns: 1fr; }
      .ascii-portrait { font-size: 6px; }
    }

    .block { margin-bottom: 1.6em; }
    .block h1 { color: var(--orange); margin-bottom: 0.4em; font-weight: 500; font-size: inherit; }
    .block h2 { color: var(--green); margin-bottom: 0.4em; margin-top: 0.6em; font-weight: 500; font-size: inherit; }
    .block p  { color: var(--fg); }
    .block ul { list-style: none; }
    .block li { color: var(--fg); }

    a, button.inline {
      color: var(--cyan); background: none; border: 0; padding: 0;
      font: inherit; cursor: pointer; text-decoration: underline;
      text-decoration-color: rgba(24,188,188,.35);
      text-underline-offset: 2px;
    }
    a:hover, button.inline:hover {
      color: #5fdede;
      text-decoration-color: var(--cyan);
    }

    button.chip {
      display: inline-block; background: transparent;
      border: 1px solid var(--green-faint); color: var(--green);
      font: inherit; font-size: 13px; padding: 1px 8px; margin: 0 2px;
      cursor: pointer; border-radius: 2px;
    }
    button.chip:hover { border-color: var(--green); background: rgba(0,255,0,.06); }
    button.chip.cyan  { color: var(--cyan); border-color: rgba(24,188,188,.3); }
    button.chip.cyan:hover { border-color: var(--cyan); background: rgba(24,188,188,.06); }

    .echo { color: var(--muted); font-size: 13px; margin-top: 1.4em; margin-bottom: 0.4em; }
    .echo .prompt { color: var(--green); }
    .echo .prompt .path { color: var(--cyan); }
    .echo .cmd { color: var(--fg); }

    .out { white-space: pre-wrap; word-break: break-word; }
    .out.faint  { color: var(--green-dim); }
    .out.cyan   { color: var(--cyan); }
    .out.orange { color: var(--orange); }
    .out.err    { color: #f55; }

    .pane { margin: 12px 0; border: 1px solid var(--green-faint); background: rgba(0,20,0,0.2); }
    .pane-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 4px 10px; background: rgba(0,40,0,0.4);
      font-size: 11px; color: var(--green-dim);
    }
    .pane-head button {
      background: transparent; border: 1px solid var(--green-faint);
      color: var(--green-dim); font: inherit; padding: 0 6px; cursor: pointer;
    }
    .pane iframe { display: block; width: 100%; height: 460px; border: 0; background: #fff; }

    #promptbar {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: rgba(0,0,0,0.92); border-top: 1px solid var(--green-faint);
      padding: 10px 24px; z-index: 6;
      display: flex; justify-content: center;
      backdrop-filter: blur(2px);
    }
    #promptbar form {
      width: 100%; max-width: 720px;
      display: flex; gap: 0.5em; align-items: baseline;
    }
    #promptbar .prompt { color: var(--green); font-size: 14px; white-space: nowrap; }
    #promptbar .prompt .path { color: var(--cyan); }
    #input {
      background: transparent; border: 0; outline: 0;
      color: var(--fg); font: inherit; flex: 1;
    }
    #promptbar .hint { font-size: 11px; color: var(--muted); margin-left: auto; }

    @media (max-width: 600px) {
      #promptbar .hint { display: none; }
      #status, #bios  { display: none; }
      main { padding-top: 32px; }
    }

    .reveal { opacity: 0; animation: fadein 0.6s forwards; }
    @keyframes fadein { to { opacity: 1; } }
  </style>
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WZQJQTH" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <!-- End Google Tag Manager (noscript) -->

  <noscript>
<pre style="color:#0f0;padding:24px;font-family:monospace">
# pisanvs — max morel

kid in chile. building hard things. dj, programmer, streamer.

## projects
- numotics        https://numotics.cl
- tedxlintacyouth https://tedxlintacyouth.vercel.app
- blog            https://pisanvs.substack.com

## tools
- chordid         /tools/chordid.html
- mic-al          /tools/mic-al.html

## links
- github          https://github.com/pisanvs
- instagram       https://instagram.com/pisanvs
- linkedin        https://linkedin.com/in/pisanvs

(enable javascript for the interactive version)
</pre>
  </noscript>

  <div id="bios">PISANVS BIOS v2.0</div>
  <div id="status">
    <span class="dot">●</span> online &nbsp; <span id="status-feed">–</span>
  </div>

  <canvas id="crt-bg"></canvas>

  <main>
    <div id="index"></div>
    <div id="log"></div>
  </main>

  <div id="promptbar">
    <form id="form">
      <span class="prompt">pisanvs@cl:<span class="path" id="path">~</span>$</span>
      <input id="input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="type 'help' or click links above" />
      <span class="hint">↑/↓ history · tab complete</span>
    </form>
  </div>

  <script src="./content.js"></script>
  <script src="./fs.js"></script>
  <script src="./terminal.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open `index.html` in browser and verify**

Open `file:///path/to/pisanvs.cl/index.html` in a browser.

Checklist:
- [ ] Page loads with black background and green text
- [ ] `PISANVS BIOS v2.0` visible top-left in orange
- [ ] Blinking green `●` dot top-right
- [ ] CRT scanlines overlay visible (subtle horizontal lines)
- [ ] Animated grid canvas in background
- [ ] Index section visible: `# pisanvs`, bio text, ASCII portrait on right
- [ ] `## projects` section with numotics, tedx, blog, school-violence
- [ ] `## tools` section with chordid, mic-al
- [ ] `## code` section with commit graph
- [ ] `## elsewhere` with links
- [ ] `## now` section with status text
- [ ] Prompt bar fixed at bottom: `pisanvs@cl:~$`

- [ ] **Step 3: Test interactive buttons**

- Click `read the manual` → `help` output appears below
- Click `cat README` on numotics → README text appears
- Click `./run ↗` on numotics → iframe pane opens with numotics.cl
- Click `close` on pane → pane disappears
- Type `ls` in prompt bar → directory listing appears
- Type `cd me` → changes to `~/me/`, shows contents, prompt updates to `pisanvs@cl:~/me$`
- Type `cat bio.md` → bio text appears
- Press `↑` in prompt bar → navigates command history
- Press `Ctrl+L` → clears log

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: replace index.html with terminal UI"
```

---

### Task 6: Copy mic-al tool and add redirects

**Files:**
- Create: `tools/mic-al.html` (copy from Downloads)
- Modify: `me.html` (add redirect)
- Modify: `dev.html` (add redirect)

- [ ] **Step 1: Copy mic-al.html**

```bash
cp ~/Downloads/mic_frequency_polar_analyzer.html tools/mic-al.html
```

Verify it copied:
```bash
ls -lh tools/
```

Expected: both `chordid.html` and `mic-al.html` present.

- [ ] **Step 2: Replace `me.html` with redirect**

Replace the full contents of `me.html` with:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/">
  <title>pisanvs</title>
</head>
<body>
  <p><a href="/">Redirecting…</a></p>
</body>
</html>
```

- [ ] **Step 3: Replace `dev.html` with redirect**

Replace the full contents of `dev.html` with:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/">
  <title>pisanvs</title>
</head>
<body>
  <p><a href="/">Redirecting…</a></p>
</body>
</html>
```

- [ ] **Step 4: Verify redirects**

Open `me.html` and `dev.html` in browser — both should immediately redirect to `/index.html`.

- [ ] **Step 5: Commit**

```bash
git add tools/mic-al.html me.html dev.html
git commit -m "feat: add mic-al tool, redirect me.html and dev.html to /"
```

---

### Task 7: Write GitHub Actions workflow

**Files:**
- Create: `.github/workflows/build.yml`

The workflow runs `build-content.js` only when `content/` or the script itself changes, to avoid triggering on unrelated pushes and to prevent infinite loops.

- [ ] **Step 1: Create `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write `.github/workflows/build.yml`**

```yaml
name: Build content.js

on:
  push:
    branches: [main]
    paths:
      - 'content/**'
      - 'scripts/build-content.js'

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build content.js
        run: node scripts/build-content.js

      - name: Commit content.js if changed
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add content.js
          git diff --staged --quiet || git commit -m "chore: rebuild content.js [skip ci]"
          git push
```

The `[skip ci]` tag in the commit message prevents the workflow from re-triggering on the `content.js` commit.

- [ ] **Step 3: Verify `content.js` is in `.gitignore` is NOT the case**

```bash
grep -r "content.js" .gitignore 2>/dev/null || echo "not in gitignore — good"
```

`content.js` must be committed and tracked (it's the generated file GitHub Pages will serve).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "feat: add GitHub Actions workflow to rebuild content.js on push"
```

---

### Task 8: Final smoke test and push

- [ ] **Step 1: Run full local verification**

```bash
# Rebuild content.js from scratch to confirm script still works
node scripts/build-content.js

# Confirm all expected keys
node -e "
const src = require('fs').readFileSync('content.js','utf8');
eval(src);
const required = ['bio','contact','pubkey','now'];
const reqP = ['numotics','tedx','blog','schoolViolence'];
const reqT = ['chordid','micAl'];
required.forEach(k => { if (!CONTENT[k]) throw new Error('missing: ' + k); });
reqP.forEach(k => { if (!CONTENT.projects[k]) throw new Error('missing projects.' + k); });
reqT.forEach(k => { if (!CONTENT.tools[k]) throw new Error('missing tools.' + k); });
console.log('all keys present ✓');
"
```

Expected: `all keys present ✓`

- [ ] **Step 2: Open `index.html` in browser for final check**

Final checklist:
- [ ] Entire page renders without JS errors (check DevTools console)
- [ ] `cat ~/me/pubkey.asc` in prompt outputs the real GPG key
- [ ] `cd projects` then `ls` shows: `numotics/  tedx/  blog/  misc/`
- [ ] `cd misc/school-violence` then `./run` opens iframe with `/school-violence.html`
- [ ] `cd /home/pisanvs/tools` then `ls` shows: `chordid/  mic-al/`
- [ ] `./run` in `tools/mic-al/` opens `/tools/mic-al.html`
- [ ] Mobile: page readable, prompt bar functional, `#status` and `#bios` hidden at ≤600px

- [ ] **Step 3: Verify git status is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

- [ ] **Step 4: Push to main**

```bash
git push origin main
```

After push, verify on GitHub:
- Actions tab shows workflow triggered (if `content/` files were changed)
- Pages deploys successfully (check Actions → pages build and deployment)
- Live site at `pisanvs.cl` shows the new terminal UI

---

## File Responsibility Summary

| File | Responsibility |
|---|---|
| `content/*.md` | All human-readable copy — edit these |
| `scripts/build-content.js` | Converts `content/` to `content.js` |
| `content.js` | Generated global `CONTENT` object |
| `fs.js` | Virtual filesystem tree (structure + exec logic) |
| `terminal.js` | Commands, rendering, CRT animation, index page builder |
| `index.html` | HTML shell + CSS design tokens |
| `.github/workflows/build.yml` | Auto-regenerates `content.js` on push |
