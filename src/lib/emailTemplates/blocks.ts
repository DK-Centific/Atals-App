import { LIGHT } from './palette.ts'
import type { FieldId } from './types.ts'

// Building blocks for template bodies. Every style is inline so the email keeps
// its look once it is pasted into Outlook; layout uses tables for the same reason.

export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
export const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"

export const FIELD_LABEL: Record<FieldId, string> = {
  participantName: 'Participant name',
  participantFirstName: 'Participant first name',
  participantPhone: 'Participant phone',
  sessionDate: 'Session date',
  sessionTime: 'Session time',
  address: 'Address',
  moderatorName: 'Moderator name',
  moderatorFirstName: 'Moderator first name',
}

export const FIELD_IDS = Object.keys(FIELD_LABEL) as FieldId[]

export const isFieldId = (v: unknown): v is FieldId => typeof v === 'string' && v in FIELD_LABEL

/** Default styles for bare tags (from the editor's block menu or a paste). */
export const TAG_STYLE: Record<string, string> = {
  h1: `margin:0 0 16px; font-family:${SERIF}; font-size:30px; line-height:1.2; font-weight:700; color:${LIGHT.ink};`,
  h2: `margin:20px 0 10px; font-family:${FONT}; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${LIGHT.ink};`,
  h3: `margin:16px 0 8px; font-family:${FONT}; font-size:16px; font-weight:700; color:${LIGHT.ink};`,
  p: `margin:0 0 14px; font-family:${FONT}; font-size:15px; line-height:1.6; color:${LIGHT.body};`,
  ul: `margin:0 0 14px; padding-left:22px; font-family:${FONT}; font-size:15px; line-height:1.6; color:${LIGHT.body};`,
  ol: `margin:0 0 14px; padding-left:22px; font-family:${FONT}; font-size:15px; line-height:1.6; color:${LIGHT.body};`,
  li: 'margin:0 0 6px;',
  a: `color:${LIGHT.accent}; font-weight:600; text-decoration:underline;`,
  blockquote: `margin:0 0 14px; padding:4px 0 4px 16px; border-left:3px solid ${LIGHT.accentBar}; font-family:${FONT}; font-size:15px; line-height:1.6; color:${LIGHT.body};`,
  td: `padding:8px 10px; border:1px solid ${LIGHT.frameLine}; font-family:${FONT}; font-size:14px; line-height:1.5; color:${LIGHT.body}; vertical-align:top;`,
  th: `padding:8px 10px; border:1px solid ${LIGHT.frameLine}; background-color:${LIGHT.detail}; font-family:${FONT}; font-size:12px; font-weight:700; text-align:left; color:${LIGHT.ink};`,
  table: 'border-collapse:collapse; width:100%; margin:0 0 14px;',
  hr: `border:0; border-top:1px solid ${LIGHT.frameLine}; margin:20px 0;`,
}

/** A field chip. In the editor it reads as one token; at copy time it becomes the booking's value. */
export const fieldChip = (id: FieldId): string =>
  `<span data-field="${id}" contenteditable="false">${FIELD_LABEL[id]}</span>`

export const strongField = (id: FieldId): string => `<strong style="color:${LIGHT.ink};">${fieldChip(id)}</strong>`

const LABEL_CELL = `width:110px; padding:7px 14px 7px 0; vertical-align:top; font-family:${FONT}; font-size:11px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; color:${LIGHT.accent}; white-space:nowrap;`
const VALUE_CELL = `padding:7px 0; vertical-align:top; font-family:${FONT}; font-size:15px; font-weight:600; line-height:1.4; color:${LIGHT.ink};`

/** The rounded details card (Date / Time / Address ...). Each row: label + HTML value. */
export function detailsCard(rows: [string, string][]): string {
  const body = rows
    .map(([label, value], i) => {
      const line = i < rows.length - 1 ? ` border-bottom:1px solid ${LIGHT.detailLine};` : ''
      return `<tr><td style="${LABEL_CELL}${line}">${label}</td><td style="${VALUE_CELL}${line}">${value}</td></tr>`
    })
    .join('')
  return `<table data-block="details" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; margin:4px 0 20px; background-color:${LIGHT.detail}; border:1px solid ${LIGHT.detailLine}; border-radius:10px; border-collapse:separate;"><tbody><tr><td style="padding:12px 20px;"><table role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; border-collapse:collapse;"><tbody>${body}</tbody></table></td></tr></tbody></table>`
}

/** A callout with a coloured left edge: a small uppercase title, then paragraphs. */
export function callout(title: string, paragraphs: string[], tone: 'accent' | 'danger' = 'accent'): string {
  const edge = tone === 'danger' ? LIGHT.danger : LIGHT.accentBar
  const titleColor = tone === 'danger' ? LIGHT.danger : LIGHT.accent
  const ps = paragraphs
    .map((p, i) => `<p style="margin:0${i < paragraphs.length - 1 ? ' 0 10px' : ''}; font-family:${FONT}; font-size:14.5px; line-height:1.6; color:${LIGHT.ink};">${p}</p>`)
    .join('')
  return `<table data-block="callout" role="presentation" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%; margin:8px 0 20px; background-color:${LIGHT.card}; border-left:3px solid ${edge}; border-radius:0 6px 6px 0; border-collapse:separate;"><tbody><tr><td style="padding:14px 18px;"><p style="margin:0 0 10px; font-family:${FONT}; font-size:11px; font-weight:700; letter-spacing:0.10em; text-transform:uppercase; color:${titleColor};">${title}</p>${ps}</td></tr></tbody></table>`
}

/** A button-shaped link (a table so Outlook keeps its shape). */
export function button(label: string, href: string): string {
  return `<table data-block="button" role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 20px; border-collapse:separate;"><tbody><tr><td style="background-color:${LIGHT.accentBar}; border-radius:10px;"><a href="${href}" target="_blank" rel="noopener" style="display:inline-block; padding:12px 26px; font-family:${FONT}; font-size:15px; font-weight:700; color:${LIGHT.buttonText}; text-decoration:none;">${label}</a></td></tr></tbody></table>`
}

export const divider = (): string => `<hr style="${TAG_STYLE.hr}">`

export const paragraph = (html: string): string => `<p style="${TAG_STYLE.p}">${html}</p>`

export function simpleTable(cols: number, rows: number): string {
  const head = `<tr>${Array.from({ length: cols }, () => `<th style="${TAG_STYLE.th}">Heading</th>`).join('')}</tr>`
  const row = `<tr>${Array.from({ length: cols }, () => `<td style="${TAG_STYLE.td}">&nbsp;</td>`).join('')}</tr>`
  return `<table style="${TAG_STYLE.table}"><tbody>${head}${row.repeat(rows)}</tbody></table>`
}

/** Image widths offered in the editor, in px (the email body is 520px wide). */
export const IMAGE_WIDTHS = { small: 160, medium: 300, large: 440, full: 520 } as const
export type ImageSize = keyof typeof IMAGE_WIDTHS

export const imageTag = (src: string, alt: string, width: number): string =>
  `<img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" width="${width}" style="display:block; width:${width}px; max-width:100%; height:auto; border:0; border-radius:8px; margin:0 0 14px;">`
