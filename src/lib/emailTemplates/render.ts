import { FIELD_LABEL, FONT, TAG_STYLE, isFieldId } from './blocks.ts'
import { LIGHT, toDark } from './palette.ts'
import type { EmailMode, FieldValues } from './types.ts'

// Turning a template into an email: clean what the editor or a paste produced,
// put the booking's values in, wrap it in the Atlas header and footer, and copy
// it as rich text so Outlook keeps the layout.

const DROP = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'meta', 'link', 'title', 'head', 'svg', 'math', 'form',
  'input', 'button', 'select', 'textarea', 'video', 'audio', 'canvas', 'template', 'noscript', 'base', 'xml',
])
const KEEP = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'a', 'h1', 'h2', 'h3',
  'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th', 'img', 'hr', 'blockquote', 'sup', 'sub',
])
const ATTRS = new Set([
  'style', 'href', 'src', 'alt', 'width', 'height', 'align', 'valign', 'colspan', 'rowspan', 'role', 'border',
  'cellpadding', 'cellspacing', 'data-field', 'data-block', 'target', 'rel', 'title',
])
const SAFE_HREF = /^(https?:|mailto:|tel:)/i
const SAFE_SRC = /^(https:|data:image\/(png|jpe?g|gif|webp);base64,)/i
const UNSAFE_STYLE = /expression\s*\(|javascript:|url\s*\(|behavior\s*:|-moz-binding/i
const HEADINGS: Record<string, string> = { h4: 'h3', h5: 'h3', h6: 'h3' }

function cleanNode(node: Element, doc: Document): void {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase()
    if (DROP.has(tag)) { child.remove(); continue }
    let el: Element = child
    if (HEADINGS[tag] || tag === 'font') {
      // Old or deep tags: keep the text in the nearest tag we support.
      const next = doc.createElement(HEADINGS[tag] ?? 'span')
      const color = tag === 'font' ? child.getAttribute('color') : null
      if (color && /^#?[0-9a-z]+$/i.test(color)) next.setAttribute('style', `color:${color};`)
      while (child.firstChild) next.appendChild(child.firstChild)
      child.replaceWith(next)
      el = next
    } else if (!KEEP.has(tag)) {
      // Unknown wrapper (Word's o:p, section ...): keep its children.
      cleanNode(child, doc)
      child.replaceWith(...Array.from(child.childNodes))
      continue
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim()
      const ok = ATTRS.has(name)
        && !(name === 'href' && !SAFE_HREF.test(value))
        && !(name === 'src' && !SAFE_SRC.test(value))
        && !(name === 'style' && UNSAFE_STYLE.test(value))
        && !(name === 'data-field' && !isFieldId(value))
      if (!ok) el.removeAttribute(attr.name)
    }
    const field = el.getAttribute('data-field')
    if (isFieldId(field)) {
      // A field chip is one token: always its label, never edited inside.
      el.textContent = FIELD_LABEL[field]
      el.setAttribute('contenteditable', 'false')
      continue
    }
    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener')
    }
    const base = TAG_STYLE[el.tagName.toLowerCase()]
    if (base && !el.getAttribute('style')) el.setAttribute('style', base)
    cleanNode(el, doc)
  }
}

/** Keep only safe, email-friendly HTML; bare tags get the template's default styles. */
export function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  // Comments (Word's <!--[if ...]> blocks, StartFragment markers) never belong in an email.
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT)
  const comments: Node[] = []
  while (walker.nextNode()) comments.push(walker.currentNode)
  for (const c of comments) c.parentNode?.removeChild(c)
  cleanNode(doc.body, doc)
  return doc.body.innerHTML
}

/** Values the subject and body can show; an empty value stays a visible [Label]. */
export function fillFields(html: string, values: FieldValues): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  for (const chip of Array.from(doc.body.querySelectorAll('[data-field]'))) {
    const id = chip.getAttribute('data-field')
    if (!isFieldId(id)) { chip.remove(); continue }
    const value = values[id]?.trim()
    if (value) {
      chip.replaceWith(doc.createTextNode(value))
    } else {
      const mark = doc.createElement('span')
      mark.setAttribute('style', `background-color:${LIGHT.field}; border-radius:4px; padding:0 3px;`)
      mark.textContent = `[${FIELD_LABEL[id]}]`
      chip.replaceWith(mark)
    }
  }
  return doc.body.innerHTML
}

