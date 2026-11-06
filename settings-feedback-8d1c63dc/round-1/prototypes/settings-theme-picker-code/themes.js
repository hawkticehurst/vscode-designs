/*
 * Visual theme picker (PROTO_CONFIG.themePicker): replaces the Color Theme, Auto Detect Color Scheme and
 * Preferred Light/Dark Color Theme rows on Appearance › Color Theme with a color mode choice and a grid of
 * theme cards. Previews are drawn from each built-in theme's real colors (window.THEME_DATA).
 */
(() => {
	const SE = window.SE;
	const { h, icon, state } = SE;
	const THEMES = window.THEME_DATA || [];
	const byId = new Map(THEMES.map((t) => [t.id, t]));
	const K = {
		auto: 'window.autoDetectColorScheme',
		theme: 'workbench.colorTheme',
		light: 'workbench.preferredLightColorTheme',
		dark: 'workbench.preferredDarkColorTheme',
	};
	const isLight = (t) => t && (t.kind === 'light' || t.kind === 'hcLight');
	const setting = (k) => SE.byKey.get(k);
	const val = (k) => SE.valueOf(setting(k));

	/* ---------- miniature workbench ---------- */
	// Code lines as colored bars: [token, width %, indent %].
	const CODE = [
		[['keyword', 14], ['function', 24], ['fg', 6]],
		[['keyword', 10, 6], ['variable', 18], ['fg', 4], ['string', 30]],
		[['keyword', 12, 6], ['type', 20], ['fg', 5], ['number', 8]],
		[['comment', 46, 6]],
		[['function', 20, 6], ['fg', 4], ['variable', 14], ['fg', 4]],
		[['fg', 5]],
	];
	/* A real (tiny) TypeScript snippet in the theme's syntax colors: [token, text] per line. */
	const SNIPPET = [
		[['keyword', 'function '], ['function', 'greet'], ['fg', '('], ['variable', 'name'], ['fg', ': '], ['type', 'string'], ['fg', ') {']],
		[['fg', '  '], ['keyword', 'const '], ['variable', 'count'], ['fg', ' = '], ['number', '42'], ['fg', ';']],
		[['fg', '  '], ['comment', '// say hello']],
		[['fg', '  '], ['keyword', 'return '], ['string', `'Hi, '`], ['fg', ' + '], ['variable', 'name'], ['fg', ';']],
		[['fg', '}']],
	];
	function codePreview(t, cls) {
		const u = t.ui;
		const fg = u['editor.foreground'];
		const color = (tok) => tok === 'fg' ? fg : t.syntax[tok] || fg;
		return h('div.se-tp-preview.se-tp-code-preview' + (cls ? '.' + cls : ''), { 'aria-hidden': 'true', style: `background:${u['editor.background']};${u.contrastBorder ? `box-shadow: inset 0 0 0 1px ${u.contrastBorder}` : ''}` },
			h('div.se-tp-cp-tabs', { style: `background:${u['editorGroupHeader.tabsBackground']}` },
				h('span.se-tp-cp-tab', { style: `background:${u['editor.background']};color:${fg}` }, 'greet.ts')),
			h('pre.se-tp-cp-code', null, SNIPPET.map((line, i) => h('div', null,
				h('span.se-tp-cp-ln', { style: `color:${u['editorLineNumber.foreground']}` }, String(i + 1)),
				line.map(([tok, text]) => h('span', { style: `color:${color(tok)}` }, text))))),
			h('div.se-tp-cp-status', { style: `background:${u['statusBar.background']}` }));
	}
	/* A type specimen: "Aa" in the editor's text color beside the theme's syntax palette, with its accent colors. */
	function specimenPreview(t, cls) {
		const u = t.ui;
		const fg = u['editor.foreground'];
		const chips = ['keyword', 'function', 'string', 'type', 'number', 'comment'].map((k) => t.syntax[k] || fg);
		const uniq = chips.filter((c, i) => chips.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i).slice(0, 5);
		return h('div.se-tp-preview.se-tp-specimen' + (cls ? '.' + cls : ''), { 'aria-hidden': 'true', style: `background:${u['editor.background']};${u.contrastBorder ? `box-shadow: inset 0 0 0 1px ${u.contrastBorder}` : ''}` },
			h('div.se-tp-sp-side', { style: `background:${u['sideBar.background']}` }),
			h('div.se-tp-sp-aa', { style: `color:${fg}` }, 'Aa'),
			h('div.se-tp-sp-palette', null, uniq.map((c, i) => h('i', { style: `background:${c};width:${[64, 48, 80, 40, 56][i]}%` }))),
			h('div.se-tp-sp-accent', null,
				[u['statusBar.background'], u['button.background'], u['activityBar.background']].map((c) => h('i', { style: `background:${c}` }))));
	}
	function preview(t, cls) {
		if (!t) { return h('div.se-tp-preview' + (cls ? '.' + cls : '')); }
		if (SE.config.themePreview === 'code') { return codePreview(t, cls); }
		if (SE.config.themePreview === 'specimen') { return specimenPreview(t, cls); }
		const u = t.ui;
		const fg = u['editor.foreground'];
		const color = (tok) => tok === 'fg' ? fg : t.syntax[tok] || fg;
		const border = u.contrastBorder ? `1px solid ${u.contrastBorder}` : null;
		return h('div.se-tp-preview' + (cls ? '.' + cls : ''), { 'aria-hidden': 'true', style: `--fg:${fg};--side-fg:${u['sideBar.foreground'] || fg}` },
			h('div.se-tp-title', { style: `background:${u['titleBar.activeBackground']};${border ? 'border-bottom:' + border : ''}` }),
			h('div.se-tp-body', null,
				h('div.se-tp-activity', { style: `background:${u['activityBar.background']};${border ? 'border-right:' + border : ''}` },
					h('i', { style: `background:${u['activityBar.foreground'] || fg}` }), h('i', { style: `background:${u['activityBar.foreground'] || fg}` })),
				h('div.se-tp-side', { style: `background:${u['sideBar.background']};${border ? 'border-right:' + border : ''}` }, h('i'), h('i'), h('i')),
				h('div.se-tp-editor', { style: `background:${u['editor.background']}` },
					h('div.se-tp-tabs', { style: `background:${u['editorGroupHeader.tabsBackground']}` }, h('div.se-tp-tab', { style: `background:${u['tab.activeBackground']}` })),
					h('div.se-tp-code', null, CODE.map((line) => h('div.se-tp-line', null, line.map(([tok, w, indent]) =>
						h('i', { style: `width:${w}%;${indent ? `margin-left:${indent}%;` : ''}background:${color(tok)}` }))))))),
			h('div.se-tp-status', { style: `background:${u['statusBar.background']};${border ? 'border-top:' + border : ''}` }));
	}

	/* ---------- picker ---------- */
	function render() {
		const auto = !!val(K.auto);
		const current = byId.get(val(K.theme));
		const prefLight = byId.get(val(K.light));
		const prefDark = byId.get(val(K.dark));
		const mode = auto ? 'system' : isLight(current) ? 'light' : 'dark';
		const readOnly = [K.auto, K.theme, K.light, K.dark].some((k) => SE.isReadOnly(setting(k)));
		if (!state.themeTab) { state.themeTab = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; }
		const tab = mode === 'system' ? state.themeTab : mode;

		const setMode = (m) => {
			if (readOnly || m === mode) { return; }
			if (m === 'system') { SE.setValue(setting(K.auto), true); return; }
			const target = m === 'light' ? (isLight(current) ? current : prefLight) : (!isLight(current) ? current : prefDark);
			if (auto) { SE.setValue(setting(K.auto), false); }
			if (target && target !== current) { SE.setValue(setting(K.theme), target.id); }
		};
		const pickTheme = (t) => {
			if (readOnly) { return; }
			if (mode === 'system') { SE.setValue(setting(tab === 'light' ? K.light : K.dark), t.id); }
			else { SE.setValue(setting(K.theme), t.id); }
		};

		const modeCard = (id, label, detail, prev) => h('button.se-tp-mode' + (mode === id ? '.selected' : ''), {
			type: 'button', role: 'radio', 'aria-checked': String(mode === id), disabled: readOnly, onClick: () => setMode(id),
		}, prev, h('div.se-tp-mode-label', null, h('span', null, label), h('span.se-tp-mode-detail', null, detail)));
		const systemPreview = h('div.se-tp-split', null, preview(prefLight, 'half-a'), preview(prefDark, 'half-b'));
		const modes = h('div.se-tp-section', { 'data-key': K.auto },
			h('div.se-tp-heading', null, h('span', null, 'Color mode')),
			h('div.se-tp-modes', { role: 'radiogroup', 'aria-label': 'Color mode' },
				modeCard('system', 'Match system', `${prefLight ? prefLight.label : 'Light'} and ${prefDark ? prefDark.label : 'Dark'}`, systemPreview),
				modeCard('light', 'Light', (isLight(current) ? current : prefLight)?.label || '', preview(isLight(current) ? current : prefLight)),
				modeCard('dark', 'Dark', (!isLight(current) ? current : prefDark)?.label || '', preview(!isLight(current) ? current : prefDark))));

		const selectedId = mode === 'system' ? (tab === 'light' ? prefLight : prefDark)?.id : current?.id;
		const list = THEMES.filter((t) => tab === 'light' ? isLight(t) : !isLight(t))
			.sort((a, b) => (a.kind.startsWith('hc') - b.kind.startsWith('hc')) || a.label.localeCompare(b.label));
		const card = (t) => h('button.se-tp-card' + (t.id === selectedId ? '.selected' : ''), {
			type: 'button', role: 'radio', 'aria-checked': String(t.id === selectedId), disabled: readOnly, onClick: () => pickTheme(t),
			'aria-label': t.label,
		}, preview(t), h('div.se-tp-card-label', null,
			h('span.se-tp-card-name', null, t.label),
			t.id === selectedId ? icon('check', 'se-tp-check') : null));
		const tabs = mode === 'system' ? h('div.se-tp-tabs-toggle', { role: 'tablist', 'aria-label': 'Theme for' },
			[['light', 'Light theme'], ['dark', 'Dark theme']].map(([id, label]) => h('button.se-tp-tab-btn' + (tab === id ? '.active' : ''), {
				type: 'button', role: 'tab', 'aria-selected': String(tab === id), onClick: () => { state.themeTab = id; SE.emit('ui'); },
			}, label))) : null;
		const grid = h('div.se-tp-section', { 'data-key': `${K.theme} ${K.light} ${K.dark}` },
			h('div.se-tp-heading', null,
				h('span', null, mode === 'system' ? 'Themes' : 'Theme'),
				tabs,
				h('span.se-flex'),
				h('button.se-link-btn', { type: 'button', onClick: () => SE.toast('Opens Browse Additional Color Themes…') }, icon('extensions'), 'Browse more themes')),
			mode === 'system' ? h('p.se-tp-hint', null, `Used when your system is in ${tab} mode.`) : null,
			h('div.se-tp-grid', { role: 'radiogroup', 'aria-label': 'Color theme' }, list.map(card)));

		const modified = [K.auto, K.theme, K.light, K.dark].map(setting).filter((s) => SE.isModified(s));
		const lock = readOnly && [K.auto, K.theme, K.light, K.dark].map((k) => SE.readOnlyReason(setting(k))).find(Boolean);
		return h('div.se-block.se-theme-picker' + (modified.length ? '.modified' : ''), null,
			modified.length && !readOnly ? h('button.se-icon-btn.se-reset.se-tp-reset', Object.assign({ type: 'button', 'aria-label': 'Reset theme settings', onClick: () => modified.forEach((s) => SE.resetValue(s)) },
				SE.hoverAttrs('Reset theme settings', 'Go back to the default color mode and themes.')), icon('discard')) : null,
			lock ? h('div.se-indicators', null, h('span.se-ind.policy', null, h('span', null, lock.text))) : null,
			modes, grid);
	}

	SE.groupBlocks = SE.groupBlocks || [];
	SE.groupBlocks.push({ cat: 'appearance', sub: 'theme', keys: [K.auto, K.theme, K.light, K.dark], enabled: () => !!SE.config.themePicker, render });
})();
