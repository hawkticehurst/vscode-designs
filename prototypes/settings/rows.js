/* A setting row and its indicators, badges and actions. */
(() => {
	const SE = window.SE;
	const { h, icon } = SE;
	const CFG = SE.config;

	function highlight(text, words) {
		const safe = SE.escapeHtml(text);
		if (!words || !words.length) { return safe; }
		const re = new RegExp('(' + words.map((w) => SE.escapeHtml(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
		return safe.replace(re, '<mark>$1</mark>');
	}

	function badges(s) {
		const out = [];
		const hover = SE.hoverAttrs;
		if (s.isPreview) { out.push(h('span.se-badge.preview', hover('Preview', 'Close to shipping, but may still change before it does.'), 'Preview')); }
		else if (s.isExperimental && s.cat.id !== 'experimental') { out.push(h('span.se-badge.experimental', hover('Experimental', 'Still in development. It may change or be removed at any time.'), 'Experimental')); }
		if (s.isAdvanced) { out.push(h('span.se-badge', hover('Advanced', 'Hidden by default. It shows up when you search for it, or when you show advanced settings in its section.'), 'Advanced')); }
		if (s.isDeprecated) { out.push(h('span.se-badge.deprecated', hover('Deprecated', 'Kept for compatibility and may be removed in a future release. See the note below for what replaces it.'), 'Deprecated')); }
		return out;
	}

	function indicators(s) {
		const out = [];
		// Badges are text-only; the first argument (a codicon name) is kept for call-site readability.
		// Badges with somewhere to take you are buttons; purely informational ones stay plain text.
		// `info` (markdown) explains the badge in a rich hover; `action` names what clicking it does.
		const chip = (_icon, text, info, cls, run, action) => run
			? h('button.se-ind.clickable' + (cls ? '.' + cls : ''), Object.assign({ type: 'button', onClick: (e) => { e.stopPropagation(); SE.hideHover(); run(); } }, SE.hoverAttrs(text, info, action)), h('span', null, text))
			: h('span.se-ind' + (cls ? '.' + cls : ''), SE.hoverAttrs(text, info), h('span', null, text));
		const scopeName = (sc) => sc === 'user' ? 'User' : 'Workspace';
		const val = (v) => s.c === 'enum' ? SE.enumLabel(s, v) : SE.fmt(v);
		const lock = SE.readOnlyReason(s);
		if (lock) {
			// With a Managed page, the policy badge leads there (unless you're already on it).
			const toManaged = lock.cls === 'policy' && SE.specials.MANAGED && SE.state.cat !== 'managed' && !SE.state.query
				? () => SE.revealSetting(s.k, { cat: 'managed' }) : null;
			// On the Managed page every row is managed, so say where each policy comes from instead.
			const text = lock.cls === 'policy' && SE.state.cat === 'managed' && !SE.state.query
				? (SE.policySources[s.k] === 'github' ? 'GitHub Copilot policy' : 'Device policy') : lock.text;
			out.push(chip('lock', text, lock.title, lock.cls, toManaged, 'Show all managed settings'));
		}
		const other = SE.modifiedElsewhere(s);
		if (other) {
			const info = other === 'workspace'
				? 'This setting also has a value in **Workspace** settings, which takes precedence over your User value in this workspace.'
				: 'This setting also has a value in **User** settings, which applies wherever a workspace doesn\'t set its own.';
			out.push(chip('circle-filled', `Also modified in ${scopeName(other)}`, info, 'elsewhere', () => SE.revealSetting(s.k, { scope: other }), `Show in ${scopeName(other)} settings`));
		}
		const langs = SE.languageOverrides[s.k];
		if (langs) {
			out.push(chip('symbol-key', `Overridden for ${langs.map((l) => l[0]).join(', ')}`,
				`${langs.map((l) => `**${l[0]}**`).join(' and ')} files use their own value, set in ${langs.map((l) => `\`[${l[1]}]\``).join(' and ')}.`, null,
				() => SE.openJson(s.k, { scope: 'user', languages: langs.map((l) => l[1]) }), 'Show in settings.json'));
		}
		const aw = SE.agentsOverride(s);
		// Only worth calling out when the Agents window actually differs (a different default, or locked).
		if (aw && 'default' in aw && (aw.readOnly || !SE.same(aw.default, s.d))) {
			if (CFG.context === 'agents') {
				if (!aw.readOnly) { out.push(chip('agent', 'Agents window default', `The Agents window defaults to **${val(aw.default)}**. The editor window defaults to **${val(s.d)}**.`, 'agents')); }
			} else {
				out.push(chip('agent', `Agents window: ${val(aw.default)}${aw.readOnly ? ' (fixed)' : ''}`,
					aw.readOnly ? `The Agents window always uses **${val(aw.default)}**. Changing this setting only affects the editor window.` : `The Agents window defaults to **${val(aw.default)}** instead of **${val(s.d)}**.`, 'agents'));
			}
		}
		if (s.isOnExp && !s.isExperimental && !s.isPreview && !SE.isPolicyManaged(s)) {
			out.push(chip('pulse', 'Value set by an experiment', 'An experiment may be setting this value for you. Choose a value yourself to override it.'));
		}
		if (SE.state.scope === 'workspace') {
			if (SE.isUserOnly(s)) { out.push(chip('account', 'User settings only', 'This setting can only be applied in **User** settings, so a Workspace value is ignored.', 'scope', () => SE.revealSetting(s.k, { scope: 'user' }), 'Show in User settings')); }
			if (s.restricted) { out.push(chip('workspace-untrusted', 'Not applied in Restricted Mode', 'This Workspace value is ignored until you trust the workspace.', 'scope', () => SE.revealSetting('security.workspace.trust.enabled', { scope: 'user' }), 'Show Workspace Trust settings')); }
		}
		// Only third-party extensions are called out; built-in ones (Git, Copilot, …) are part of the product.
		if (s.ext && !s.extBuiltin) { out.push(chip('extensions', s.ext, `Contributed by the **${s.ext}** extension (\`${s.extId}\`).`, null, () => SE.toast(`Opens ${s.ext} in the Extensions view`), 'Show in Extensions view')); }
		return out.length ? h('div.se-indicators', null, out) : null;
	}

	/* ---------- context menu ---------- */
	let menu = null;
	function closeMenu() { if (menu) { menu.remove(); menu = null; } }
	document.addEventListener('mousedown', (e) => { if (menu && !menu.contains(e.target)) { closeMenu(); } });
	document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); } });
	function showMenu(anchor, items) {
		closeMenu();
		const root = anchor.closest('.se');
		const rr = root.getBoundingClientRect();
		const ar = anchor.getBoundingClientRect();
		menu = h('div.se-menu', { role: 'menu' }, items.map((it) => it === '-' ? h('div.se-menu-sep', { role: 'separator' })
			: h('button.se-menu-item', { type: 'button', role: 'menuitem', disabled: !!it.disabled, onClick: () => { closeMenu(); it.run(); } },
				h('span.se-menu-label', null, it.label), it.kb ? h('span.se-menu-kb', null, it.kb) : null)));
		root.append(menu);
		menu.style.top = (ar.bottom - rr.top + 4) + 'px';
		menu.style.right = (rr.right - ar.right) + 'px';
	}
	SE.showMenu = showMenu;

	function copy(text, what) {
		try { navigator.clipboard.writeText(text); } catch { /* sandboxed */ }
		SE.toast && SE.toast(`Copied ${what}`);
	}

	/**
	 * @param context labels of the group the row is shown in (to drop redundant label prefixes)
	 * @param opts { words, crumb, parent, child }
	 */
	function renderRow(s, context, opts = {}) {
		const value = SE.valueOf(s);
		const modified = SE.isModified(s);
		const readOnly = SE.isReadOnly(s);
		const scopeBlocked = SE.state.scope === 'workspace' && SE.isUserOnly(s);
		const disabled = readOnly || scopeBlocked;
		const { label, prefix } = SE.labelOf(s, context);
		const def = SE.defaultValue(s);

		const ctl = SE.controls.render(s, value, {
			label: prefix ? `${prefix} › ${label}` : label,
			disabled, def,
			onChange: (v) => SE.setValue(s, v),
		});

		const title = h('div.se-row-title', null,
			opts.crumb ? h('span.se-row-crumb', null, opts.crumb) : null,
			prefix ? h('span.se-row-prefix', { html: highlight(prefix + ' › ', opts.words) }) : null,
			h('span.se-row-label', { html: highlight(label, opts.words) }),
			badges(s));

		const actions = h('div.se-row-actions', null,
			modified && !disabled ? h('button.se-icon-btn.se-reset', { type: 'button', title: `Reset to default (${s.c === 'enum' ? SE.enumLabel(s, def) : SE.fmt(def)})`, 'aria-label': 'Reset Setting', onClick: () => SE.resetValue(s) }, icon('discard')) : null,
			h('button.se-icon-btn.se-more', { type: 'button', title: 'More Actions...', 'aria-label': 'More Actions', onClick: (e) => {
				showMenu(e.currentTarget, [
					{ label: 'Reset Setting', disabled: !modified || disabled, run: () => SE.resetValue(s) },
					'-',
					{ label: 'Copy Setting ID', run: () => copy(s.k, `"${s.k}"`) },
					{ label: 'Copy Setting as JSON', run: () => copy(`"${s.k}": ${JSON.stringify(value)}`, 'setting as JSON') },
					s.sc === 6 ? { label: 'Configure Setting for Language...', run: () => SE.toast && SE.toast('Pick a language to override this setting for') } : null,
					'-',
					{ label: 'Edit in settings.json', run: () => SE.openJson && SE.openJson(s.k) },
					s.cat.id === 'experimental' && s.homeSub ? { label: `Reveal in ${s.home.label}`, run: () => SE.toast && SE.toast(`Graduates to ${s.home.label} › ${s.homeSub.label} when it ships`) } : null,
				].filter(Boolean));
			} }, icon('ellipsis')));

		const reset = actions.querySelector('.se-reset');
		if (reset) { actions.append(reset); }

		const text = h('div.se-row-text', null,
			title,
			s.md ? h('div.se-row-desc.rendered-markdown', { html: SE.markdown(s.md) }) : null,
			s.dep ? h('div.se-row-deprecation', null, icon('warning'), h('div', { html: SE.markdown(s.dep) })) : null,
			indicators(s));

		const row = h('div.se-row', {
			class: [modified ? 'modified' : '', disabled ? 'readonly' : '', opts.child ? 'child' : '', opts.parent ? 'parent' : '', ctl.layout === 'block' ? 'block' : ''].filter(Boolean).join(' '),
			'data-key': s.k, role: 'listitem', tabindex: '-1',
		},
			h('div.se-row-main', null, text, actions, ctl.layout === 'inline' ? h('div.se-row-control', null, ctl.el) : null),
			ctl.layout === 'block' ? h('div.se-row-block', null, ctl.el) : null);
		return row;
	}

	SE.renderRow = renderRow;
	SE.closeMenu = closeMenu;
})();

