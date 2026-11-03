/* Settings editor shell: sidebar, header, pages, search. */
(() => {
	const SE = window.SE;
	const { h, icon, state } = SE;
	const CFG = SE.config;
	const FILTERS = [
		['@modified', 'Modified'], ['@tag:experimental', 'Experimental'], ['@tag:preview', 'Preview'], ['@tag:advanced', 'Advanced'],
		['@deprecated', 'Deprecated'], ['@managed', 'Managed by organization'], ['@policy', 'Can be managed by policy'], ['@agentsWindow', 'Agents window defaults'], ['@tag:onExp', 'Experiment-controlled'],
		['@ext:', 'Extension...'],
	];

	let root, nav, scroller, content, searchInput, countBadge, tabsEl;

	/* ---------- search ---------- */
	function parseQuery(q) {
		const tokens = q.trim().split(/\s+/).filter(Boolean);
		return { filters: tokens.filter((t) => t.startsWith('@')).map((t) => t.toLowerCase()), words: tokens.filter((t) => !t.startsWith('@')).map((t) => t.toLowerCase()) };
	}
	function hay(s) {
		if (!s._hay) {
			const { label, prefix } = SE.labelOf(s, []);
			s._label = (prefix + ' ' + label).toLowerCase();
			s._hay = [s.k, s._label, s.md || '', (s.kw || []).join(' '), (s.e || []).join(' '), s.ext || ''].join(' ').toLowerCase();
		}
		return s._hay;
	}
	function passesFilter(s, f) {
		if (f === '@modified') { return SE.isModified(s, 'user') || SE.isModified(s, 'workspace'); }
		if (f === '@tag:experimental') { return s.isExperimental; }
		if (f === '@tag:preview') { return s.isPreview; }
		if (f === '@tag:advanced') { return s.isAdvanced; }
		if (f === '@tag:onexp') { return s.isOnExp; }
		if (f === '@deprecated') { return s.isDeprecated; }
		if (f === '@policy') { return !!s.pol; }
		if (f === '@managed') { return SE.isPolicyManaged(s); }
		if (f === '@agentswindow') { return !!s.aw; }
		if (f.startsWith('@ext:')) { return !!s.extId && s.extId.toLowerCase().includes(f.slice(5)); }
		if (f.startsWith('@id:')) { return s.k.toLowerCase() === f.slice(4); }
		return true;
	}
	function search(q) {
		const { filters, words } = parseQuery(q);
		const revealHidden = filters.some((f) => f === '@tag:advanced' || f === '@deprecated');
		const results = [];
		for (const s of SE.settings) {
			if (!revealHidden && !SE.visible(s) && !words.length) { continue; }
			if (!filters.every((f) => passesFilter(s, f))) { continue; }
			const hs = hay(s);
			if (!words.every((w) => hs.includes(w))) { continue; }
			let score = 0;
			for (const w of words) {
				if (s.k.toLowerCase() === w) { score += 100; }
				if (s._label.includes(w)) { score += 10; }
				if (s.k.toLowerCase().includes(w)) { score += 5; }
			}
			if (!SE.visible(s)) { score -= 3; }
			results.push({ s, score });
		}
		return { results, words, filters };
	}

	/* ---------- nav ---------- */
	function countFor(cat) {
		if (state.query) { return (state.searchCounts || {})[cat.id] || 0; }
		return SE.settingsIn(cat.id).filter(SE.visible).length;
	}
	function subsWithCounts(cat) {
		if (cat.id === 'popular') { return []; }
		const list = SE.settingsIn(cat.id).filter(SE.visible);
		const byCat = cat.id === 'modified' || cat.id === 'managed';
		const subs = byCat ? SE.categories.concat(SE.specials.EXPERIMENTAL) : cat.subs;
		return subs.map((sub) => ({ sub, n: list.filter((s) => (byCat ? s.cat === sub : s.sub === sub)).length })).filter((x) => x.n > 0);
	}
	function navItem(cat) {
		const active = !state.query && state.cat === cat.id;
		const n = countFor(cat);
		const item = h('div.se-nav-item' + (active ? '.active' : '') + (state.query && !n ? '.empty' : ''), {
			role: 'treeitem', tabindex: active ? '0' : '-1', 'aria-selected': String(active), 'data-cat': cat.id,
			onClick: () => go(cat.id),
		}, icon(cat.icon, 'se-nav-icon'), h('span.se-nav-label', null, cat.navLabel || cat.label), n ? h('span.se-nav-count', null, String(n)) : null);
		const out = [item];
		if (active && CFG.nav === 'tree') {
			const subs = subsWithCounts(cat);
			if (subs.length > 1) {
				out.push(h('div.se-nav-subs', { role: 'group' }, subs.map(({ sub, n: sn }) => h('div.se-nav-sub', {
					role: 'treeitem', tabindex: '-1', 'data-sub': sub.id,
					onClick: (e) => { e.stopPropagation(); scrollToGroup(sub.id); },
				}, h('span.se-nav-label', null, sub.label), h('span.se-nav-count', null, String(sn))))));
			}
		}
		return out;
	}
	function renderNav() {
		const { POPULAR, EXPERIMENTAL, MODIFIED } = SE.specials;
		nav.replaceChildren(
			h('div.se-nav-list', { role: 'tree', 'aria-label': 'Settings categories' },
				navItem(POPULAR),
				h('div.se-nav-sep'),
				SE.categories.map(navItem),
				h('div.se-nav-sep'),
				navItem(EXPERIMENTAL),
				navItem(MODIFIED),
				SE.specials.MANAGED ? navItem(SE.specials.MANAGED) : null),
			h('div.se-nav-footer', null,
				h('button.se-nav-footer-btn', { type: 'button', onClick: () => openJson() }, icon('json'), 'Open Settings (JSON)')));
	}

	/* ---------- pages ---------- */
	/** Advanced / deprecated settings that are tucked away (modified ones always stay inline). */
	const tuckKind = (s) => SE.visible(s) ? null : s.isDeprecated ? 'deprecated' : 'advanced';
	const revealKey = (cat, sub, kind) => `${cat.id}/${sub.id}:${kind}`;
	const TUCKED = [['advanced', 'Advanced'], ['deprecated', 'Deprecated']];

	/** Revealed tucked settings (grouped, at the bottom) and the footer row that shows/hides them. */
	function tuckedParts(cat, sub, all, rowFor) {
		const groups = TUCKED.map(([kind, label]) => ({ kind, label, items: SE.sortInSub(all.filter((s) => tuckKind(s) === kind)) })).filter((g) => g.items.length);
		if (!groups.length) { return { rows: [], footer: null }; }
		const rows = [];
		for (const g of groups) {
			if (!state.revealed.has(revealKey(cat, sub, g.kind))) { continue; }
			g.items.forEach((s) => rows.push(rowFor(s)));
		}
		const anyHidden = groups.some((g) => !state.revealed.has(revealKey(cat, sub, g.kind)));
		const toggle = (g) => {
			const key = revealKey(cat, sub, g.kind);
			const on = state.revealed.has(key);
			return h('button.se-link-btn', { type: 'button', 'aria-expanded': String(on), onClick: () => { on ? state.revealed.delete(key) : state.revealed.add(key); render(); } },
				`${on ? 'Hide' : 'Show'} ${g.items.length} ${g.kind}`);
		};
		const footer = h('div.se-group-hidden', null, icon(anyHidden ? 'eye-closed' : 'eye'),
			h('span', null, anyHidden ? 'Some settings are hidden.' : 'Showing all settings.'), groups.map(toggle));
		return { rows, footer };
	}

	function renderGroup(cat, sub, list, opts = {}) {
		const all = list;
		const shown = cat.id === 'popular' ? list.filter(SE.visible) : SE.sortInSub(list.filter(SE.visible));
		if (!list.length || (!shown.length && !opts.keepEmpty && !list.some((s) => tuckKind(s)))) { return null; }
		const parents = !cat.special ? SE.parentGroups(shown) : [];
		// A parent that controls everything else in the section becomes the section's own switch.
		const master = parents.find((p) => p.kids.length === shown.length - 1) || null;
		const masterOn = master ? !!SE.valueOf(master.setting) : true;
		const context = [cat.label, sub.label];
		let body;
		if (cat.id === 'experimental') {
			// Second level: the home subcategory each experimental setting graduates to.
			const bySub = new Map();
			for (const s of shown) { if (!bySub.has(s.homeSub)) { bySub.set(s.homeSub, []); } bySub.get(s.homeSub).push(s); }
			const order = sub.home.subs;
			body = [...bySub.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([hs, items]) => h('div.se-subgroup', null,
				h('div.se-subheading', null, h('span', null, hs.label), h('span.se-subheading-count', null, String(items.length))),
				h('div.se-group-card', null, h('div.se-group-body', { role: 'list' }, items.map((s) => SE.renderRow(s, [sub.label, hs.label], {}))))));
			const tucked = tuckedParts(cat, sub, all, (s) => SE.renderRow(s, [sub.label, s.homeSub.label], { crumb: s.homeSub.label }));
			if (tucked.footer) { body.push(h('div.se-group-card', null, h('div.se-group-body', { role: 'list' }, tucked.rows), tucked.footer)); }
		} else {
			const rowFor = (s, extra = {}) => SE.renderRow(s, cat.special ? [s.cat.label, (s.homeSub || s.sub).label] : (extra.context || context), Object.assign({
				crumb: cat.id === 'modified' || cat.id === 'managed' ? (s.homeSub && s.cat.id === 'experimental' ? `${s.home.label} › ${s.homeSub.label}` : s.sub.label)
					: cat.id === 'popular' ? `${s.cat.label} › ${s.sub.label}` : null,
			}, extra));
			if (master) {
				body = masterOn ? master.kids.map((s) => rowFor(s)) : [];
			} else {
				// Partial parents: their settings follow them, nested, and are hidden while the parent is off.
				const parentOf = new Map();
				parents.forEach((p) => p.kids.forEach((k) => parentOf.set(k, p)));
				body = [];
				for (const s of shown) {
					if (parentOf.has(s)) { continue; }
					const p = parents.find((x) => x.setting === s);
					body.push(rowFor(s, p ? { parent: true } : {}));
					if (p && SE.valueOf(s)) {
						const pctx = [...context, SE.labelOf(s, []).label];
						body.push(h('div.se-children', { role: 'group', 'aria-label': `${SE.labelOf(s, []).label} settings` }, p.kids.map((k) => rowFor(k, { child: true, context: pctx }))));
					}
				}
			}
		}
		// A locked section switch is replaced by the reason it can't be changed.
		const lock = master && SE.readOnlyReason(master.setting);
		const masterSwitch = !master ? null : lock
			? h('span.se-group-lock', { title: lock.title }, icon('lock'), lock.text)
			: SE.controls.switchCtl(masterOn, {
				label: `${sub.label}: ${SE.labelOf(master.setting, []).label}`,
				onChange: (v) => SE.setValue(master.setting, v),
			});
		const masterReset = master && !lock && SE.isModified(master.setting) ? h('button.se-icon-btn.se-reset', { type: 'button', title: `Reset to default (${SE.fmt(SE.defaultValue(master.setting))})`, 'aria-label': 'Reset Setting', onClick: () => SE.resetValue(master.setting) }, icon('discard')) : null;
		return h('section.se-group' + (master && !masterOn ? '.off' : ''), { id: `grp-${sub.id}`, 'data-sub': sub.id, 'aria-label': sub.label },
			h('header.se-group-header', master ? { 'data-key': master.setting.k } : null,
				sub.icon && cat.id === 'experimental' ? icon(sub.icon, 'se-group-icon') : null,
				h('h2.se-group-title', null, sub.label),
				h('span.se-group-count', null, String(shown.length)),
				h('span.se-flex'),
				masterReset,
				masterSwitch),
			cat.id === 'experimental'
				? h('div.se-subgroups', null, body)
				: master && !masterOn ? null
					: (() => {
						const tucked = tuckedParts(cat, sub, all, (s) => SE.renderRow(s, cat.special ? [s.cat.label, s.sub.label] : context, {}));
						return h('div.se-group-card', null, h('div.se-group-body', { role: 'list' }, body, tucked.rows), tucked.footer);
					})());
	}

	function pageHeader(cat) {
		return h('div.se-page-header', null,
			h('div.se-page-heading', null,
				h('h1.se-page-title', null, cat.label),
				h('p.se-page-desc', null, cat.description)));
	}

	function renderPage() {
		const cat = SE.catById(state.cat);
		const parts = [];
		if (cat.id === 'popular') {
			parts.push(pageHeader(cat));
			parts.push(renderGroup(cat, cat.subs[0], SE.settingsIn('popular')));
		} else if (cat.id === 'modified' || cat.id === 'managed') {
			const list = SE.settingsIn(cat.id);
			parts.push(pageHeader(cat));
			for (const c of SE.categories.concat(SE.specials.EXPERIMENTAL)) {
				const g = renderGroup(cat, { id: c.id, label: c.label, icon: c.icon }, list.filter((s) => s.cat === c));
				if (g) { parts.push(g); }
			}
		} else {
			const list = SE.settingsIn(cat.id);
			parts.push(pageHeader(cat));
			if (cat.id === 'experimental') {
				parts.push(h('div.se-callout', null, icon('beaker'),
					h('div', null, h('strong', null, 'Experimental features can change or be removed at any time. '),
						'Each setting moves to its regular section when it ships. ', h('em', null, 'Preview'), ' settings are close to shipping. Settings whose default is rolled out by an experiment stay in their regular section.')));
			}
			if (CFG.nav === 'flat' && CFG.chips !== false) { parts.push(chipBar(cat)); }
			for (const sub of cat.subs) {
				const g = renderGroup(cat, sub, list.filter((s) => s.sub === sub));
				if (g) { parts.push(g); }
			}
		}
		content.replaceChildren(...parts.filter(Boolean));
	}

	function chipBar(cat) {
		const subs = subsWithCounts(cat);
		if (subs.length < 2) { return null; }
		return h('div.se-chipbar', { role: 'tablist', 'aria-label': `${cat.label} sections` }, subs.map(({ sub, n }) => h('button.se-chipbar-chip', { type: 'button', role: 'tab', 'data-sub': sub.id, onClick: () => scrollToGroup(sub.id) },
			h('span', null, sub.label), h('span.se-chipbar-count', null, String(n)))));
	}


	function renderSearch() {
		const { results, words } = search(state.query);
		const counts = {};
		results.forEach(({ s }) => { counts[s.cat.id] = (counts[s.cat.id] || 0) + 1; if (SE.isModified(s, 'user') || SE.isModified(s, 'workspace')) { counts.modified = (counts.modified || 0) + 1; } if (SE.isPolicyManaged(s)) { counts.managed = (counts.managed || 0) + 1; } });
		counts.popular = results.filter(({ s }) => SE.IA_POPULAR.has(s.k)).length;
		state.searchCounts = counts;
		countBadge.textContent = results.length === 1 ? '1 Setting Found' : `${results.length} Settings Found`;
		countBadge.hidden = false;
		if (!results.length) {
			content.replaceChildren(h('div.se-empty', null, icon('search'), h('h2', null, 'No settings found'),
				h('p', null, 'Try a different search term, or clear filters.'),
				h('button.se-btn', { type: 'button', onClick: () => setQuery('') }, 'Clear Search')));
			return;
		}
		const groups = [];
		for (const cat of [...SE.categories, SE.specials.EXPERIMENTAL]) {
			const items = results.filter(({ s }) => s.cat === cat);
			if (!items.length) { continue; }
			items.sort((a, b) => b.score - a.score || a.s.index - b.s.index);
			const limit = state.expandedSearch && state.expandedSearch.has(cat.id) ? Infinity : 25;
			groups.push(h('section.se-group.search', { id: `grp-${cat.id}`, 'data-sub': cat.id },
				h('header.se-group-header', null, icon(cat.icon, 'se-group-icon'), h('h2.se-group-title', null, cat.label), h('span.se-group-count', null, String(items.length))),
				h('div.se-group-card', null,
					h('div.se-group-body', { role: 'list' }, items.slice(0, limit).map(({ s }) => SE.renderRow(s, [s.cat.label, (s.homeSub || s.sub).label], { words, crumb: s.cat.id === 'experimental' ? `${s.home.label} › ${s.homeSub.label}` : s.sub.label }))),
					items.length > limit ? h('button.se-group-more', { type: 'button', onClick: () => { (state.expandedSearch = state.expandedSearch || new Set()).add(cat.id); render(); } }, `Show ${items.length - limit} more in ${cat.label}`) : null)));
		}
		content.replaceChildren(...groups);
	}

	/* ---------- header ---------- */
	function renderHeader(host) {
		searchInput = h('input.se-search-input', { type: 'text', placeholder: 'Search settings', 'aria-label': 'Search settings', spellcheck: 'false', value: state.query });
		searchInput.addEventListener('input', () => { state.query = searchInput.value; state.expandedSearch = null; render(); });
		searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setQuery(''); } });
		countBadge = h('span.se-search-count', { hidden: true });
		const filterBtn = h('button.se-icon-btn', { type: 'button', title: 'Filter Settings', 'aria-label': 'Filter Settings', onClick: (e) => {
			SE.showMenu(e.currentTarget, FILTERS.map(([tok, label]) => ({ label, kb: tok, run: () => {
				const q = state.query.includes(tok) ? state.query : (state.query.trim() + ' ' + tok + (tok.endsWith(':') ? '' : ' ')).trimStart();
				setQuery(q);
			} })));
		} }, icon('filter'));
		const clearBtn = h('button.se-icon-btn', { type: 'button', title: 'Clear Settings Search Input', 'aria-label': 'Clear Settings Search Input', onClick: () => setQuery('') }, icon('clear-all'));
		tabsEl = h('div.se-tabs', { role: 'tablist', 'aria-label': 'Settings scope' });
		host.append(
			h('div.se-search', null, icon('search', 'se-search-icon'), searchInput, countBadge, filterBtn, clearBtn),
			h('div.se-header-row', null, tabsEl, h('span.se-flex'),
				h('button.se-btn.secondary.small', { type: 'button', title: 'Settings Sync is on. Last synced 4 minutes ago.', onClick: () => SE.toast('Settings Sync is on · Last synced 4 minutes ago') }, icon('sync'), 'Backup and Sync'),
				h('button.se-icon-btn', { type: 'button', title: 'Open Settings (JSON)', 'aria-label': 'Open Settings (JSON)', onClick: () => openJson() }, icon('json'))));
	}
	function renderTabs() {
		const tabs = [['user', 'User', null], ['workspace', 'Workspace', 'vscode']];
		tabsEl.replaceChildren(...tabs.map(([id, label, detail]) => {
			const n = Object.keys(state.values[id]).length;
			return h('button.se-tab' + (state.scope === id ? '.active' : ''), { type: 'button', role: 'tab', 'aria-selected': String(state.scope === id), onClick: () => { state.scope = id; render(); } },
				h('span.se-tab-text', null, label, detail ? h('span.se-tab-detail', null, `(${detail})`) : null), n ? h('span.se-tab-count', { title: `${n} modified` }, String(n)) : null);
		}));
	}

	/* ---------- navigation ---------- */
	function go(catId) {
		state.cat = catId;
		if (state.query) { state.query = ''; searchInput.value = ''; }
		render();
		scroller.scrollTop = 0;
	}
	function setQuery(q) {
		state.query = q;
		searchInput.value = q;
		state.expandedSearch = null;
		render();
		searchInput.focus();
		scroller.scrollTop = 0;
	}
	function scrollToGroup(id) {
		const el = content.querySelector(`[data-sub="${CSS.escape(id)}"].se-group`);
		if (el) { scroller.scrollTo({ top: el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 8, behavior: 'smooth' }); }
	}
	function revealSetting(key, opts = {}) {
		const s = SE.byKey.get(key);
		if (!s) { return; }
		if (opts.scope) { state.scope = opts.scope; }
		const page = opts.cat || s.cat.id;
		if (!SE.visible(s)) { state.revealed.add(`${s.cat.id}/${s.sub.id}:${s.isDeprecated ? 'deprecated' : 'advanced'}`); }
		go(page);
		requestAnimationFrame(() => {
			const find = (k) => content.querySelector(`.se-row[data-key="${CSS.escape(k)}"], .se-group-header[data-key="${CSS.escape(k)}"]`);
			let row = find(key);
			if (!row) {
				// Hidden because the switch it depends on is off: reveal that switch instead.
				const parents = SE.settings.filter((p) => /\.enabled?$/.test(p.k) && key.startsWith(p.k.replace(/\.enabled?$/, '.')) && p.k !== key);
				parents.sort((a, b) => b.k.length - a.k.length);
				for (const p of parents) { row = find(p.k); if (row) { toast(`Turn on ${SE.labelOf(p, []).label} to change this setting`); break; } }
			}
			if (!row) { return; }
			scroller.scrollTo({ top: row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 80 });
			row.classList.add('flash');
			setTimeout(() => row.classList.remove('flash'), 1600);
		});
	}
	function spy() {
		const groups = [...content.querySelectorAll('.se-group')];
		const top = scroller.getBoundingClientRect().top + 96;
		let current = groups[0];
		for (const g of groups) { if (g.getBoundingClientRect().top <= top) { current = g; } }
		const id = current && current.dataset.sub;
		root.querySelectorAll('.se-nav-sub, .se-chipbar-chip').forEach((el) => el.classList.toggle('active', el.dataset.sub === id));
	}

	/* ---------- settings.json drawer & toast ---------- */
	/**
	 * @param opts.scope which settings.json to show (defaults to the active tab)
	 * @param opts.languages highlight the setting inside these `[language]` blocks instead of at the top level
	 */
	function openJson(key, opts = {}) {
		root.querySelector('.se-json-drawer')?.remove();
		const scope = opts.scope || state.scope;
		const values = state.values[scope];
		const s = key && SE.byKey.get(key);
		const lines = [];
		const push = (text, hl) => lines.push({ text, hl });
		const block = (indent, k, v, hl, comma) => {
			const body = JSON.stringify(v, null, '\t').split('\n');
			body.forEach((l, i) => push(indent + (i === 0 ? `"${k}": ` : '') + l + (i === body.length - 1 && comma ? ',' : ''), hl));
		};
		// Top-level entries, then the language blocks (User settings only in this prototype).
		const top = Object.entries(values);
		if (s && !opts.languages && !(key in values)) { top.push([key, SE.valueOf(s)]); }
		const langBlocks = new Map();
		if (scope === 'user') {
			for (const [k, list] of Object.entries(SE.languageOverrides)) {
				for (const [, id, v] of list) { if (!langBlocks.has(id)) { langBlocks.set(id, []); } langBlocks.get(id).push([k, v]); }
			}
		}
		push('{');
		top.forEach(([k, v], i) => block('\t', k, v, !opts.languages && k === key, i < top.length - 1 || langBlocks.size > 0));
		[...langBlocks.entries()].forEach(([id, entries], i) => {
			const inBlock = !!opts.languages && opts.languages.includes(id) && entries.some(([k]) => k === key);
			push(`\t"[${id}]": {`, inBlock);
			entries.forEach(([k, v], j) => block('\t\t', k, v, inBlock && k === key, j < entries.length - 1));
			push('\t}' + (i < langBlocks.size - 1 ? ',' : ''), inBlock);
		});
		push('}');
		const pre = h('pre.se-json-file', null, h('code', { html: lines.map((l) => `<span class="se-json-line${l.hl ? ' hl' : ''}">${SE.controls.highlightJson(l.text) || ' '}</span>`).join('') }));
		const sash = h('div.se-json-sash', { role: 'separator', 'aria-orientation': 'vertical', 'aria-label': 'Resize settings.json', tabindex: '0' });
		const drawer = h('aside.se-json-drawer', { role: 'dialog', 'aria-label': 'settings.json' }, sash,
			h('header', null, icon('json'), h('span.se-json-title', null, 'settings.json'), h('span.se-json-path', null, scope === 'user' ? '~/Library/Application Support/Code - Insiders/User' : 'vscode/.vscode'),
				h('span.se-flex'), h('button.se-icon-btn', { type: 'button', title: 'Close', 'aria-label': 'Close', onClick: () => drawer.remove() }, icon('close'))),
			pre);
		root.append(drawer);
		// Drag the left edge (or use ←/→) to resize; the width is kept for the session.
		const clampWidth = (w) => Math.max(320, Math.min(root.clientWidth - 240, w));
		const setWidth = (w) => { state.jsonWidth = clampWidth(w); drawer.style.width = state.jsonWidth + 'px'; };
		if (state.jsonWidth) { setWidth(state.jsonWidth); }
		sash.addEventListener('pointerdown', (e) => {
			e.preventDefault();
			sash.setPointerCapture(e.pointerId);
			const startX = e.clientX, startW = drawer.getBoundingClientRect().width;
			sash.classList.add('active'); root.classList.add('resizing-json');
			const move = (ev) => setWidth(startW + (startX - ev.clientX));
			const up = () => { sash.classList.remove('active'); root.classList.remove('resizing-json'); sash.removeEventListener('pointermove', move); sash.removeEventListener('pointerup', up); };
			sash.addEventListener('pointermove', move);
			sash.addEventListener('pointerup', up);
		});
		sash.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setWidth(drawer.getBoundingClientRect().width + (e.key === 'ArrowLeft' ? 24 : -24)); }
		});
		const hl = pre.querySelector('.hl');
		if (hl) { hl.scrollIntoView({ block: 'center' }); }
	}
	function toast(msg) {
		root.querySelector('.se-toast')?.remove();
		const t = h('div.se-toast', { role: 'status' }, icon('info'), msg);
		root.append(t);
		setTimeout(() => t.remove(), 2400);
	}

	/* ---------- render loop ---------- */
	function render() {
		SE.controls.closePopup();
		SE.closeMenu();
		const top = scroller.scrollTop;
		// Re-rendering replaces the rows, so remember which control had focus (by kind, not position:
		// a reset button can appear before it) and whether it showed a focus ring.
		const active = document.activeElement;
		const focusedKey = active && active.closest && active.closest('[data-key]')?.dataset.key;
		const focusedKind = focusedKey && ['monaco-switch', 'se-dropdown', 'se-input', 'se-json-input', 'se-reset', 'se-more', 'se-list-add'].find((c) => active.classList.contains(c));
		const focusVisible = !!(active && active.matches && active.matches(':focus-visible'));
		renderTabs();
		if (state.query.trim()) { renderSearch(); } else { countBadge.hidden = true; state.searchCounts = null; renderPage(); }
		renderNav();
		root.classList.toggle('searching', !!state.query.trim());
		scroller.scrollTop = top;
		if (focusedKey && focusedKind) {
			const scope = `[data-key="${CSS.escape(focusedKey)}"]`;
			const target = content.querySelector(`${scope} .se-row-main .${focusedKind}, ${scope} .se-row-block .${focusedKind}, ${scope}.${focusedKind}, ${scope} .${focusedKind}`);
			target?.focus({ preventScroll: true, focusVisible });
		}
		spy();
	}

	function mount(host) {
		SE.IA_POPULAR = new Set(window.SETTINGS_IA.commonlyUsed);
		root = h('div.se', { class: `ctx-${CFG.context} nav-${CFG.nav} groups-${CFG.groups}` });
		nav = h('nav.se-nav', { 'aria-label': 'Settings' });
		const header = h('div.se-header');
		content = h('div.se-content');
		scroller = h('div.se-scroll', null, content);
		root.append(nav, h('main.se-main', null, header, scroller));
		host.replaceChildren(root);
		renderHeader(header);
		scroller.addEventListener('scroll', spy, { passive: true });
		root.addEventListener('click', (e) => {
			const link = e.target.closest('.se-setting-link');
			if (link) { e.preventDefault(); revealSetting(link.dataset.key); }
		});
		root.addEventListener('keydown', (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchInput.focus(); searchInput.select(); }
		});
		state.listeners.add(() => render());
		Object.assign(SE, { openJson, toast, revealSetting, setQuery, go });
		const initial = new URLSearchParams(location.search);
		if (initial.get('q')) { state.query = initial.get('q'); searchInput.value = state.query; }
		if (initial.get('cat')) { state.cat = initial.get('cat'); }
		if (initial.get('scope')) { state.scope = initial.get('scope'); }
		render();
		if (initial.get('reveal')) { revealSetting(initial.get('reveal')); }
	}

	SE.mount = mount;
})();
