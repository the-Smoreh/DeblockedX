/*
 * Legal page content.
 *
 * Everything here is written to describe what the code in this repository
 * actually does. If the app's data handling changes, this file has to change
 * with it -- a policy that describes behaviour the site does not have is worse
 * than no policy, because it is a written misstatement rather than a gap.
 *
 * Current, verified as of the LAST_UPDATED date below:
 *   - no server, no accounts, no analytics, no outbound fetch() of user data
 *   - all state is localStorage on the visitor's own device (STORED_KEYS)
 *   - games are third-party iframes; artwork is loaded from third-party hosts
 *   - webfonts are self-hosted, so they make no third-party request
 */

export const LAST_UPDATED = '15 August 2026';

/*
 * TODO(owner): replace with a real, monitored address before publishing.
 * The DMCA section is legally meaningless without a working contact route --
 * a takedown notice that cannot be delivered cannot be acted on, and the safe
 * harbour depends on acting.
 */
export const CONTACT_EMAIL = 'you@example.com';

/* Mirrors the localStorage keys written by App.jsx and streamRows.js. */
export const STORED_KEYS = [
  ['Settings', 'Theme, accent colour, font, motion, density and sound preferences.'],
  ['Favourites', 'Which games you have starred.'],
  ['Play counts', 'How many times you have opened each game, used to order the "popular" row.'],
  ['Library choice', 'Which of the three game libraries you last had open.'],
  ['Cloak preferences', 'Whether the startup cloak is enabled, and whether it has run this session.'],
  ['Announcement state', 'The last announcement version you dismissed.'],
  ['Custom theme image', 'If you upload a background image, the image itself is stored on your device.'],
  ['Audio preferences', 'Your click-sound and background-audio choices.'],
  ['Unlocked extras', 'Whether you have unlocked the hidden section.'],
];

export const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This is a short policy because the site does very little with your data. There are no accounts, no analytics, and no server that stores anything about you.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Nothing is sent to us. This site has no backend, no login, no analytics tag, and no tracking pixel. We do not receive your name, email, IP address, or browsing history, because there is nowhere for that information to go.',
        ],
      },
      {
        heading: 'What is stored on your device',
        body: [
          'Your preferences are saved in your browser’s local storage so the site remembers them next visit. This data never leaves your computer and we cannot read it. It covers:',
        ],
        list: STORED_KEYS.map(([name, what]) => `${name} — ${what}`),
        after: [
          'You can erase all of it at any time by clearing site data for this domain in your browser settings, or by using your browser’s private/incognito mode, which discards it when you close the window.',
        ],
      },
      {
        heading: 'Games and artwork are loaded from other companies',
        body: [
          'This is the part worth reading. The games are not hosted here. Each one runs inside an embedded frame served by a third party, and much of the cover artwork is loaded from third-party image hosts.',
          'When a game or image loads, that third party receives your IP address and basic browser information, and may set its own cookies or storage, exactly as if you had visited its website directly. Their handling of that data is governed by their privacy policies, not this one. We do not control them, we are not told what they collect, and we cannot delete data they hold.',
          'If you want to avoid this, do not open the games.',
        ],
      },
      {
        heading: 'Fonts',
        body: [
          'Typefaces are served from this site’s own domain. They previously came from Google Fonts, which meant every visitor’s IP address was disclosed to Google before the page rendered. That request has been removed.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'This site is not directed to children under 13, and we do not knowingly collect personal information from anyone. The preference data described above stays on the device and is never transmitted.',
          'Be aware that the third-party games and image hosts described above are separate services with their own data practices, and we cannot make representations on their behalf. A parent or guardian who wants a specific game’s data practices reviewed should consult that game’s own policy.',
          'If you believe a child has provided personal information to us directly, contact us and we will address it.',
        ],
      },
      {
        heading: 'Changes',
        body: [
          'If this policy changes, the date at the top of the page changes with it. There is no mailing list to notify, so the date is the notice.',
        ],
      },
      {
        heading: 'Contact',
        body: [`Questions about this policy: ${CONTACT_EMAIL}`],
      },
    ],
  },

  terms: {
    title: 'Terms of Use',
    intro: 'Plain terms for a free site. Using it means you accept them.',
    sections: [
      {
        heading: 'The site is provided as-is',
        body: [
          'This is a free, unofficial, hobby project offered without warranty of any kind. It may be offline, broken, or incomplete at any time. Nothing here is guaranteed to work, to keep working, or to be accurate. To the fullest extent the law allows, we are not liable for any loss or damage arising from your use of the site.',
        ],
      },
      {
        heading: 'We do not own the games',
        body: [
          'Games are made and hosted by other people and companies. They are embedded here as links, not republished. All trademarks and copyrights in the games belong to their respective owners, and their inclusion is not a claim of ownership, sponsorship, or endorsement in either direction.',
          'If you own rights in something linked here and want it removed, see the copyright page. Removal requests are honoured.',
        ],
      },
      {
        heading: 'Your network, your responsibility',
        body: [
          'Read this one properly. Schools, workplaces and other networks usually have an acceptable use policy, and visiting a site like this one may well breach it. That is a matter between you and whoever runs your network.',
          'You are responsible for knowing and following the rules of the network and device you are using. We do not encourage you to break them, we cannot give you permission to break them, and we are not responsible if you do. If you are not sure whether you are allowed to use this site where you are, assume you are not.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: ['Do not use this site to harass anyone, to break the law, or to attack, overload, or interfere with the site or the third-party services it links to.'],
      },
      {
        heading: 'Changes',
        body: ['These terms may change. The date at the top of the page reflects the current version, and continuing to use the site means accepting it.'],
      },
      {
        heading: 'Contact',
        body: [`Questions about these terms: ${CONTACT_EMAIL}`],
      },
    ],
  },

  copyright: {
    title: 'Copyright & Takedown',
    intro:
      'If you hold rights in something linked from this site and want it gone, tell us and we will remove it. You do not need a lawyer to ask.',
    sections: [
      {
        heading: 'How to request removal',
        body: [`Send the following to ${CONTACT_EMAIL}. Plain English is fine.`],
        list: [
          'Identification of the work you hold rights in.',
          'The exact page or game title on this site that you want removed, specific enough for us to find it.',
          'Your name and contact details.',
          'A statement that you believe in good faith that the use is not authorised by the rights holder, its agent, or the law.',
          'A statement that the information in your notice is accurate, and that you are the rights holder or authorised to act on their behalf.',
          'Your signature, electronic or physical.',
        ],
        after: [
          'We aim to act on valid notices promptly. Because the games are embedded rather than hosted here, removal means the entry is taken off the site; we cannot delete a file from a server we do not run, and you may also want to contact the host directly.',
        ],
      },
      {
        heading: 'If your entry was removed and you think that was wrong',
        body: [
          `Send a counter-notice to ${CONTACT_EMAIL} with the entry that was removed, your contact details, and a statement made under penalty of perjury that you believe it was removed as a result of mistake or misidentification. We will review it.`,
        ],
      },
      {
        heading: 'Bad-faith notices',
        body: [
          'Knowingly filing a false takedown notice carries legal consequences under the DMCA and comparable laws elsewhere. Please only send one for material you actually hold rights in.',
        ],
      },
    ],
  },
};

export const LEGAL_NAV = [
  ['privacy', 'Privacy'],
  ['terms', 'Terms'],
  ['copyright', 'Copyright'],
];
