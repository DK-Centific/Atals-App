// Email templates: the copy-and-paste emails Schedulers send by hand from
// Outlook. Admins edit them; everyone who can book reads and copies them.

export type TemplateId = 'participant-confirmation' | 'participant-cancellation' | 'moderator-assignment'

export type Audience = 'participant' | 'moderator'

/** Light is how almost every inbox shows an email; dark is a preview for dark-mode readers. */
export type EmailMode = 'light' | 'dark'

/** A value a template can pull from a booking. Shown as a chip while editing. */
export type FieldId =
  | 'participantName'
  | 'participantFirstName'
  | 'participantPhone'
  | 'sessionDate'
  | 'sessionTime'
  | 'address'
  | 'moderatorName'
  | 'moderatorFirstName'

export interface TemplateMeta {
  id: TemplateId
  audience: Audience
  name: string
  /** One line on when to send it. */
  when: string
}

/** What an Admin can change, plus who changed it last. */
export interface TemplateContent {
  subject: string
  /** Email body (inside the logo header and footer), light-mode inline styles. */
  html: string
  updatedAt: string | null
  updatedBy: string | null
}

export type FieldValues = Partial<Record<FieldId, string>>
