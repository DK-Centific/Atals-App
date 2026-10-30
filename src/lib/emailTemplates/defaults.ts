import { LIGHT } from './palette.ts'
import { FONT, button, callout, detailsCard, fieldChip, paragraph, strongField, TAG_STYLE } from './blocks.ts'
import type { TemplateContent, TemplateId, TemplateMeta } from './types.ts'

// The starting templates, carried over from Twilight's participant reminder and
// moderator assignment emails and restyled to Atlas. "Reset to original" in the
// editor comes back to these.

const ATLAS_URL = 'https://dk-centific.github.io/Atals-App/'

export const TEMPLATES: TemplateMeta[] = [
  { id: 'participant-confirmation', audience: 'participant', name: 'Booking confirmation', when: 'After you book a session' },
  { id: 'participant-cancellation', audience: 'participant', name: 'Cancellation', when: 'When a session is cancelled' },
  { id: 'moderator-assignment', audience: 'moderator', name: 'Session assignment', when: 'When a moderator is assigned' },
]

const h1 = (html: string): string => `<h1 style="${TAG_STYLE.h1}">${html}</h1>`
const h2 = (text: string): string => `<h2 style="${TAG_STYLE.h2}">${text}</h2>`
const signOff = (): string =>
  paragraph('We look forward to working with you! Please feel free to reach out if you have any questions.')
  + `<p style="margin:0 0 4px; font-family:${FONT}; font-size:15px; line-height:1.5; color:${LIGHT.body};">Best regards,</p>`
  + `<p style="margin:0; font-family:${FONT}; font-size:15px; font-weight:700; line-height:1.5; color:${LIGHT.ink};">Project Atlas Team</p>`

const confirmation = [
  h1('Your session is confirmed'),
  paragraph(`Hi ${strongField('participantFirstName')},`),
  paragraph(`Thank you for joining Project Atlas. Your session is booked for ${strongField('sessionDate')}. Here are the details:`),
  detailsCard([
    ['Date', fieldChip('sessionDate')],
    ['Time', fieldChip('sessionTime')],
    ['Address', fieldChip('address')],
    ['Moderator', fieldChip('moderatorName')],
  ]),
  h2('What to expect'),
  paragraph('Our moderator will come to your home, set up the equipment, and guide you through the whole session from start to finish.'),
  callout('Important', [
    `Your moderator will give you a call <strong style="color:${LIGHT.ink};">one day before</strong> the session to confirm.`,
    `If you need to reschedule or cancel, please let us know at least <strong style="color:${LIGHT.ink};">24 hours in advance</strong> so we can make the necessary arrangements.`,
  ]),
  signOff(),
].join('')

const cancellation = [
  h1('Your session has been cancelled'),
  paragraph(`Hi ${strongField('participantFirstName')},`),
  paragraph(`We’re writing to let you know that your Project Atlas session on ${strongField('sessionDate')} has been cancelled. Here is the session that was cancelled:`),
  detailsCard([
    ['Date', fieldChip('sessionDate')],
    ['Time', fieldChip('sessionTime')],
    ['Address', fieldChip('address')],
  ]),
  callout('Want a new time?', [
    'Just reply to this email with a few days and times that work for you, and we’ll book a new session.',
  ], 'danger'),
  paragraph('We’re sorry for any inconvenience, and thank you for your understanding.'),
  `<p style="margin:0 0 4px; font-family:${FONT}; font-size:15px; line-height:1.5; color:${LIGHT.body};">Best regards,</p>`,
  `<p style="margin:0; font-family:${FONT}; font-size:15px; font-weight:700; line-height:1.5; color:${LIGHT.ink};">Project Atlas Team</p>`,
].join('')

const assignment = [
  h1(`Hi ${fieldChip('moderatorFirstName')}, you have a session booked`),
  paragraph(`A participant has been assigned to you for ${strongField('sessionDate')}. The full details are below. Please review them and prepare before the session.`),
  detailsCard([
    ['Participant', fieldChip('participantName')],
    ['Date', fieldChip('sessionDate')],
    ['Time', fieldChip('sessionTime')],
    ['Address', fieldChip('address')],
    ['Phone', fieldChip('participantPhone')],
  ]),
  paragraph(`${strongField('participantFirstName')} will be expecting you at the start of the session. Please call the participant before you head out.`),
  callout('Before you head out', [
    `<strong style="color:${LIGHT.ink};">Grab all the equipment</strong> you’ll need for the session before you leave.`,
    `<strong style="color:${LIGHT.ink};">Call the participant ahead of time</strong> to confirm they’re ready for you. This avoids wasted trips and surprises on arrival.`,
    `<strong style="color:${LIGHT.ink};">Plan your travel time</strong> in advance. Factor in traffic and parking so you arrive on time.`,
  ]),
  paragraph('When you arrive, open your Atlas checklist to start the session.'),
  button('Open Atlas', ATLAS_URL),
  `<p style="margin:0 0 4px; font-family:${FONT}; font-size:15px; line-height:1.5; color:${LIGHT.body};">Thank you,</p>`,
  `<p style="margin:0; font-family:${FONT}; font-size:15px; font-weight:700; line-height:1.5; color:${LIGHT.ink};">Project Atlas Team</p>`,
].join('')

export const DEFAULT_CONTENT: Record<TemplateId, TemplateContent> = {
  'participant-confirmation': {
    subject: 'Your Project Atlas session on {sessionDate} is confirmed',
    html: confirmation,
    updatedAt: null,
    updatedBy: null,
  },
  'participant-cancellation': {
    subject: 'Your Project Atlas session on {sessionDate} has been cancelled',
    html: cancellation,
    updatedAt: null,
    updatedBy: null,
  },
  'moderator-assignment': {
    subject: 'Session assignment: {participantName} on {sessionDate}',
    html: assignment,
    updatedAt: null,
    updatedBy: null,
  },
}