export function fillSubject(subject: string, values: FieldValues): string {
  return subject.replace(/\{(\w+)\}/g, (whole, id: string) => {
    if (!isFieldId(id)) return whole
    return values[id]?.trim() || `[${FIELD_LABEL[id]}]`
  })
}

/** The whole email: Atlas header with the Centific mark, the body, and the footer. */
export function buildEmail(body: string, mode: EmailMode, logoSrc: string | null): string {
  const logo = logoSrc
    ? `<td valign="middle" style="padding-right:12px; line-height:0;"><img src="${logoSrc}" alt="Centific" width="40" height="40" style="display:block; width:40px; height:40px; border:0;"></td>`
    : ''
  const html = `<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; background-color:${LIGHT.page}; border-collapse:collapse;"><tbody><tr><td align="center" style="padding:28px 12px;">`
    + `<table role="presentation" border="0" cellspacing="0" cellpadding="0" width="600" style="width:100%; max-width:600px; background-color:${LIGHT.card}; border-radius:14px; border-collapse:separate;"><tbody>`
    + `<tr><td align="center" style="padding:28px 24px 20px; border-bottom:1px solid ${LIGHT.frameLine};">`
    + `<table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tbody><tr>${logo}`
    + `<td valign="middle" style="font-family:${FONT}; font-size:26px; font-weight:700; letter-spacing:-0.02em; line-height:1; color:${LIGHT.logo};">Centific</td></tr></tbody></table>`
    + `<p style="margin:10px 0 0; font-family:${FONT}; font-size:11px; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:${LIGHT.accent};">Project Atlas</p>`
    + '</td></tr>'
    + `<tr><td style="padding:16px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; background-color:${LIGHT.frame}; border:1px solid ${LIGHT.frameLine}; border-radius:10px; border-collapse:separate;"><tbody><tr><td style="padding:30px 36px 28px; font-family:${FONT}; font-size:15px; line-height:1.6; color:${LIGHT.body};">${body}</td></tr></tbody></table></td></tr>`
    + `<tr><td align="center" style="padding:6px 36px 28px;"><p style="margin:0; font-family:${FONT}; font-size:11px; line-height:1.5; letter-spacing:0.04em; color:${LIGHT.muted};">© Centific · Project Atlas</p></td></tr>`
    + '</tbody></table></td></tr></tbody></table>'
  return mode === 'dark' ? toDark(html) : html
}

const logoCache = new Map<string, Promise<string | null>>()

/** The Centific mark as a PNG in one colour (dark grey for light mode, white for dark). */
export function tintedLogo(src: string, color: string): Promise<string | null> {
  const key = `${src}|${color}`
  const cached = logoCache.get(key)
  if (cached) return cached
  const made = new Promise<string | null>((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const size = 96
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(null); return }
        ctx.drawImage(img, 0, 0, size, size)
        ctx.globalCompositeOperation = 'source-in'
        ctx.fillStyle = color
        ctx.fillRect(0, 0, size, size)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
  logoCache.set(key, made)
  return made
}

/** Plain-text version, for apps that don't take rich text. */
export function toPlainText(html: string): string {
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed; left:-10000px; top:0; width:600px; white-space:normal;'
  host.innerHTML = html
  document.body.appendChild(host)
  const text = host.innerText
  host.remove()
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

/** Copy as rich text (with a plain-text twin). Falls back to selecting and copying. */
export async function copyRich(html: string, text: string): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      return
    } catch {
      // Fall through to the selection copy below.
    }
  }
  const host = document.createElement('div')
  host.contentEditable = 'true'
  host.style.cssText = 'position:fixed; left:-10000px; top:0; width:600px;'
  host.innerHTML = html
  document.body.appendChild(host)
  const range = document.createRange()
  range.selectNodeContents(host)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  const ok = document.execCommand('copy')
  sel?.removeAllRanges()
  host.remove()
  if (!ok) throw new Error('copy refused')
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
