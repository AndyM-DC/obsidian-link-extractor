import { Editor, Modal, Plugin } from 'obsidian';

// ── Link extraction ────────────────────────────────────────────────────────────

const MARKDOWN_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const ANGLE_LINK_RE    = /<(https?:\/\/[^>]+)>/g;
const BARE_URL_RE      = /https?:\/\/[^\s)<>\]"']+/g;

type FormatStyle = 'plain' | 'bullets' | 'numbered' | 'markdown';

function stripTrailingPunct(url: string): string {
	return url.replace(/[.,;:!?)]+$/, '');
}

function extractLinks(content: string): string[] {
	const found = new Set<string>();

	// 1. Markdown links: [text](url)
	MARKDOWN_LINK_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = MARKDOWN_LINK_RE.exec(content)) !== null) {
		found.add(stripTrailingPunct(m[2]));
	}

	// 2. Angle-bracket links: <url>
	ANGLE_LINK_RE.lastIndex = 0;
	while ((m = ANGLE_LINK_RE.exec(content)) !== null) {
		found.add(stripTrailingPunct(m[1]));
	}

	// 3. Bare URLs — strip already-captured links first to avoid duplicates
	const stripped = content
		.replace(MARKDOWN_LINK_RE, '')
		.replace(ANGLE_LINK_RE, '');
	BARE_URL_RE.lastIndex = 0;
	while ((m = BARE_URL_RE.exec(stripped)) !== null) {
		found.add(stripTrailingPunct(m[0]));
	}

	return Array.from(found);
}

function formatLinks(links: string[], style: FormatStyle): string {
	switch (style) {
		case 'numbered': return links.map((u, i) => `${i + 1}. ${u}`).join('\n');
		case 'markdown': return links.map(u => `- [${u}](${u})`).join('\n');
		case 'bullets':  return links.map(u => `- ${u}`).join('\n');
		default:         return links.join('\n');
	}
}

// ── Modal ──────────────────────────────────────────────────────────────────────

class LinkListModal extends Modal {
	private links: string[];
	private style: FormatStyle = 'plain';

	constructor(app: import('obsidian').App, links: string[]) {
		super(app);
		this.links = links;
	}

	onOpen(): void {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'External Links' });

		if (this.links.length === 0) {
			contentEl.createEl('p', { text: 'No external links found in this note.' });
			contentEl.createEl('button', { text: 'Close' })
				.addEventListener('click', () => this.close());
			return;
		}

		contentEl.createEl('p', {
			text: `Found ${this.links.length} external link${this.links.length !== 1 ? 's' : ''}:`,
			cls: 'link-extractor-count',
		});

		// Format toggle row
		const fmtRow = contentEl.createDiv({ cls: 'link-extractor-fmt-row' });
		const textarea = contentEl.createEl('textarea', { cls: 'link-extractor-textarea' });
		textarea.value = formatLinks(this.links, this.style);

		const formats: { key: FormatStyle; label: string }[] = [
			{ key: 'plain',    label: 'Plain URLs'     },
			{ key: 'bullets',  label: 'Bullet List'    },
			{ key: 'numbered', label: 'Numbered List'  },
			{ key: 'markdown', label: 'Markdown Links' },
		];

		const updateAll = (key: FormatStyle) => {
			this.style = key;
			textarea.value = formatLinks(this.links, this.style);
			fmtRow.querySelectorAll<HTMLButtonElement>('button').forEach(b => {
				b.classList.toggle('mod-cta', b.dataset.key === key);
			});
		};

		formats.forEach(({ key, label }) => {
			const btn = fmtRow.createEl('button', { text: label });
			btn.dataset.key = key;
			if (key === this.style) btn.addClass('mod-cta');
			btn.addEventListener('click', () => updateAll(key));
		});

		// Action row
		const actionRow = contentEl.createDiv({ cls: 'link-extractor-action-row' });

		const copyBtn = actionRow.createEl('button', { text: 'Copy to Clipboard', cls: 'mod-cta' });
		copyBtn.addEventListener('click', async () => {
			await navigator.clipboard.writeText(textarea.value);
			copyBtn.textContent = 'Copied!';
			setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 2000);
		});

		actionRow.createEl('button', { text: 'Close' })
			.addEventListener('click', () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

// ── Plugin ─────────────────────────────────────────────────────────────────────

const STYLES = `
.link-extractor-count { color: var(--text-muted); margin-bottom: 6px; }
.link-extractor-fmt-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.link-extractor-textarea {
	width: 100%; height: 220px;
	font-family: var(--font-monospace); font-size: 13px;
	resize: vertical; margin-bottom: 10px;
	background: var(--background-secondary); color: var(--text-normal);
	border: 1px solid var(--background-modifier-border);
	border-radius: 4px; padding: 8px;
}
.link-extractor-action-row { display: flex; gap: 8px; justify-content: flex-end; }
`;

export default class LinkExtractorPlugin extends Plugin {
	private styleEl: HTMLStyleElement | null = null;

	async onload(): Promise<void> {
		this.addCommand({
			id: 'extract-external-links',
			name: 'Extract External Links from Note',
			editorCallback: (editor: Editor) => {
				const links = extractLinks(editor.getValue());
				new LinkListModal(this.app, links).open();
			},
		});

		this.styleEl = document.createElement('style');
		this.styleEl.id = 'link-extractor-styles';
		this.styleEl.textContent = STYLES;
		document.head.appendChild(this.styleEl);
	}

	onunload(): void {
		this.styleEl?.remove();
	}
}