/* Rich hovers for badges, after VS Code's delayed workbench hover (HoverStyle.Pointer, compact):
   shown after workbench.hover.reducedDelay, instantly while another hover was just visible, and on keyboard focus. */
(() => {
	const SE = window.SE;
	const { h } = SE;
	const DELAY = 500;
	const WARM_MS = 400;
	const POINTER = 3;
	let timer = null;
	let current = null;
	let lastHidden = 0;

	SE.hoverAttrs = (title, body, action) => ({ 'data-hover-title': title, 'data-hover': body || '', 'data-hover-action': action || null, 'aria-description': [body && SE.plain(body), action].filter(Boolean).join(' ') || null });

	function hide() {
		clearTimeout(timer);
		if (current) { current.el.remove(); current = null; lastHidden = Date.now(); }
	}
	function show(target) {
		hide();
		const root = target.closest('.se');
		if (!root || !target.isConnected) { return; }
		const { hoverTitle, hover: body, hoverAction } = target.dataset;
		const pointer = h('div.workbench-hover-pointer');
		const box = h('div.monaco-hover.workbench-hover.compact.with-pointer.se-hover-box', { role: 'tooltip' },
			h('div.hover-row.markdown-hover', null, h('div.hover-contents', null,
				hoverTitle ? h('div.se-hover-title', null, hoverTitle) : null,
				body ? h('div.se-hover-body.rendered-markdown', { html: SE.markdown(body) }) : null,
				hoverAction ? h('div.se-hover-action', null, `Click to ${hoverAction.charAt(0).toLowerCase()}${hoverAction.slice(1)}`) : null)));
		const el = h('div.workbench-hover-container.se-hover', null, pointer, box);
		root.append(el);
		const rr = root.getBoundingClientRect();
		const tr = target.getBoundingClientRect();
		const w = el.offsetWidth;
		const hgt = el.offsetHeight + POINTER;
		const above = tr.top - rr.top > hgt + 8;
		el.classList.add(above ? 'above' : 'below');
		const center = tr.left + tr.width / 2 - rr.left;
		const left = Math.max(4, Math.min(center - w / 2, rr.width - w - 4));
		el.style.left = left + 'px';
		el.style.top = (above ? tr.top - rr.top - el.offsetHeight - 2 : tr.bottom - rr.top + 2) + 'px';
		pointer.classList.add(above ? 'bottom' : 'top');
		pointer.style.left = (center - left - POINTER) + 'px';
		current = { el, target };
	}
	function schedule(target) {
		if (current && current.target === target) { return; }
		clearTimeout(timer);
		const warm = current || Date.now() - lastHidden < WARM_MS;
		if (warm) { show(target); } else { timer = setTimeout(() => show(target), DELAY); }
	}

	document.addEventListener('mouseover', (e) => {
		const t = e.target.closest && e.target.closest('[data-hover-title]');
		if (t) { schedule(t); }
	});
	document.addEventListener('mouseout', (e) => {
		const t = e.target.closest && e.target.closest('[data-hover-title]');
		if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) { hide(); }
	});
	document.addEventListener('focusin', (e) => {
		const t = e.target.closest && e.target.closest('[data-hover-title]');
		if (t && t.matches(':focus-visible')) { show(t); }
	});
	document.addEventListener('focusout', (e) => { if (current && current.target === e.target) { hide(); } });
	document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hide(); } });
	document.addEventListener('scroll', hide, true);
	document.addEventListener('mousedown', hide);
	SE.hideHover = hide;
})();
