/* Setting controls. Booleans use VS Code's Switch (base/browser/ui/toggle/switch.ts) instead of a checkbox. */
(() => {
	const SE = window.SE;
	const { h, icon } = SE;

	function switchCtl(checked, { label, disabled, onChange }) {
		const btn = h('button.monaco-switch' + (checked ? '.checked' : ''), {
			type: 'button', role: 'switch', 'aria-checked': String(!!checked), 'aria-label': label, title: label, disabled: !!disabled,
		}, h('div.monaco-switch-thumb'));
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const next = !btn.classList.contains('checked');
			btn.classList.toggle('checked', next);
			btn.setAttribute('aria-checked', String(next));
			onChange && onChange(next);
		});
		return btn;
	}

	/* ---------- dropdown with per-option descriptions ---------- */
	let openPopup = null;
	function closePopup() {
		if (openPopup) { openPopup.remove(); openPopup.anchor.setAttribute('aria-expanded', 'false'); openPopup = null; }
	}
	document.addEventListener('mousedown', (e) => { if (openPopup && !openPopup.contains(e.target) && !openPopup.anchor.contains(e.target)) { closePopup(); } });

	function dropdown(s, value, { disabled, onChange, def }) {
		const options = (s.e || []).map((v, i) => ({ v, label: SE.enumLabel(s, v), desc: s.ed ? s.ed[i] : '', isDefault: SE.same(v, def) }));
		const current = options.find((o) => SE.same(o.v, value));
		const btn = h('button.se-dropdown', { type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', disabled: !!disabled, title: current ? current.label : SE.fmt(value) },
			h('span.se-dropdown-label', null, current ? current.label : SE.fmt(value)),
			icon('chevron-down'));
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (openPopup && openPopup.anchor === btn) { closePopup(); return; }
			closePopup();
			const root = btn.closest('.se');
			const rr = root.getBoundingClientRect();
			const br = btn.getBoundingClientRect();
			let active = Math.max(0, options.indexOf(current));
			const list = h('div.se-dropdown-popup', { role: 'listbox', tabindex: '-1' });
			const detail = h('div.se-dropdown-detail');
			const rows = options.map((o, i) => {
				const row = h('div.se-dropdown-option' + (o === current ? '.selected' : ''), { role: 'option', 'aria-selected': String(o === current) },
					h('span.se-dropdown-check', null, o === current ? icon('check') : null),
					h('span.se-dropdown-option-label', null, o.label),
					o.isDefault ? h('span.se-dropdown-default', null, 'default') : null);
				row.addEventListener('mouseenter', () => setActive(i));
				row.addEventListener('click', () => { closePopup(); onChange(o.v); });
				return row;
			});
			function setActive(i) {
				active = i;
				rows.forEach((r, j) => r.classList.toggle('active', j === i));
				const o = options[i];
				detail.innerHTML = o && o.desc ? SE.markdown(o.desc) : '';
				detail.hidden = !(o && o.desc);
				rows[i] && rows[i].scrollIntoView({ block: 'nearest' });
			}
			list.append(h('div.se-dropdown-options', null, rows), detail);
			list.addEventListener('keydown', (ev) => {
				if (ev.key === 'ArrowDown') { setActive(Math.min(options.length - 1, active + 1)); ev.preventDefault(); }
				else if (ev.key === 'ArrowUp') { setActive(Math.max(0, active - 1)); ev.preventDefault(); }
				else if (ev.key === 'Enter') { closePopup(); onChange(options[active].v); btn.focus(); ev.preventDefault(); }
				else if (ev.key === 'Escape') { closePopup(); btn.focus(); }
			});
			list.anchor = btn;
			root.append(list);
			const width = Math.max(br.width, 300);
			const below = rr.bottom - br.bottom;
			list.style.width = width + 'px';
			// Right-align the menu with the dropdown button (controls sit at the row's right edge);
			// left-align instead when that would push it out of the settings content area.
			const main = (root.querySelector('.se-main') || root).getBoundingClientRect();
			const rightAligned = br.right - list.offsetWidth;
			list.style.left = (rightAligned >= main.left + 8 ? rightAligned : Math.min(br.left, rr.right - list.offsetWidth - 8)) - rr.left + 'px';
			if (below < 260 && br.top - rr.top > below) { list.style.bottom = (rr.bottom - br.top + 2) + 'px'; }
			else { list.style.top = (br.bottom - rr.top + 2) + 'px'; }
			openPopup = list;
			btn.setAttribute('aria-expanded', 'true');
			setActive(active);
			list.focus();
		});
		return btn;
	}

	/* ---------- inputs ---------- */
	function validationMessage(s, raw) {
		if (s.c === 'number') {
			if (raw.trim() === '') { return s.nullable ? null : 'Value must be a number.'; }
			const n = Number(raw);
			if (!Number.isFinite(n)) { return 'Value must be a number.'; }
			if (s.int && !Number.isInteger(n)) { return 'Value must be an integer.'; }
			if (s.min !== undefined && n < s.min) { return `Value must be greater than or equal to ${s.min}.`; }
			if (s.max !== undefined && n > s.max) { return `Value must be less than or equal to ${s.max}.`; }
			return null;
		}
		if (s.pattern) {
			try { if (raw && !new RegExp(s.pattern).test(raw)) { return s.patternMsg || `Value must match the pattern ${s.pattern}.`; } } catch { /* ignore invalid patterns */ }
		}
		return null;
	}

	function inputCtl(s, value, { disabled, onChange, wide }) {
		const isNum = s.c === 'number';
		const input = h('input.se-input' + (isNum ? '.se-input-number' : ''), {
			type: 'text', inputmode: isNum ? 'decimal' : undefined, spellcheck: 'false', disabled: !!disabled, 'aria-label': s.k,
			value: value === null || value === undefined ? '' : String(value), placeholder: value === null ? 'Not set' : undefined,
		});
		const msg = h('div.se-validation', { role: 'alert', hidden: true });
		const wrap = h('div.se-input-wrap' + (wide ? '.wide' : ''), null, input, msg);
		const commit = () => {
			const err = validationMessage(s, input.value);
			msg.hidden = !err;
			msg.textContent = err || '';
			wrap.classList.toggle('invalid', !!err);
			if (!err) { onChange(isNum ? (input.value.trim() === '' ? null : Number(input.value)) : (input.value === '' && s.nullable ? null : input.value)); }
		};
		input.addEventListener('input', () => {
			const err = validationMessage(s, input.value);
			msg.hidden = !err;
			msg.textContent = err || '';
			wrap.classList.toggle('invalid', !!err);
		});
		input.addEventListener('change', commit);
		input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { input.blur(); } });
		return wrap;
	}

	/* ---------- list & map editors ---------- */
	function listShell(items, { disabled, addLabel, onAdd }) {
		const list = h('div.se-list', { role: 'list' }, items);
		const extra = items.length - 8;
		if (extra > 2 && !items.some((r) => r.classList && r.classList.contains('editing'))) {
			items.slice(8).forEach((r) => { r.hidden = true; });
			const more = h('button.se-list-more', { type: 'button', onClick: () => { items.forEach((r) => { r.hidden = false; }); more.remove(); } }, icon('chevron-down'), `Show ${extra} more`);
			list.append(more);
		}
		if (!disabled) {
			list.append(h('button.se-list-add', { type: 'button', onClick: onAdd }, icon('add'), addLabel));
		}
		return list;
	}
	function rowActions(...actions) {
		return h('div.se-list-actions', null, actions.map(([name, label, fn]) => h('button.se-icon-btn', { type: 'button', title: label, 'aria-label': label, onClick: fn }, icon(name))));
	}
	/**
	 * Inline add/edit row. A field can have `suggestions` (offered as you type) and `validate(value)`
	 * returning an error message; OK is blocked while any field is invalid.
	 */
	let datalistId = 0;
	function inlineEditor(fields, onSave, onCancel) {
		const lists = [];
		const inputs = fields.map((f) => {
			let list;
			if (f.suggestions && f.suggestions.length) {
				list = `se-sugg-${++datalistId}`;
				lists.push(h('datalist', { id: list }, f.suggestions.map((v) => h('option', { value: v }))));
			}
			return h('input.se-input', { type: 'text', value: f.value ?? '', placeholder: f.placeholder, spellcheck: 'false', 'aria-label': f.placeholder, list });
		});
		const msg = h('div.se-validation', { role: 'alert', hidden: true });
		const check = () => {
			const err = fields.map((f, i) => f.validate && f.validate(inputs[i].value)).find(Boolean) || null;
			msg.hidden = !err;
			msg.textContent = err || '';
			return !err;
		};
		const save = () => { if (check()) { onSave(inputs.map((i) => i.value)); } };
		inputs.forEach((i) => {
			i.addEventListener('input', check);
			i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { save(); } if (e.key === 'Escape') { onCancel(); } });
		});
		const row = h('div.se-list-row.editing', null,
			h('div.se-list-edit-fields', null, h('div.se-list-edit-inputs', null, inputs), msg, lists),
			h('button.se-btn.primary', { type: 'button', onClick: save }, 'OK'),
			h('button.se-btn', { type: 'button', onClick: onCancel }, 'Cancel'));
		setTimeout(() => inputs[0].focus());
		return row;
	}

	function stringList(s, value, { disabled, onChange }) {
		const arr = Array.isArray(value) ? value.slice() : [];
		const host = h('div');
		let itemRe = null;
		try { itemRe = s.itemPattern ? new RegExp(s.itemPattern) : null; } catch { /* invalid pattern in schema */ }
		const field = (current) => ({
			value: current ?? '',
			placeholder: s.sugg ? 'Item (type or pick a suggestion)' : 'Item',
			suggestions: s.sugg && s.sugg.filter((v) => v === current || !arr.includes(v)),
			validate: (v) => {
				if (itemRe && v && !itemRe.test(v)) { return (s.itemPatternMsg || `Value must match ${s.itemPattern}.`); }
				if (s.unique && v !== current && arr.includes(v)) { return 'This item is already in the list.'; }
				return null;
			},
		});
		const draw = (editing) => {
			const rows = arr.map((item, i) => editing === i
				? inlineEditor([field(item)], ([v]) => { if (v) { arr[i] = v; onChange(arr.slice()); } draw(); }, () => draw())
				: h('div.se-list-row', { role: 'listitem' }, h('span.se-list-value', null, String(item)),
					disabled ? null : rowActions(['edit', 'Edit Item', () => draw(i)], ['close', 'Remove Item', () => { arr.splice(i, 1); onChange(arr.slice()); draw(); }])));
			if (editing === arr.length) {
				rows.push(inlineEditor([field(undefined)], ([v]) => { if (v) { arr.push(v); onChange(arr.slice()); } draw(); }, () => draw()));
			}
			if (!arr.length && editing === undefined) { rows.push(h('div.se-list-empty', null, 'No items')); }
			host.replaceChildren(listShell(rows, { disabled, addLabel: 'Add Item', onAdd: () => draw(arr.length) }));
		};
		draw();
		return host;
	}

	function globMap(s, value, { disabled, onChange, def }) {
		const obj = Object.assign({}, value && typeof value === 'object' ? value : {});
		const host = h('div');
		const draw = (editing) => {
			const keys = Object.keys(obj);
			const rows = keys.map((k) => editing === k
				? inlineEditor([{ value: k, placeholder: 'Glob pattern, e.g. **/node_modules' }], ([nk]) => { if (nk && nk !== k) { obj[nk] = obj[k]; delete obj[k]; onChange(Object.assign({}, obj)); } draw(); }, () => draw())
				: h('div.se-list-row', { role: 'listitem' },
					h('span.se-list-value.mono', null, k),
					!disabled && def && !(k in def) ? h('span.se-list-tag', null, 'added') : null,
					disabled ? null : rowActions(['edit', 'Edit Pattern', () => draw(k)], ['close', 'Remove Pattern', () => { delete obj[k]; onChange(Object.assign({}, obj)); draw(); }]),
					typeof obj[k] === 'boolean'
						? switchCtl(obj[k], { label: `Toggle ${k}`, disabled, onChange: (v) => { obj[k] = v; onChange(Object.assign({}, obj)); } })
						: h('span.se-list-value.mono.muted', null, JSON.stringify(obj[k]))));
			if (editing === '') {
				rows.push(inlineEditor([{ value: '', placeholder: 'Glob pattern, e.g. **/node_modules' }], ([nk]) => { if (nk) { obj[nk] = true; onChange(Object.assign({}, obj)); } draw(); }, () => draw()));
			}
			host.replaceChildren(listShell(rows, { disabled, addLabel: 'Add Pattern', onAdd: () => draw('') }));
		};
		draw();
		return host;
	}

	function stringMap(s, value, { disabled, onChange }) {
		const obj = Object.assign({}, value && typeof value === 'object' ? value : {});
		const host = h('div');
		const draw = (editing) => {
			const keys = Object.keys(obj);
			const editor = (k) => inlineEditor([{ value: k ?? '', placeholder: 'Key' }, { value: k ? obj[k] : '', placeholder: 'Value' }], ([nk, nv]) => {
				if (nk) { if (k && k !== nk) { delete obj[k]; } obj[nk] = nv; onChange(Object.assign({}, obj)); }
				draw();
			}, () => draw());
			const rows = keys.map((k) => editing === k ? editor(k) : h('div.se-list-row', { role: 'listitem' },
				h('span.se-list-value.mono', null, k), icon('arrow-right', 'se-list-arrow'), h('span.se-list-value.mono.muted', null, obj[k] === null ? 'null' : String(obj[k])),
				disabled ? null : rowActions(['edit', 'Edit Item', () => draw(k)], ['close', 'Remove Item', () => { delete obj[k]; onChange(Object.assign({}, obj)); draw(); }])));
			if (editing === '') { rows.push(editor(null)); }
			if (!keys.length && editing === undefined) { rows.push(h('div.se-list-empty', null, 'No items')); }
			host.replaceChildren(listShell(rows, { disabled, addLabel: 'Add Item', onAdd: () => draw('') }));
		};
		draw();
		return host;
	}

	function boolObject(s, value, { disabled, onChange }) {
		const obj = Object.assign({}, value || {});
		return h('div.se-list', { role: 'list' }, Object.entries(s.props || {}).map(([k, p]) => h('div.se-list-row', { role: 'listitem', title: p.md ? SE.plain(p.md) : undefined },
			h('span.se-list-value', null, SE.wordify(k)),
			switchCtl(obj[k] ?? p.d, { label: k, disabled, onChange: (v) => { obj[k] = v; onChange(Object.assign({}, obj)); } }))));
	}

	/** An ordered list of values picked from the setting's allowed values (e.g. Candidate Guess Encodings). */
	function enumList(s, value, { disabled, onChange }) {
		const arr = Array.isArray(value) ? value.slice() : [];
		const host = h('div');
		const describe = (v) => { const i = (s.e || []).indexOf(v); return i >= 0 && s.ed ? s.ed[i] : ''; };
		// Picker row: a dropdown of the values not already in the list (plus the one being edited).
		const picker = (current, onSave, onCancel) => {
			const options = (s.e || []).filter((v) => v === current || !arr.includes(v));
			let picked = current ?? options[0];
			const pseudo = { k: s.k, e: options, ed: options.map(describe), el: s.el };
			const slot = h('div.se-list-edit-fields');
			const draw = () => slot.replaceChildren(dropdown(pseudo, picked, { def: undefined, onChange: (v) => { picked = v; draw(); slot.querySelector('.se-dropdown').focus(); } }));
			draw();
			const row = h('div.se-list-row.editing', null, slot,
				h('button.se-btn.primary', { type: 'button', onClick: () => onSave(picked) }, 'OK'),
				h('button.se-btn', { type: 'button', onClick: onCancel }, 'Cancel'));
			row.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.defaultPrevented) { onCancel(); } });
			setTimeout(() => slot.querySelector('.se-dropdown')?.focus());
			return row;
		};
		const commit = () => onChange(arr.slice());
		const draw = (editing) => {
			const rows = arr.map((v, i) => editing === i
				? picker(v, (nv) => { arr[i] = nv; commit(); draw(); }, () => draw())
				: h('div.se-list-row', { role: 'listitem' },
					h('span.se-list-value.mono.se-enum-value', null, String(v)),
					describe(v) ? h('span.se-list-value.muted', null, describe(v)) : null,
					disabled ? null : rowActions(['edit', 'Edit Item', () => draw(i)], ['close', 'Remove Item', () => { arr.splice(i, 1); commit(); draw(); }])));
			if (editing === arr.length) { rows.push(picker(undefined, (nv) => { arr.push(nv); commit(); draw(); }, () => draw())); }
			if (!arr.length && editing === undefined) { rows.push(h('div.se-list-empty', null, 'No items')); }
			const full = (s.e || []).every((v) => arr.includes(v));
			host.replaceChildren(listShell(rows, { disabled: disabled || full, addLabel: 'Add Item', onAdd: () => draw(arr.length) }));
		};
		draw();
		return host;
	}

	/**
	 * Inline JSON editor: the value itself is editable (a transparent textarea over a highlighted copy),
	 * with "Open in settings.json" in the corner and Save/Cancel appearing only once there are changes.
	 */
	function jsonCtl(s, value, { disabled, onChange }) {
		const original = JSON.stringify(value, null, 2) ?? 'null';
		const code = h('code');
		const mirror = h('pre.se-json-mirror', { 'aria-hidden': 'true' }, code);
		const area = h('textarea.se-json-input', { spellcheck: 'false', autocapitalize: 'off', 'aria-label': `${s.k} (JSON)`, readonly: !!disabled, rows: 1 }, original);
		const status = h('span.se-json-status');
		const save = h('button.se-btn.primary.small', { type: 'button' }, 'Save');
		const cancel = h('button.se-btn.small', { type: 'button' }, 'Cancel');
		const footer = h('div.se-json-footer', { hidden: true }, status, h('span.se-flex'), cancel, save);
		const open = h('button.se-icon-btn.se-json-open', { type: 'button', title: 'Open in settings.json', 'aria-label': 'Open in settings.json', onClick: () => SE.openJson && SE.openJson(s.k) }, icon('go-to-file'));
		const box = h('div.se-json-box' + (disabled ? '.readonly' : ''), null, h('div.se-json-scroll', null, h('div.se-json-stack', null, mirror, area)), open, footer);

		let parsed;
		const update = () => {
			// The trailing space keeps the mirror as tall as the textarea when the text ends in a newline.
			code.innerHTML = highlightJson(area.value) + ' ';
			const dirty = area.value !== original;
			let err = null;
			try { parsed = JSON.parse(area.value); } catch (e) { err = e.message; }
			footer.hidden = !dirty;
			box.classList.toggle('dirty', dirty);
			box.classList.toggle('invalid', dirty && !!err);
			status.textContent = err ? `Invalid JSON: ${err}` : '⌘Enter to save · Esc to discard';
			save.disabled = !!err;
		};
		const commit = () => { if (area.value !== original && !save.disabled) { onChange(parsed); } };
		const revert = () => { area.value = original; update(); };
		area.addEventListener('input', update);
		area.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
			else if (e.key === 'Escape') { e.stopPropagation(); revert(); area.blur(); }
			else if (e.key === 'Tab' && !e.shiftKey && !disabled) {
				e.preventDefault();
				area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
				update();
			}
		});
		save.addEventListener('click', commit);
		cancel.addEventListener('click', revert);
		update();
		return box;
	}

	function highlightJson(text) {
		return SE.escapeHtml(text).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g, (m, str, colon, kw, num) => {
			if (str) { return `<span class="${colon ? 'j-key' : 'j-str'}">${str}</span>${colon || ''}`; }
			if (kw) { return `<span class="j-kw">${kw}</span>`; }
			return `<span class="j-num">${num}</span>`;
		});
	}

	/** Returns { el, layout } where layout is 'inline' (right of the text) or 'block' (below it). */
	function render(s, value, opts) {
		switch (s.c) {
			case 'bool': return { el: switchCtl(!!value, opts), layout: 'inline' };
			case 'enum': return { el: dropdown(s, value, opts), layout: 'inline' };
			case 'number': return { el: inputCtl(s, value, opts), layout: 'inline' };
			case 'string': {
				const wide = String(value ?? '').length > 28 || String(s.d ?? '').includes('${');
				return { el: inputCtl(s, value, Object.assign({ wide }, opts)), layout: wide ? 'block' : 'inline' };
			}
			case 'stringList': return { el: stringList(s, value, opts), layout: 'block' };
			case 'globMap': return { el: globMap(s, value, opts), layout: 'block' };
			case 'stringMap': return { el: stringMap(s, value, opts), layout: 'block' };
			case 'boolObject': return { el: boolObject(s, value, opts), layout: 'block' };
			case 'enumList': return { el: enumList(s, value, opts), layout: 'block' };
			default: return { el: jsonCtl(s, value, opts), layout: 'block' };
		}
	}

	SE.controls = { render, switchCtl, dropdown, closePopup, highlightJson };
})();
