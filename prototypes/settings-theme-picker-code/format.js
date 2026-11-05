/* Display helpers: setting labels, value formatting and a small, safe markdown renderer. */
(() => {
	const SE = window.SE;

	const ACRONYMS = {
		mcp: 'MCP', ai: 'AI', ui: 'UI', url: 'URL', urls: 'URLs', uri: 'URI', json: 'JSON', jsonc: 'JSONC', html: 'HTML', css: 'CSS', scss: 'SCSS',
		id: 'ID', ids: 'IDs', cli: 'CLI', api: 'API', gpu: 'GPU', byok: 'BYOK', otel: 'OTel', otlp: 'OTLP', ts: 'TS', js: 'JS', npm: 'npm',
		ssh: 'SSH', http: 'HTTP', ascii: 'ASCII', eol: 'EOL', nes: 'NES', ci: 'CI', llm: 'LLM', sdk: 'SDK', osx: 'macOS', mac: 'macOS', wsl: 'WSL',
		scm: 'SCM', pr: 'PR', prs: 'PRs', github: 'GitHub', gpt: 'GPT', jsonl: 'JSONL', mb: 'MB', tsserver: 'TS Server', tsdk: 'TSDK',
		ipynb: '.ipynb', yolo: 'YOLO', nuget: 'NuGet', 'js/ts': 'JS/TS', codelens: 'CodeLens', intellisense: 'IntelliSense', ahp: 'AHP',
		repl: 'REPL', svg: 'SVG', ux: 'UX', vscode: 'VS Code', utf8: 'UTF-8', crlf: 'CRLF', lf: 'LF', dom: 'DOM', emmet: 'Emmet', agentsmd: 'AGENTS.md',
	};
	const acronym = (w) => Object.prototype.hasOwnProperty.call(ACRONYMS, w.toLowerCase()) ? ACRONYMS[w.toLowerCase()] : null;
	function wordify(seg) {
		if (acronym(seg)) { return acronym(seg); }
		return seg
			.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
			.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
			.replace(/([a-zA-Z])(\d)/g, '$1 $2')
			.replace(/[-_]/g, ' ')
			.split(' ').filter(Boolean)
			.map((w) => acronym(w) || (w[0].toUpperCase() + w.slice(1)))
			.join(' ');
	}

	function keySegments(key) {
		let segs = key.split('.');
		if (key.startsWith('github.copilot.chat.')) { segs = segs.slice(3); }
		else if (key.startsWith('github.copilot.')) { segs = segs.slice(2); }
		else if (key.startsWith('terminal.integrated.')) { segs = segs.slice(2); }
		else if (segs.length > 1) { segs = segs.slice(1); }
		return segs;
	}

	/** Label and a short "path" prefix, dropping parts already said by the group the row is shown in. */
	function labelOf(s, context) {
		if (s.title) { return { label: s.title, prefix: '' }; }
		const segs = keySegments(s.k);
		let last = segs.pop();
		if (/^enabled?$/.test(last) && segs.length) { last = segs.pop(); }
		const label = wordify(last);
		const ctx = (context || []).join(' ').toLowerCase();
		const prefix = segs.filter((x) => !/^experimental$/i.test(x)).map(wordify).filter((w) => !ctx.includes(w.toLowerCase())).join(' › ');
		return { label, prefix };
	}
	function displayName(s) {
		const { label, prefix } = labelOf(s, [s.sub.label]);
		return (prefix ? prefix + ' › ' : '') + label;
	}

	function fmt(v) {
		if (v === null || v === undefined) { return 'Not set'; }
		if (v === true) { return 'On'; }
		if (v === false) { return 'Off'; }
		if (typeof v === 'string') { return v === '' ? '""' : v; }
		return JSON.stringify(v);
	}
	function enumLabel(s, value) {
		const i = (s.e || []).findIndex((x) => SE.same(x, value));
		if (i >= 0 && s.el && s.el[i]) { return s.el[i]; }
		if (value === null) { return 'None'; }
		if (value === true) { return 'true'; }
		if (value === false) { return 'false'; }
		return String(value);
	}

	const escapeHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

	function inline(text) {
		const codes = [];
		let t = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
			const ref = /^#([^#\s]+)#$/.exec(code);
			let html;
			if (ref && SE.byKey.has(ref[1])) {
				html = `<a class="se-setting-link" data-key="${ref[1]}" title="${ref[1]}">${escapeHtml(displayName(SE.byKey.get(ref[1])))}</a>`;
			} else if (ref) {
				html = `<code>${ref[1]}</code>`;
			} else {
				html = `<code>${code}</code>`;
			}
			codes.push(html);
			return `\u0000${codes.length - 1}\u0000`;
		});
		t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
			const ref = /^#([^#\s]+)#?$/.exec(url) || /^#?([\w./-]+)$/.exec(url && SE.byKey.has(url.replace(/^#|#$/g, '')) ? url.replace(/^#|#$/g, '') : '');
			if (ref && SE.byKey.has(ref[1])) { return `<a class="se-setting-link" data-key="${ref[1]}">${label}</a>`; }
			return `<a href="${url}" target="_blank" rel="noreferrer" title="${url}">${label}</a>`;
		});
		t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
			.replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s.,)!?:;]|$)/g, '$1<em>$2</em>');
		return t.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i]);
	}

	function markdown(src) {
		if (!src) { return ''; }
		const parts = String(src).split('```');
		let html = '';
		parts.forEach((part, i) => {
			if (i % 2 === 1) {
				// Drop the language tag and blank (or whitespace-only) lines at either end.
				const code = part.replace(/^[\w-]*\n/, '').replace(/^(?:[ \t]*\n)+/, '').replace(/(?:\n[ \t]*)+$/, '').replace(/\n$/, '');
				html += `<pre class="se-md-code"><code>${escapeHtml(code)}</code></pre>`;
				return;
			}
			for (const para of part.split(/\n\s*\n/)) {
				const lines = para.split('\n').filter((l) => l.trim() !== '');
				if (!lines.length) { continue; }
				let list = null;
				let buf = [];
				const flush = () => { if (buf.length) { html += `<p>${buf.map(inline).join('<br>')}</p>`; buf = []; } };
				for (const line of lines) {
					const m = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
					if (m) {
						flush();
						if (!list) { list = []; }
						list.push(m[1]);
					} else if (list && /^\s{2,}/.test(line)) {
						list[list.length - 1] += ' ' + line.trim();
					} else {
						if (list) { html += `<ul>${list.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`; list = null; }
						buf.push(line);
					}
				}
				flush();
				if (list) { html += `<ul>${list.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`; }
			}
		});
		return html;
	}

	/** First sentence of a markdown description, as plain text (for dropdown option details). */
	function plain(src) {
		const d = document.createElement('div');
		d.innerHTML = markdown(src || '');
		return d.textContent;
	}

	// Tiny hyperscript helper.
	function h(sel, attrs, ...kids) {
		const [tag, ...classes] = sel.split('.');
		const el = document.createElement(tag || 'div');
		if (classes.length) { el.className = classes.join(' '); }
		if (attrs) {
			for (const [k, v] of Object.entries(attrs)) {
				if (v === undefined || v === null || v === false) { continue; }
				if (k.startsWith('on') && typeof v === 'function') { el.addEventListener(k.slice(2).toLowerCase(), v); }
				else if (k === 'class') { el.className += (el.className ? ' ' : '') + v; }
				else if (k === 'html') { el.innerHTML = v; }
				else if (k === 'value') { el.value = v; }
				else { el.setAttribute(k, v === true ? '' : v); }
			}
		}
		const add = (c) => {
			if (c === null || c === undefined || c === false) { return; }
			if (Array.isArray(c)) { c.forEach(add); return; }
			el.append(c instanceof Node ? c : document.createTextNode(String(c)));
		};
		kids.forEach(add);
		return el;
	}
	const icon = (name, cls) => h('span.codicon.codicon-' + name + (cls ? '.' + cls : ''), { 'aria-hidden': 'true' });

	Object.assign(SE, { wordify, labelOf, displayName, fmt, enumLabel, escapeHtml, markdown, plain, h, icon });
})();
