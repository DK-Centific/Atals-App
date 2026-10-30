// App tour wording, one place to edit it. Each tour is a short list of steps for
// one area of Atlas; the first sign-in shows "welcome", then each area shows its
// own tour the first time someone opens it.
//
// A step: { target, title, body, roles? }
//   target: the data-tour="…" name it points at. Leave it out for a centred card.
//           A step whose target isn't on screen for this person is skipped.
//   roles:  who sees it ('admin', 'scheduler'). Leave it out for both.
//
// Moderator: TODO, their tour comes later (Checklist).

const ADMIN = ['admin']
const SCHEDULER = ['scheduler']

export const TOURS = {
  welcome: [
    {
      title: 'Welcome to Atlas',
      body: 'Atlas is where we book home sessions, follow them through the day and keep everyone in the loop. This quick tour shows you around. It takes about a minute.',
    },
    {
      target: 'rail-schedule',
      title: 'Your schedule',
      body: 'Every booking lives here, by day, week or month. This is where you’ll spend most of your time.',
    },
    {
      target: 'rail-templates',
      title: 'Email templates',
      body: 'Ready-made emails for participants and moderators. Pick a booking, copy the email and paste it into Outlook.',
      roles: SCHEDULER,
    },
    {
      target: 'rail-templates',
      title: 'Email templates',
      body: 'Ready-made emails for participants and moderators. You can copy them like everyone else, and edit the wording for the whole team.',
      roles: ADMIN,
    },
    {
      target: 'rail-checklist',
      title: 'Checklist',
      body: 'What each moderator confirms before and after a session, so you can see who is ready.',
      roles: ADMIN,
    },
    {
      target: 'rail-users',
      title: 'Users',
      body: 'Add teammates, choose what they can do, and give them a temporary password to sign in with.',
      roles: ADMIN,
    },
    {
      target: 'rail-tracker',
      title: 'Production tracker',
      body: 'How the project is going: sessions completed, the weekly target, hours, miles and home types.',
      roles: ADMIN,
    },
    {
      target: 'sync',
      title: 'Sync status',
      body: 'Shows whether bookings reached OneForma and SharePoint. A number here means something needs a look.',
      roles: ADMIN,
    },
    {
      target: 'refresh',
      title: 'Get the newest version',
      body: 'Atlas gets small updates often. Press this to load the latest one. The version number underneath tells you which one you’re on.',
    },
    {
      target: 'account',
      title: 'Your account',
      body: 'Sign out here. You can also switch on Demo data to practise with sample bookings, or take this tour again.',
    },
    {
      target: 'tour-button',
      title: 'Help on every page',
      body: 'Press Tour any time for a short walk through the page you’re on.',
    },
  ],

  day: [
    {
      target: 'day-title',
      title: 'Today at a glance',
      body: 'This page shows today’s bookings, earliest first. Times are always Pacific time.',
    },
    {
      target: 'legend',
      title: 'Counts that filter',
      body: 'How many bookings are in each state today. Click one, like “booked”, to show only those. Click it again to show everything.',
    },
    {
      target: 'needs-moderator',
      title: 'Needs a moderator',
      body: 'Bookings nobody is running yet. Click to see them, then open one and choose a moderator.',
      roles: ADMIN,
    },
    {
      target: 'session-card',
      title: 'Open a booking',
      body: 'Click a booking to see its details, send emails, move it or cancel it. Right-click for quick actions.',
    },
    {
      target: 'session-live',
      title: 'Happening now',
      body: 'A booking that’s in session has a glowing edge. Click it to show its live card on the left. Click again to hide it.',
      roles: ADMIN,
    },
    {
      target: 'filters',
      title: 'Filters',
      body: 'Narrow the list by status, moderator or home type. “Range from HQ” sets how far away people can be. Widen it if you run out of people nearby.',
    },
    {
      target: 'new-booking',
      title: 'New booking',
      body: 'Pick a day and a start time. The end time sets itself two hours later. Then choose a participant and press Book session. Nothing is emailed until you choose to send it.',
      roles: SCHEDULER,
    },
    {
      target: 'new-booking',
      title: 'New booking',
      body: 'Pick a day and a start time. The end time sets itself two hours later. Choose a participant, and a moderator if you know who’s going. Nothing is emailed until you choose to send it.',
      roles: ADMIN,
    },
    {
      target: 'booking-moderator',
      title: 'Moderator is optional',
      body: 'Leave it as Unassigned if you’re not sure. An Admin chooses the moderator later.',
      roles: SCHEDULER,
    },
    {
      target: 'map-tile',
      title: 'See it on a map',
      body: 'Where everyone is, compared with HQ. Open it to plan routes and find people to book.',
    },
    {
      target: 'view-toggle',
      title: 'Day, week or month',
      body: 'Switch views here. Each one has its own short tour the first time you open it.',
    },
  ],

  week: [
    {
      target: 'week-title',
      title: 'This week',
      body: 'Every booking this week, Monday to Sunday, laid out by hour.',
    },
    {
      target: 'week-grid',
      title: 'Bookings by hour',
      body: 'Each block is a booking. Its colour shows its state. Click one to open it, or right-click for quick actions.',
    },
    {
      target: 'legend',
      title: 'Counts that filter',
      body: 'Click a count to show only those bookings this week.',
    },
    {
      target: 'view-toggle',
      title: 'Switch views',
      body: 'Go back to Day for today’s list and New booking, or to Month for the big picture.',
    },
  ],

  month: [
    {
      target: 'month-nav',
      title: 'The month',
      body: 'Use the arrows to move between months.',
    },
    {
      target: 'today-strip',
      title: 'Today’s sessions',
      body: 'A quick look at today. Click a session to open it, or “View full day” for the Day page.',
    },
    {
      target: 'month-grid',
      title: 'Every day of the month',
      body: 'The small bars show each day’s bookings by colour. Click a day to see what’s on it.',
    },
  ],

  map: [
    {
      target: 'map-queue',
      title: 'People you can book',
      body: 'Everyone ready to book, closest to HQ first. Search by name or address, or click someone to find them on the map.',
    },
    {
      target: 'map-canvas',
      title: 'Click a dot',
      body: 'Each dot is a person. Click one to see the drive from HQ, book them straight from the map, or fix their address if the dot is in the wrong place.',
    },
    {
      target: 'map-dates',
      title: 'Which days',
      body: 'Choose which days’ bookings show on the map: today, tomorrow, this week and more.',
    },
    {
      target: 'filters',
      title: 'Distance and filters',
      body: 'Set “Range from HQ” to see people further away when you run out nearby. You can also filter by status, moderator and home type.',
    },
    {
      target: 'map-layers',
      title: 'Show or hide',
      body: 'Turn each colour of dot on or off. Completed bookings are hidden until you ask for them.',
    },
    {
      target: 'map-back',
      title: 'Back to the schedule',
      body: 'Return to today’s list any time.',
    },
  ],

  templates: [
    {
      target: 'templates-list',
      title: 'Pick an email',
      body: 'Emails for participants and for moderators, grouped by who receives them.',
    },
    {
      target: 'templates-fill',
      title: 'Fill it from a booking',
      body: 'Choose a booking and its name, date, time and address fill in for you.',
    },
    {
      target: 'templates-copy',
      title: 'Copy and send',
      body: 'Copy the email and paste it into Outlook. Atlas doesn’t send this one for you.',
    },
    {
      target: 'templates-edit',
      title: 'Change the wording',
      body: 'Edit a template and everyone gets the new wording.',
      roles: ADMIN,
    },
  ],

  users: [
    {
      target: 'users-add',
      title: 'Add a teammate',
      body: 'Enter their name and email and choose a role: Scheduler, Admin or Moderator. Atlas gives them a temporary password to change when they first sign in.',
      roles: ADMIN,
    },
    {
      target: 'users-table',
      title: 'Everyone who can sign in',
      body: 'Click a person to change their role, reset their password or turn their access off.',
      roles: ADMIN,
    },
  ],

  tracker: [
    {
      target: 'tracker-range',
      title: 'This week or all time',
      body: 'Switch between this week’s numbers and the whole project.',
      roles: ADMIN,
    },
    {
      target: 'tracker-tiles',
      title: 'The headline numbers',
      body: 'Sessions scheduled and completed, progress to the weekly target, bookings still needing a moderator, and billable hours and miles.',
      roles: ADMIN,
    },
    {
      target: 'home-types',
      title: 'Home types',
      body: 'How many homes of each type are done, booked or still open, with their sizes and features underneath.',
      roles: ADMIN,
    },
  ],

  // TODO: moderator tour for the Checklist, once the content is ready.
  checklist: [],
}

/** Which area of Atlas a path is, for its tour. */
export function sectionOf(pathname) {
  if (pathname.startsWith('/day/map')) return 'map'
  if (pathname.startsWith('/day')) return 'day'
  if (pathname.startsWith('/week')) return 'week'
  if (pathname.startsWith('/month')) return 'month'
  if (pathname.startsWith('/templates')) return 'templates'
  if (pathname.startsWith('/admin/users')) return 'users'
  if (pathname.startsWith('/admin/tracker')) return 'tracker'
  if (pathname.startsWith('/checklist')) return 'checklist'
  return null
}

/** A tour's steps for one role. Moderators have none yet (TODO above). */
export const stepsFor = (tourId, role) => (role === 'moderator' ? [] : (TOURS[tourId] ?? []).filter((s) => !s.roles || s.roles.includes(role)))
