// Virtual filesystem for pisanvs.cl terminal.
// Loaded after content.js — CONTENT global must exist.
const FS = {
  '/home/pisanvs': {
    type: 'dir',
    children: ['me', 'projects', 'tools', 'code', 'now', 'books', 'vinyls'],
  },

  // ── me ──────────────────────────────────────────────────────────────
  '/home/pisanvs/me': {
    type: 'dir',
    children: ['bio.md', 'contact.txt', 'socials', 'pubkey.asc', 'wantlist'],
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
  '/home/pisanvs/me/wantlist': {
    type: 'exec',
    describe: 'print discogs wantlist',
    run: (term) => {
      const list = window._WANTLIST;
      if (!list) { term.print('wantlist loading — try again in a moment', 'faint'); return; }
      term.print(`discogs wantlist (${list.length})`, 'muted');
      list.forEach(r => {
        const year = r.year ? ` (${r.year})` : '';
        term.print(`  ${r.artist} — ${r.title}${year}`, 'cyan');
      });
    },
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
    children: ['stick', 'numotics', 'tedx', 'iypt', 'la-clase', 'blog', 'misc'],
  },

  '/home/pisanvs/projects/stick': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/projects/stick/README.md': {
    type: 'file',
    content: CONTENT.projects.stick,
  },
  '/home/pisanvs/projects/stick/run': {
    type: 'exec',
    describe: 'open stick learning',
    run: (term) => { window.open('https://sticklearning.ai', '_blank', 'noopener'); term.print('opening sticklearning.ai…', 'faint'); },
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

  '/home/pisanvs/projects/iypt': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/projects/iypt/README.md': {
    type: 'file',
    content: CONTENT.projects.iypt,
  },
  '/home/pisanvs/projects/iypt/run': {
    type: 'exec',
    describe: 'open iypt.pisanvs.cl',
    run: (term) => { term.openPane('https://iypt.pisanvs.cl', 'IYPT Chile'); },
  },

  '/home/pisanvs/projects/la-clase': {
    type: 'dir',
    children: ['README.md', 'run'],
  },
  '/home/pisanvs/projects/la-clase/README.md': {
    type: 'file',
    content: CONTENT.projects.laClase,
  },
  '/home/pisanvs/projects/la-clase/run': {
    type: 'exec',
    describe: 'open laclase.indies.la',
    run: (term) => { window.open('https://laclase.indies.la', '_blank', 'noopener'); term.print('opening laclase.indies.la…', 'faint'); },
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
    run: (term) => { window.open('https://pisanvs.substack.com', '_blank', 'noopener'); term.print('opening pisanvs.substack.com…', 'faint'); },
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

  // ── code ─────────────────────────────────────────────────────────────
  '/home/pisanvs/code': {
    type: 'dir',
    lazy: true,
    children: [],
  },

  // ── now ──────────────────────────────────────────────────────────────
  '/home/pisanvs/now': {
    type: 'file',
    content: CONTENT.now,
  },

  // ── books ─────────────────────────────────────────────────────────────
  '/home/pisanvs/books': {
    type: 'dir',
    redirect: '/books.html',
    children: [],
    describe: 'open books page',
  },

  // ── vinyls ────────────────────────────────────────────────────────────
  '/home/pisanvs/vinyls': {
    type: 'dir',
    redirect: '/vinyls.html',
    children: [],
    describe: 'open vinyls page',
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
