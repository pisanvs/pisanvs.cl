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
          <a class="pane-btn" href="${escHtml(url)}" target="_blank" rel="noopener">new tab</a>
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
    whoami() { out('pisanvs — max morel · cto @ stick · building things that scale', 'cyan'); },
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

      if (n.lazy && !n._expanded) {
        const loadingEl = out('fetching github repos…', 'faint');
        expandCodeDir().then(() => {
          loadingEl.remove();
          COMMANDS.ls(arg);
          scrollToEnd();
        }).catch(err => {
          loadingEl.textContent = `error: ${err.message}`;
        });
        return;
      }

      const items = (n.children || []).filter(name => !node(target + '/' + name)?.hidden);
      if (items.length === 0) { out('(empty)'); return; }
      const html = items.map(name => {
        const full = target + '/' + name;
        const ch   = node(full);
        if (!ch) return escHtml(name);
        const color   = ch.label ? 'var(--muted)' : ch.type === 'dir' ? 'var(--cyan)' : ch.type === 'exec' ? 'var(--green)' : 'var(--fg)';
        const suffix  = ch.label ? '' : ch.type === 'dir' ? '/' : ch.type === 'exec' ? '*' : '';
        const display = ch.label || (ch.type === 'exec' ? './' + name : name);
        const cmd     = ch.type === 'dir' ? `cd ${name}` : ch.type === 'exec' ? `./${name}` : `cat ${name}`;
        return `<button class="inline" data-run="${escHtml(cmd)}" style="color:${color};text-decoration:none">${escHtml(display)}${suffix}</button>`;
      }).join('   ');
      outHTML(html);
    },

    cd(arg) {
      const target = resolve(arg || '~');
      const n = node(target);
      if (!n)               return out(`cd: ${arg}: no such file or directory`, 'err');
      if (n.type !== 'dir') return out(`cd: ${arg}: not a directory`, 'err');
      if (n.redirect)       { window.location.href = n.redirect; return; }
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
      if (n.type === 'dir')  return out(`cat: ${arg}: is a directory`, 'err');
      if (n.type === 'exec') return out(`cat: ${arg}: binary file`, 'err');
      out(n.content || '');
    },

    man() { COMMANDS.help(); },
  };

  function runExec(absPath) {
    const n = node(absPath);
    if (!n || n.type !== 'exec') return out(`${absPath}: not executable`, 'err');
    n.run(term);
  }

  // ── live data helpers ─────────────────────────────────────────────────
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  const nowData = { push: null, post: null, track: null };
  function renderNow() {
    const el = document.getElementById('now-text');
    if (!el) return;
    const parts = [nowData.push, nowData.post, nowData.track].filter(Boolean);
    if (parts.length) el.innerHTML = parts.join(' <span style="color:var(--muted)">·</span> ');
  }

  // ── github api ────────────────────────────────────────────────────────
  async function expandCodeDir(page = 1) {
    const codeDir = HOME + '/code';
    const dirNode = FS[codeDir];
    if (page === 1) {
      if (dirNode._expanded) return;
      dirNode._expanded = true;
    }
    const res = await fetch(`https://api.github.com/users/pisanvs/repos?sort=updated&per_page=10&type=public&page=${page}`);
    if (!res.ok) { if (page === 1) dirNode._expanded = false; throw new Error(`github api ${res.status}`); }
    const repos = await res.json();
    // Remove old load-more entry
    dirNode.children = dirNode.children.filter(n => n !== '__more__');
    delete FS[codeDir + '/__more__'];
    const names = repos.map(repo => {
      FS[`${codeDir}/${repo.name}`] = {
        type: 'exec',
        describe: repo.description || repo.name,
        run: (t) => { window.open(repo.html_url, '_blank', 'noopener'); t.print(`opening ${repo.html_url}…`, 'faint'); },
      };
      return repo.name;
    });
    if (page === 1) dirNode.children = names;
    else dirNode.children.push(...names);
    if (repos.length === 10) {
      FS[codeDir + '/__more__'] = {
        type: 'exec',
        label: '… more',
        describe: `load page ${page + 1}`,
        run: (t) => {
          const loadEl = t.print('fetching more repos…', 'faint');
          expandCodeDir(page + 1).then(() => {
            loadEl.remove();
            COMMANDS.ls();
            scrollToEnd();
          }).catch(e => { loadEl.textContent = `error: ${e.message}`; });
        },
      };
      dirNode.children.push('__more__');
    }
  }

  async function fetchRealGraph() {
    const graphEl = document.querySelector('.commit-graph');
    if (!graphEl) return;
    const res = await fetch('https://github-contributions-api.jogruber.de/v4/pisanvs?y=last');
    if (!res.ok) return;
    const data = await res.json();
    const contribs = data.contributions || [];
    const ramp = ' ░▒▓█';
    const rows = [];
    for (let d = 0; d < 7; d++) {
      let row = '';
      for (let w = 0; w < 53; w++) {
        const c = contribs[w * 7 + d];
        row += ramp[Math.min(4, c ? c.level : 0)];
      }
      rows.push(row);
    }
    graphEl.textContent = rows.join('\n');
  }

  async function fetchActivity() {
    const feedEl = document.getElementById('status-feed');
    const res = await fetch('https://api.github.com/users/pisanvs/events/public?per_page=15');
    if (!res.ok) return;
    const events = await res.json();
    const latest = events[0];
    if (!latest) return;
    const repo = latest.repo.name.replace('pisanvs/', '');
    let label;
    switch (latest.type) {
      case 'PushEvent':        label = `pushed → ${repo}`; break;
      case 'CreateEvent':      label = `created ${latest.payload.ref_type} in ${repo}`; break;
      case 'PullRequestEvent': label = `${latest.payload.action} PR in ${repo}`; break;
      case 'IssuesEvent':      label = `${latest.payload.action} issue in ${repo}`; break;
      case 'WatchEvent':       label = `starred ${repo}`; break;
      case 'ForkEvent':        label = `forked ${repo}`; break;
      case 'ReleaseEvent':     label = `released ${repo}`; break;
      default:                 label = `${latest.type.replace('Event','').toLowerCase()} ${repo}`;
    }
    const ago = timeAgo(latest.created_at);
    if (feedEl) feedEl.textContent = `${label} · ${ago}`;
    const pushEvent = events.find(e => e.type === 'PushEvent');
    if (pushEvent) {
      const pushRepo = pushEvent.repo.name.replace('pisanvs/', '');
      nowData.push = `last push → ${pushRepo} · ${timeAgo(pushEvent.created_at)}`;
      renderNow();
    }
  }

  // ── worker: centralised live data ────────────────────────────────────
  // Deployed at live.pisanvs.cl
  // Set custom domain live.pisanvs.cl in Cloudflare dashboard when ready
  const LIVE_URL = 'https://live.pisanvs.cl';
  async function fetchLive() {
    const res = await fetch(LIVE_URL);
    if (!res.ok) return;
    const data = await res.json();

    if (data.track) {
      const { artist, name, nowplaying, url, timestamp } = data.track;
      const label = `${nowplaying ? '▶' : '↺'} ${escHtml(artist)} — ${escHtml(name)}`;
      const suffix = (!nowplaying && timestamp) ? ` · ${timeAgo(timestamp)}` : '';
      const cls = nowplaying ? 'track-now' : 'track-past';
      nowData.track = label + suffix;
      renderNow();
      const trackEl = document.getElementById('status-track');
      if (trackEl) trackEl.innerHTML = `<a href="${escHtml(url)}" target="_blank" rel="noopener"><span class="${cls}">${label}${escHtml(suffix)}</span></a>`;
    }

    if (data.post) {
      const { title, link } = data.post;
      nowData.post = `latest post: <a href="${escHtml(link)}" target="_blank" rel="noopener">"${escHtml(title)}"</a>`;
      renderNow();
    }

    if (Array.isArray(data.wantlist) && data.wantlist.length) {
      window._WANTLIST = data.wantlist;
    }

    if (data.books) {
      window._BOOKS = data.books;
    }
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
    const ramp = ' ░▒▓█';
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
  const PORTRAIT = `               .,'^"',,^',.
             ':--~;~=+-+%-"^',
           ,;==~:^..'+@@*;~;~-~;,
         ,:+*+-;"'.,:=;;--~~---++^.
       ,:++=++-;:, '~:""=*=~~-==*#~.
      "-=+=#*=+"  ,;==+-~;"^^~###*%~.,
     :*=++#*+#;^~+%@@@@@%#+-"^+@%##%;..
    "%+++*#**=~%@@@%%%%%@@@@%~~%%%%%@-,
   .+#+=+**++-%@%%%@@@@@@%%%%+=%@%%%%@=
   ~%*++=*=*=+@%@@@@@@@%%%%%%+=*%##@%%@^
  ^#*=**-+=*=%@@@@@@@%@@@@@@%**-#*+@%%%=
 .;~~**-=**-:+*#%@@@@@%#++++#%%+%++%@%%+.
 ^^,=%=~*++;=++*%@%@@#=--=+-+#%%%++#%%%#^
.,.:++-+#*~"=~~%@%@@**%%*~-+*#%%%=+#%@%%:
. .:;-=%*+-#@@@@%@@@#%%%%*#+#@%%@*-*%@@@%"
. ,':~*#~+*@%@%@@@%%%*@@@@@@@%%@#%-:;=+#%#~'
...,'^-:~#@%@%@%%@@@%*+%%%%%%%+#%#%=":~--+-'
    .'^~+#%%%%@%%%#;";-%%%@%@%:,~=*%%##%+".
    .";:=#%%%@@@@@#+*#%@@%@%#+,  ,^-#%@%*,
   ,:~^,^%%%%**%%@@@##+-#%@#+;  .  '-+=**"
   '',,. ~@%@%%%%%%%##*#%@%=~^    ,.^+:,',
      .'  =%%@@@@@%%%*+%@#=~:'    ...',
       ,  "@%@@@@@@@%*#%#+=;',  ,:"::
       '^ "@%@@@@@%%@@@%@#~"-^ .:@#@~
      .,''^@%%%%%@@@%#@%-";#@; ,,~=*'
        . '%@%%#=;"^.'",,~%@%;   .;:
           #@%@@@#=;^'';#@@%@"  ,::.
           *@%@%@@@@@%%@@%%%#.^::"""'.
          ,#%%@@@%%%%@@%%@%%- ":"'  .',',,
          -@%@@@@@@@@%%%%%@@; '"^.     .,'^^'.
          #%%@@@@@@@@@@@@@#;.   ,         .,''''',.
         ,%@%@@@@@@@@@%%=".                   .,''^',. `;

  // ── index page ───────────────────────────────────────────────────────
  function buildIndex() {
    indexEl.innerHTML = `
      <div class="block reveal">
        <div class="index-head">
          <div>
            <h1># pisanvs</h1>
            <p>i'm <span style="color:var(--cyan)">max morel</span>, a kid in chile building things that make me passionate.
            currently cto @ <span style="color:var(--green)">stick</span>, we're making learning more frictionless.
            i write code, play music sometimes, and keep myself busy doing math and training various forms of AI. this site is a terminal — <button class="inline" data-run="help">read the manual</button>
            or just click around.</p>
          </div>
          <pre class="ascii-portrait" aria-hidden="true">${PORTRAIT}</pre>
        </div>
      </div>

      <div class="block reveal" style="animation-delay:.08s">
        <button class="chip" data-run="cd ~/books">📚 my books</button>
        <button class="chip cyan" data-run="cd ~/vinyls">🎵 my vinyls</button>
      </div>

      <div class="block reveal" style="animation-delay:.15s">
        <h2>## projects</h2>
        <ul>
          <li><span style="color:var(--green)">stick</span> — edtech. making learning more frictionless. <span style="color:var(--muted)">cto</span>
            <span class="chip" style="color:var(--muted);border-color:var(--muted);cursor:default">stealth</span>
          </li>
          <li><span style="color:var(--green)">numotics</span> — home automation startup. hardware, firmware, cloud, full app. <span style="color:var(--muted)">founder</span>
            <button class="chip" data-run="cat /home/pisanvs/projects/numotics/README.md">cat README</button>
            <button class="chip cyan" data-run="/home/pisanvs/projects/numotics/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">tedxlintacyouth</span> — founded and led the event. first time organizer — 3 sponsors, highest NPS nationally, highlighted by TED. <span style="color:var(--muted)">lead organizer</span>
            <button class="chip" data-run="cat /home/pisanvs/projects/tedx/README.md">cat README</button>
            <button class="chip cyan" data-run="/home/pisanvs/projects/tedx/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">iypt chile</span> — international young physicists' tournament, chilean chapter. <span style="color:var(--muted)">co-organizer</span>
            <button class="chip" data-run="cat /home/pisanvs/projects/iypt/README.md">cat README</button>
            <button class="chip cyan" data-run="/home/pisanvs/projects/iypt/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">la clase 2.0</span> — one week, successful founders teaching the next generation. originally a real university class.
            <button class="chip cyan" data-run="/home/pisanvs/projects/la-clase/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">blog</span> — long-form thinking, on substack.
            <button class="chip cyan" data-run="/home/pisanvs/projects/blog/latest">./latest ↗</button>
          </li>
        </ul>
      </div>

      <div class="block reveal" style="animation-delay:.3s">
        <h2>## misc</h2>
        <ul>
          <li><span style="color:var(--green)">chordid</span> — play a chord and have it ID'd for you.
            <button class="chip cyan" data-run="/home/pisanvs/tools/chordid/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green)">mic-al</span> — frequency response and polar response analyzer. no install. <span style="color:var(--muted)">(beta)</span>
            <button class="chip cyan" data-run="/home/pisanvs/tools/mic-al/run">./run ↗</button>
          </li>
          <li><span style="color:var(--green-dim)">school-violence</span> — data visualization of school violence statistics in chile.
            <button class="chip cyan" data-run="/home/pisanvs/projects/misc/school-violence/run">./run ↗</button>
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
        <p id="now-text" style="color:var(--green-dim)">${escHtml((CONTENT.now || '').trim())}</p>
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
  fetchActivity().catch(() => {});
  fetchRealGraph().catch(() => {});
  fetchLive().catch(() => {});
})();
