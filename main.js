'use strict';

const { Plugin, Modal, Notice } = require('obsidian');

// Patterns to detect external links
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const ANGLE_LINK_RE    = /<(https?:\/\/[^>]+)>/g;
const BARE_URL_RE      = /https?:\/\/[^\s\)<>\]"']+/g;

function extractLinks(content) {
    const found = new Set();

    // 1. Markdown links [text](url)
    let m;
    MARKDOWN_LINK_RE.lastIndex = 0;
    while ((m = MARKDOWN_LINK_RE.exec(content)) !== null) {
        found.add(stripTrailingPunct(m[2]));
    }

    // 2. Angle-bracket links <url>
    ANGLE_LINK_RE.lastIndex = 0;
    while ((m = ANGLE_LINK_RE.exec(content)) !== null) {
        found.add(stripTrailingPunct(m[1]));
    }

    // 3. Bare URLs — strip the parts already captured above to avoid dupes
    const stripped = content
        .replace(MARKDOWN_LINK_RE, '')
        .replace(ANGLE_LINK_RE, '');
    BARE_URL_RE.lastIndex = 0;
    while ((m = BARE_URL_RE.exec(stripped)) !== null) {
        found.add(stripTrailingPunct(m[0]));
    }

    return Array.from(found);
}

function stripTrailingPunct(url) {
    return url.replace(/[.,;:!?)]+$/, '');
}

function formatLinks(links, style) {
    if (style === 'numbered') {
        return links.map((u, i) => `${i + 1}. ${u}`).join('\n');
    }
    if (style === 'markdown') {
        return links.map(u => `- [${u}](${u})`).join('\n');
    }
    if (style === 'bullets') {
        return links.map(u => `- ${u}`).join('\n');
    }
    // plain — one per line
    return links.join('\n');
}

// ── Modal ─────────────────────────────────────────────────────────────────────

class LinkListModal extends Modal {
    constructor(app, links) {
        super(app);
        this.links  = links;
        this.style  = 'plain';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('link-extractor-modal');

        contentEl.createEl('h2', { text: 'External Links' });

        if (this.links.length === 0) {
            contentEl.createEl('p', { text: 'No external links found in this note.' });
            contentEl.createEl('button', { text: 'Close' })
                     .addEventListener('click', () => this.close());
            return;
        }

        contentEl.createEl('p', {
            text: `Found ${this.links.length} external link${this.links.length !== 1 ? 's' : ''}:`,
            cls: 'link-extractor-count'
        });

        // ── Format toggle buttons ─────────────────────────────────────────────
        const fmtRow = contentEl.createDiv({ cls: 'link-extractor-fmt-row' });
        const styles = [
            { key: 'plain',    label: 'Plain URLs'     },
            { key: 'bullets',  label: 'Bullet List'    },
            { key: 'numbered', label: 'Numbered List'  },
            { key: 'markdown', label: 'Markdown Links' },
        ];

        const textarea = contentEl.createEl('textarea', {
            cls: 'link-extractor-textarea'
        });
        textarea.value = formatLinks(this.links, this.style);

        const updateAll = (activeKey) => {
            this.style = activeKey;
            textarea.value = formatLinks(this.links, this.style);
            fmtRow.querySelectorAll('button').forEach(b => {
                b.classList.toggle('mod-cta', b.dataset.key === activeKey);
            });
        };

        styles.forEach(({ key, label }) => {
            const btn = fmtRow.createEl('button', { text: label });
            btn.dataset.key = key;
            if (key === this.style) btn.addClass('mod-cta');
            btn.addEventListener('click', () => updateAll(key));
        });

        // ── Action buttons ────────────────────────────────────────────────────
        const actionRow = contentEl.createDiv({ cls: 'link-extractor-action-row' });

        const copyBtn = actionRow.createEl('button', {
            text: 'Copy to Clipboard',
            cls: 'mod-cta'
        });
        copyBtn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(textarea.value);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 2000);
        });

        const closeBtn = actionRow.createEl('button', { text: 'Close' });
        closeBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        this.contentEl.empty();
    }
}

// ── Plugin ────────────────────────────────────────────────────────────────────

class LinkExtractorPlugin extends Plugin {
    async onload() {
        // Command: works in editor context
        this.addCommand({
            id: 'extract-external-links',
            name: 'Extract External Links from Note',
            editorCallback: (editor) => {
                const links = extractLinks(editor.getValue());
                new LinkListModal(this.app, links).open();
            }
        });

        // Inject minimal styles
        this.addStyle();
    }

    addStyle() {
        const style = document.createElement('style');
        style.id = 'link-extractor-styles';
        style.textContent = `
            .link-extractor-modal .modal-content { max-width: 640px; }
            .link-extractor-count { color: var(--text-muted); margin-bottom: 6px; }
            .link-extractor-fmt-row {
                display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;
            }
            .link-extractor-textarea {
                width: 100%; height: 220px; font-family: var(--font-monospace);
                font-size: 13px; resize: vertical; margin-bottom: 10px;
                background: var(--background-secondary);
                color: var(--text-normal);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px; padding: 8px;
            }
            .link-extractor-action-row {
                display: flex; gap: 8px; justify-content: flex-end;
            }
        `;
        document.head.appendChild(style);
    }

    onunload() {
        document.getElementById('link-extractor-styles')?.remove();
    }
}

module.exports = LinkExtractorPlugin;
