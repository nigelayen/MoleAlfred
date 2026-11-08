#!/usr/bin/osascript -l JavaScript
// Alfred Script Filter for Mole (https://github.com/tw93/Mole)
ObjC.import('Foundation');
const app = Application.currentApplication();
app.includeStandardAdditions = true;

const env = $.NSProcessInfo.processInfo.environment.js;
const getenv = (k, d) => (env[k] ? ObjC.unwrap(env[k]) : d);
const MO = getenv('mo_path', '') || ['/opt/homebrew/bin/mo', '/usr/local/bin/mo'].find(p => $.NSFileManager.defaultManager.fileExistsAtPath(p)) || 'mo';
const CACHE = getenv('alfred_workflow_cache', '/tmp/mole-alfred');
const ICONS = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/';
const icon = n => ({ path: ICONS + n + '.icns' });
const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";

function sh(cmd) {
  return app.doShellScript('export PATH=/opt/homebrew/bin:/usr/local/bin:$PATH; ' + cmd + ' 2>/dev/null');
}
function cached(name, maxAgeSec, cmd) {
  const f = CACHE + '/' + name;
  sh('mkdir -p ' + q(CACHE));
  const fresh = sh(`[ -f ${q(f)} ] && [ $(( $(date +%s) - $(stat -f %m ${q(f)}) )) -lt ${maxAgeSec} ] && echo y || echo n`) === 'y';
  if (!fresh) sh(`${cmd} > ${q(f)}.tmp && mv ${q(f)}.tmp ${q(f)}`);
  return sh('cat ' + q(f));
}
const gb = b => (b / 1e9).toFixed(1) + ' GB';
const out = (items, extra) => JSON.stringify(Object.assign({ items }, extra || {}));

// [subcommand, title, subtitle, icon, dry-run supported, accepts argument, dry-run subcommand override]
const COMMANDS = [
  ['clean', 'Clean', 'Free up disk space (caches, logs, temp files, leftovers)', 'FullTrashIcon', true],
  ['uninstall', 'Uninstall', 'Remove apps completely — type a name to search apps', 'ToolbarDeleteIcon', true, true],
  ['optimize', 'Optimize', 'Refresh caches and services', 'ToolbarAdvanced', true],
  ['analyze', 'Analyze', 'Explore disk usage — optionally type a path', 'SidebarInternalDisk', false, true],
  ['status', 'Status', 'Monitor system health — live stats shown in Alfred', 'ToolbarInfo', false, true],
  ['history', 'History', 'Review recent cleanup activity', 'Clock', false, true],
  ['purge', 'Purge', 'Remove old project artifacts (node_modules, build dirs…)', 'DeveloperFolderIcon', true],
  ['installer', 'Installer', 'Find and remove installer files (.dmg, .pkg)', 'DownloadsFolder', true],
  ['slim', 'Slim', 'Remove Intel code from universal apps', 'GenericApplicationIcon', true],
  ['touchid', 'Touch ID', 'Configure Touch ID for sudo', 'LockedIcon', true, false, 'touchid enable --dry-run'],
  ['update', 'Update', 'Update Mole to the latest version', 'ToolbarCustomizeIcon', false],
  ['', 'Main Menu', 'Open the interactive Mole menu', 'General', false],
];

function commandItems(filter) {
  // Typing "dry" or "preview" lists only the --dry-run variants as visible results.
  const dryOnly = /\b(dry|preview)/.test(filter);
  const f = filter.replace(/\b(dry-?run|dry|preview)\b/g, '').trim();
  return COMMANDS.filter(c => (!dryOnly || c[4]) && (!f || (c[0] + ' ' + c[1]).toLowerCase().includes(f)))
    .map(([cmd, title, sub, ic, dry, takesArg, dryCmd]) => {
      const full = (MO + ' ' + cmd).trim();
      const dryFull = dry ? MO + ' ' + (dryCmd || cmd + ' --dry-run') : '';
      const item = {
        uid: 'mole-' + (cmd || 'menu') + (dryOnly ? '-dry' : ''),
        title: dryOnly ? title + ' (dry run)' : title,
        subtitle: dryOnly ? 'Preview only, makes no changes' : sub + (dry ? ' · ⌘↵ preview' : ''),
        icon: icon(ic),
        arg: dryOnly ? dryFull : full, autocomplete: cmd ? cmd + ' ' : '', valid: true,
        text: { copy: dryOnly ? dryFull : full }, variables: { mode: 'terminal' },
        mods: {
          cmd: dry ? { arg: dryOnly ? full : dryFull, subtitle: dryOnly ? '⌘ Run for real' : '⌘ Preview only (--dry-run)', valid: true }
                   : { subtitle: 'No dry-run for this command', valid: false },
        },
      };
      return item;
    });
}

