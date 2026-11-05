/* Settings model: places every real setting into the proposed IA and holds the editable state. */
(() => {
	const SE = window.SE = window.SE || {};
	const D = window.SETTINGS_DATA;
	const IA = window.SETTINGS_IA;
	const CFG = SE.config = Object.assign({ context: 'editor', nav: 'tree', groups: 'cards' }, window.PROTO_CONFIG || {});

	const esc = (s) => s.replace(/[.+?^${}()|[\]\\/]/g, '\\$&');
	const rules = [];
	for (const cat of IA.categories) {
		for (const sub of cat.subs) {
			for (const p of sub.match) {
				const star = p.indexOf('*');
				rules.push({
					cat, sub,
					re: new RegExp('^' + p.split('*').map(esc).join('.*') + '$', 'i'),
					score: star < 0 ? 1e6 + p.length : star * 1000 + p.replace(/\*/g, '').length,
				});
			}
		}
	}
	function place(key) {
		let best = null;
		for (const r of rules) {
			if ((!best || r.score > best.score) && r.re.test(key)) { best = r; }
		}
		return best;
	}

	const EXPERIMENTAL = {
		id: 'experimental', label: 'Experimental', icon: 'beaker', special: true,
		description: 'Features still in development that can change or be removed at any time. Preview settings are close to shipping.',
		subs: [],
	};
	const POPULAR = { id: 'popular', label: 'Commonly Used', icon: 'star-full', special: true, description: 'The settings people change most often.', subs: [{ id: 'all', label: 'Commonly Used' }] };
	const MODIFIED = { id: 'modified', label: 'Modified', icon: 'circle-filled', special: true, description: 'Every setting with a value in your User or Workspace settings.', subs: [] };
	const MANAGED = { id: 'managed', label: 'Managed by Organization', navLabel: 'Managed', icon: 'organization', special: true,
		description: 'Your organization manages these settings, so they can\'t be changed here. Contact your administrator to request a change.', subs: [] };

	const settings = [];
	const byKey = new Map();
	const unplaced = [];
	D.settings.forEach((raw, index) => {
		const s = Object.assign({ index }, raw);
		const tags = s.tags || [];
		const r = place(s.k);
		if (!r) { unplaced.push(s.k); return; }
		s.home = r.cat;
		s.homeSub = r.sub;
		s.isPreview = tags.includes('preview');
		s.isExperimental = tags.includes('experimental') || /(^|\.)experimental(\.|[A-Z])/.test(s.k);
		s.isAdvanced = tags.includes('advanced');
		s.isOnExp = tags.some((t) => t.toLowerCase() === 'onexp');
		s.isDeprecated = !!s.dep;
		if (s.isExperimental || s.isPreview) {
			s.cat = EXPERIMENTAL;
			let sub = EXPERIMENTAL.subs.find((x) => x.id === r.cat.id);
			if (!sub) { sub = { id: r.cat.id, label: r.cat.label, icon: r.cat.icon, home: r.cat }; EXPERIMENTAL.subs.push(sub); }
			s.sub = sub;
		} else {
			s.cat = r.cat;
			s.sub = r.sub;
		}
		settings.push(s);
		byKey.set(s.k, s);
	});
	EXPERIMENTAL.subs.sort((a, b) => IA.categories.indexOf(a.home) - IA.categories.indexOf(b.home));

	// Order the IA's categories; the Agents window leads with what matters there.
	const AGENTS_ORDER = ['ai', 'appearance', 'scm', 'terminal', 'editor', 'files', 'accessibility', 'security', 'application', 'extensions', 'workbench', 'debug', 'languages', 'notebooks'];
	const categories = CFG.context === 'agents'
		? AGENTS_ORDER.map((id) => IA.categories.find((c) => c.id === id))
		: IA.categories.slice();
	if (CFG.context === 'agents') {
		const ai = categories[0];
		const aw = ai.subs.find((x) => x.id === 'agentsWindow');
		ai.subs = [aw, ...ai.subs.filter((x) => x !== aw)];
	}

	/* ---------- simulated user state (a realistic profile on top of the real defaults) ---------- */
	const seed = {
		user: {
			'editor.fontSize': 13,
			'editor.fontFamily': "'JetBrains Mono', Menlo, Monaco, monospace",
			'editor.formatOnSave': true,
			'editor.minimap.enabled': false,
			'editor.wordWrap': 'on',
			'editor.rulers': [80, 120],
			'editor.stickyScroll.maxLineCount': 3,
			'files.autoSave': 'afterDelay',
			'files.exclude': Object.assign({}, (byKey.get('files.exclude') || {}).d, { '**/node_modules': true, '**/.DS_Store': false }),
			'workbench.editor.wrapTabs': true,
			'terminal.integrated.fontSize': 13,
			'terminal.integrated.defaultProfile.osx': 'zsh',
			'git.autofetch': true,
			'git.confirmSync': false,
			'chat.agent.maxRequests': 100,
			'chat.tools.terminal.autoApprove': Object.assign({}, (byKey.get('chat.tools.terminal.autoApprove') || {}).d, { 'npm test': true }),
			'chat.mcp.autostart': 'never',
			'chat.agentSessions.openInEditor': true,
			'github.copilot.nextEditSuggestions.enabled': false,
			'typescript.updateImportsOnFileMove.enabled': 'always',
			'search.exclude': Object.assign({}, (byKey.get('search.exclude') || {}).d, { '**/out': true }),
		},
		workspace: {
			'editor.tabSize': 2,
			'editor.formatOnSave': false,
			'files.insertFinalNewline': true,
			'search.exclude': { '**/out': true, '**/.build': true },
			'git.branchProtection': ['main', 'release/*'],
		},
	};
	// Language overrides, e.g. "[markdown]": { "editor.wordWrap": "off" }.
	// Simulated, stored in User settings: setting → [language label, language id, value].
	const languageOverrides = {
		'editor.wordWrap': [['Markdown', 'markdown', 'off']],
		'editor.defaultFormatter': [['TypeScript', 'typescript', 'vscode.typescript-language-features'], ['JSON', 'json', 'vscode.json-language-features']],
		'editor.tabSize': [['Makefile', 'makefile', 8]],
	};
	// Organization policies that are actually set on this machine (a subset of the policy-capable settings).
	// Policies in effect. A prototype can supply its own set (window.PROTO_POLICIES: key → { value, source }),
	// where source is 'github' (GitHub Copilot policies for the signed-in account) or 'device' (MDM / Group Policy / policy.json).
	const defaultPolicies = { 'chat.tools.global.autoApprove': false, 'chat.mcp.access': 'registry', 'telemetry.telemetryLevel': 'error', 'extensions.allowed': { 'microsoft': true, 'github': true, '*': false } };
	const policies = {};
	const policySources = {};
	for (const [k, v] of Object.entries(window.PROTO_POLICIES || defaultPolicies)) {
		if (!byKey.has(k)) { console.warn('Unknown policy setting', k); continue; }
		const entry = window.PROTO_POLICIES ? v : { value: v, source: 'device' };
		policies[k] = entry.value;
		policySources[k] = entry.source || 'device';
	}
	const showManagedPage = !!CFG.managed;

	const state = SE.state = {
		scope: 'user',
		values: { user: {}, workspace: {} },
		cat: CFG.context === 'agents' ? 'ai' : 'popular',
		query: '',
		sub: null,
		showAdvanced: false,
		showDeprecated: false,
		// Sections whose advanced / deprecated settings are shown: `${catId}/${subId}:advanced|deprecated`.
		revealed: new Set(),
		listeners: new Set(),
	};
	for (const scope of ['user', 'workspace']) {
		for (const [k, v] of Object.entries(seed[scope])) {
			if (byKey.has(k)) { state.values[scope][k] = v; }
		}
	}

	const clone = (v) => v === undefined ? v : JSON.parse(JSON.stringify(v));
	const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

	function agentsOverride(s) {
		return s.aw && typeof s.aw === 'object' ? s.aw : null;
	}
	function defaultValue(s) {
		const aw = agentsOverride(s);
		if (CFG.context === 'agents' && aw && 'default' in aw) { return aw.default; }
		return s.d;
	}
	function isPolicyManaged(s) { return Object.prototype.hasOwnProperty.call(policies, s.k); }
	function isReadOnly(s) {
		const aw = agentsOverride(s);
		return isPolicyManaged(s) || (CFG.context === 'agents' && !!(aw && aw.readOnly));
	}
	function readOnlyReason(s) {
		if (isPolicyManaged(s)) {
			const via = policySources[s.k] === 'github' ? 'a **GitHub Copilot** policy for your account' : `**device management** (\`${s.pol}\` policy)`;
			return { text: 'Managed by your organization', title: `Set by your organization through ${via}. Contact your administrator to change it.`, cls: 'policy' };
		}
		const aw = agentsOverride(s);
		if (CFG.context === 'agents' && aw && aw.readOnly) {
			const v = aw.default;
			const shown = typeof v === 'boolean' ? (v ? 'on' : 'off') : s.c === 'enum' ? SE.enumLabel(s, v) : SE.fmt(v);
			return { text: typeof v === 'boolean' ? `Always ${shown} in the Agents window` : 'Fixed in the Agents window',
				title: `The Agents window always uses **${shown}**. Changing this setting only affects the editor window.`, cls: 'agents' };
		}
		return null;
	}
	function isUserOnly(s) { return [1, 2, 3, 7].includes(s.sc); }
	function hasValue(s, scope = state.scope) { return Object.prototype.hasOwnProperty.call(state.values[scope], s.k); }
	function valueOf(s, scope = state.scope) {
		if (isPolicyManaged(s)) { return policies[s.k]; }
		if (hasValue(s, scope)) { return state.values[scope][s.k]; }
		if (scope === 'workspace' && hasValue(s, 'user')) { return state.values.user[s.k]; }
		return defaultValue(s);
	}
	function isModified(s, scope = state.scope) { return hasValue(s, scope); }
	function modifiedElsewhere(s) {
		const other = state.scope === 'user' ? 'workspace' : 'user';
		return hasValue(s, other) ? other : null;
	}
	function emit(reason, key) { state.listeners.forEach((fn) => fn(reason, key)); }
	function setValue(s, value) {
		if (same(value, defaultValue(s))) { delete state.values[state.scope][s.k]; }
		else { state.values[state.scope][s.k] = clone(value); }
		emit('value', s.k);
	}
	function resetValue(s) {
		delete state.values[state.scope][s.k];
		emit('value', s.k);
	}

	function visible(s) {
		if (isPolicyManaged(s)) { return true; }
		if (s.isDeprecated && !state.showDeprecated && !isModified(s, 'user') && !isModified(s, 'workspace')) { return false; }
		if (s.isAdvanced && !state.showAdvanced && !isModified(s, 'user') && !isModified(s, 'workspace')) { return false; }
		return true;
	}

	function settingsIn(catId, subId) {
		if (catId === 'popular') {
			return IA.commonlyUsed.map((k) => byKey.get(k)).filter(Boolean);
		}
		if (catId === 'managed') {
			return settings.filter(isPolicyManaged);
		}
		if (catId === 'modified') {
			return settings.filter((s) => isModified(s, 'user') || isModified(s, 'workspace')).filter((s) => !subId || s.cat.id === subId);
		}
		return settings.filter((s) => s.cat.id === catId && (!subId || s.sub.id === subId));
	}
	function sortInSub(list) {
		// A subcategory can list keys in the order they should appear; the rest follow.
		const rank = (s) => { const i = s.sub && s.sub.order ? s.sub.order.indexOf(s.k) : -1; return i < 0 ? 1e9 : i; };
		return list.slice().sort((a, b) => {
			const ra = rank(a), rb = rank(b);
			if (ra !== rb) { return ra - rb; }
			const oa = a.order ?? 1e9, ob = b.order ?? 1e9;
			return oa !== ob ? oa - ob : a.index - b.index;
		});
	}

	// A boolean `x.enabled` (or `x.enable`) that the rest of its subcategory hangs off is shown as the group's switch.
	/**
	 * Boolean `x.enabled` / `x.enable` settings that other settings in the list hang off (`x.*`).
	 * Largest first; each setting belongs to at most one parent.
	 */
	function parentGroups(list) {
		const candidates = [];
		for (const s of list) {
			if (s.c !== 'bool') { continue; }
			const m = /^(.*)\.enabled?$/.exec(s.k);
			if (!m) { continue; }
			const kids = list.filter((o) => o !== s && o.k.startsWith(m[1] + '.'));
			if (kids.length >= 2) { candidates.push({ setting: s, prefix: m[1] + '.', kids }); }
		}
		candidates.sort((a, b) => b.kids.length - a.kids.length);
		const taken = new Set();
		const groups = [];
		for (const c of candidates) {
			if (taken.has(c.setting)) { continue; }
			c.kids = c.kids.filter((k) => !taken.has(k));
			if (c.kids.length < 2) { continue; }
			taken.add(c.setting);
			c.kids.forEach((k) => taken.add(k));
			groups.push(c);
		}
		return groups;
	}

	Object.assign(SE, {
		settings, byKey, categories, unplaced, specials: { EXPERIMENTAL, POPULAR, MODIFIED, MANAGED: showManagedPage ? MANAGED : null }, policies, policySources, languageOverrides,
		agentsOverride, defaultValue, isPolicyManaged, isReadOnly, readOnlyReason, isUserOnly, valueOf, isModified, modifiedElsewhere,
		setValue, resetValue, visible, settingsIn, sortInSub, parentGroups, clone, same, emit,
		allCategories() { return [POPULAR, ...categories, EXPERIMENTAL, MODIFIED, ...(showManagedPage ? [MANAGED] : [])]; },
		catById(id) { return this.allCategories().find((c) => c.id === id); },
	});
})();