function statusItems() {
  let d;
  try { d = JSON.parse(sh(q(MO) + ' status --json')); } catch (e) { return [errItem('Could not read mo status --json')]; }
  const open = { arg: MO + ' status', valid: true, variables: { mode: 'terminal' } };
  const it = (title, subtitle, ic, copy) => Object.assign({ title, subtitle, icon: icon(ic), text: { copy: copy || title, largetype: title + '\n' + subtitle } }, open);
  const m = d.memory || {}, c = d.cpu || {}, h = d.hardware || {};
  const items = [
    it(`Health: ${d.health_score} — ${d.health_score_msg}`, `${h.model || ''} · ${h.cpu_model || ''} · ${h.os_version || ''} · up ${d.uptime} · ↵ open dashboard`, 'ToolbarInfo'),
    it(`CPU: ${c.usage.toFixed(1)}%`, `Load ${c.load1.toFixed(2)} / ${c.load5.toFixed(2)} / ${c.load15.toFixed(2)} · ${c.core_count} cores (${c.p_core_count}P + ${c.e_core_count}E)`, 'ToolbarAdvanced'),
    it(`Memory: ${m.used_percent.toFixed(0)}% used`, `${gb(m.used)} of ${gb(m.total)} · ${gb(m.available)} available · swap ${gb(m.swap_used)}${m.pressure ? ' · pressure ' + m.pressure : ''}`, 'GenericApplicationIcon'),
  ];
  (d.disks || []).forEach(k => items.push(it(`Disk ${k.mount}: ${k.used_percent.toFixed(0)}% used`,
    `${gb(k.total - k.used)} free of ${gb(k.total)} · ${k.fstype}${k.purgeable ? ' · ' + gb(k.purgeable) + ' purgeable' : ''} · SMART ${k.smart_status}`,
    k.external ? 'SidebarExternalDisk' : 'SidebarInternalDisk')));
  if (d.trash_size !== undefined) items.push(it(`Trash: ${gb(d.trash_size)}${d.trash_approx ? ' (approx.)' : ''}`, '↵ open dashboard', 'TrashIcon'));
  (d.batteries || []).forEach(b => items.push(it(`Battery: ${b.percent ?? b.level ?? '?'}%`, JSON.stringify(b).slice(0, 120), 'ToolbarInfo')));
  const top = (d.top_processes || []).slice(0, 5).map(p => `${p.name} ${p.cpu}%`).join(' · ');
  if (top) items.push(it('Top processes', top, 'GenericApplicationIcon', top));
  return items;
}

function uninstallItems(filter) {
  let apps;
  try { apps = JSON.parse(cached('apps.json', 600, q(MO) + ' uninstall --list')); } catch (e) { return [errItem('Could not read mo uninstall --list')]; }
  const f = filter.toLowerCase();
  const items = apps.filter(a => !f || a.name.toLowerCase().includes(f) || a.uninstall_name.toLowerCase().includes(f))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(a => {
      const cmd = `${MO} uninstall ${q(a.uninstall_name)}`;
      return {
        uid: 'app-' + a.bundle_id, title: 'Uninstall ' + a.name,
        subtitle: `${a.source}${a.size && a.size !== '--' ? ' · ' + a.size : ''} · ${a.path}`,
        icon: { type: 'fileicon', path: a.path }, arg: cmd, valid: true,
        quicklookurl: a.path, variables: { mode: 'terminal' }, text: { copy: cmd },
        mods: {
          cmd: { arg: `${MO} uninstall --dry-run ${q(a.uninstall_name)}`, subtitle: '⌘ Preview only (--dry-run)', valid: true },
          alt: { arg: `${MO} uninstall --with-data ${q(a.uninstall_name)}`, subtitle: '⌥ Uninstall with personal data selected', valid: true },
          ctrl: { arg: a.path, subtitle: '⌃ Reveal in Finder', valid: true, variables: { mode: 'reveal' } },
        },
      };
    });
  if (!f) items.unshift({ title: 'Open interactive app selector', subtitle: 'mo uninstall', icon: icon('ToolbarDeleteIcon'), arg: MO + ' uninstall', valid: true, variables: { mode: 'terminal' } });
  return items.length ? items : [errItem('No matching apps', 'App list is cached for 10 minutes')];
}

function analyzeItems(path) {
  const p = path || '';
  return [{
    title: p ? 'Analyze ' + p : 'Analyze whole machine', subtitle: p ? 'Explore disk usage of this path' : 'Type a path (e.g. ~/Library or /Volumes) to scan only that',
    icon: icon('SidebarInternalDisk'), arg: `${MO} analyze${p ? ' ' + q(p.replace(/^~/, getenv('HOME', '~'))) : ''}`, valid: true, variables: { mode: 'terminal' },
  }];
}

function historyItems() {
  let d;
  try { d = JSON.parse(sh(q(MO) + ' history --json --limit 20')); } catch (e) { return [errItem('Could not read mo history --json')]; }
  const items = (d.sessions || []).map(s => ({
    title: `${s.command} — ${s.items} items, ${s.size}`,
    subtitle: `${s.started_at} · removed ${s.actions.removed}, trashed ${s.actions.trashed}, failed ${s.actions.failed} · ↵ open full history`,
    icon: icon('Clock'), arg: MO + ' history', valid: true, variables: { mode: 'terminal' },
  }));
  if (d.logs) items.push({ title: 'Open deletions log', subtitle: d.logs.deletions, icon: icon('Clock'), arg: d.logs.deletions, valid: true, type: 'file', variables: { mode: 'open' } });
  return items.length ? items : [errItem('No history yet')];
}

function errItem(title, subtitle) { return { title, subtitle: subtitle || `Using: ${MO}`, valid: false, icon: icon('AlertCautionBadgeIcon') }; }

function run(argv) {
  const query = (argv[0] || '').replace(/^\s+/, '');
  const m = query.match(/^(\S+)\s+(.*)$/s);
  const sub = (m ? m[1] : '').toLowerCase(), rest = m ? m[2].trim() : '';
  if (sub === 'status') return out(statusItems(), { rerun: 2 });
  if (sub === 'uninstall') return out(uninstallItems(rest));
  if (sub === 'analyze') return out(analyzeItems(rest));
  if (sub === 'history') return out(historyItems());
  return out(commandItems(query.trim().toLowerCase()));
}
