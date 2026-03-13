/**
 * UK Holidays and Special Days
 * Returns holiday information for any given date
 */

export const ukHolidays = {
  // Fixed date holidays
  fixed: [
    {
      month: 1,
      day: 1,
      name: "New Year's Day",
      emoji: '🎆',
      color: 'bg-blue-100 text-blue-700',
      greetingBg: 'from-blue-500 to-blue-600',
      greetingText: 'Happy New Year! 🎆',
      animatedBg: 'from-blue-600 via-blue-500 to-cyan-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎆', '✨', '🎊', '🎉'],
      particleColors: ['bg-yellow-400', 'bg-blue-400', 'bg-cyan-300', 'bg-white'],
      activities: ['Reflection sessions', 'New beginnings celebration', 'Wellness check-ins'],
      fact: 'New Year\'s Day celebrates the beginning of a new year in the Gregorian calendar. It originated from the Roman calendar where January was named after Janus, the god of beginnings and endings. Many cultures celebrate with resolutions, reflection, and hope for the year ahead.',
      historicalNote: 'Established as a public holiday in the UK in 1974',
    },
    {
      month: 1,
      day: 25,
      name: 'Burns Night',
      emoji: '🥃',
      color: 'bg-red-100 text-red-700',
      greetingBg: 'from-red-500 to-red-600',
      greetingText: 'Slàinte! Happy Burns Night! 🥃',
      animatedBg: 'from-red-600 via-orange-500 to-amber-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🥃', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🎻', '🥔', '🥬'],
      particleColors: ['bg-red-400', 'bg-orange-400', 'bg-amber-300', 'bg-yellow-300'],
      activities: ['Scottish poetry readings', 'Haggis tasting', 'Ceilidh dancing'],
      fact: 'Burns Night celebrates the life and works of Scotland\'s national poet, Robert Burns. Traditionally celebrated with haggis, neeps, tatties, and whisky. The evening includes readings of Burns\' poetry, particularly "Auld Lang Syne".',
      historicalNote: 'Celebrated annually on January 25th, Robert Burns\' birthday',
    },
    {
      month: 1,
      day: 25,
      name: 'Dydd Santes Dwynwen (St. Dwynwen\'s Day)',
      emoji: '💕',
      color: 'bg-pink-100 text-pink-700',
      greetingBg: 'from-pink-500 to-red-500',
      greetingText: 'Dydd Santes Dwynwen Hapus! (Happy St. Dwynwen\'s Day) 💕',
      animatedBg: 'from-pink-500 via-rose-400 to-red-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['💕', '❤️', '💖', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🌹'],
      particleColors: ['bg-pink-400', 'bg-rose-400', 'bg-red-300', 'bg-white'],
      activities: ['Welsh love stories', 'Card making', 'Traditional Welsh crafts'],
      fact: 'St. Dwynwen is the Welsh patron saint of lovers. She is said to have founded a convent after being rejected by her love. Celebrated as Welsh Valentine\'s Day with cards, flowers, and romantic gestures.',
      historicalNote: 'Commemorates St. Dwynwen, died around 460 AD, Welsh patron saint of lovers',
    },
    {
      month: 2,
      day: 14,
      name: 'Valentine\'s Day',
      emoji: '💕',
      color: 'bg-pink-100 text-pink-700',
      greetingBg: 'from-pink-500 to-red-500',
      greetingText: 'Happy Valentine\'s Day! 💕',
      animatedBg: 'from-pink-500 via-red-400 to-rose-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['💕', '❤️', '💖', '🌹', '💐'],
      particleColors: ['bg-pink-400', 'bg-red-400', 'bg-rose-300', 'bg-white'],
      activities: ['Love and gratitude circle', 'Memory sharing', 'Card making'],
      fact: 'Valentine\'s Day is celebrated in honor of Saint Valentine, an early Christian martyr. The tradition of exchanging love notes dates back to the 15th century. It\'s a day dedicated to celebrating love, friendship, and affection.',
      historicalNote: 'Named after a Christian saint, celebrated since the 15th century',
    },
    {
      month: 3,
      day: 1,
      name: 'St. David\'s Day',
      emoji: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
      color: 'bg-green-100 text-green-700',
      greetingBg: 'from-green-600 to-green-700',
      greetingText: 'Dydd Gŵyl Dewi Hapus! (St. David\'s Day) 🏴󠁧󠁢󠁷󠁬󠁳󠁿',
      animatedBg: 'from-green-600 via-emerald-500 to-lime-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🌱', '🥬', '🌼', '🐉'],
      particleColors: ['bg-green-400', 'bg-emerald-400', 'bg-lime-300', 'bg-yellow-300'],
      activities: ['Welsh culture celebration', 'Leek tasting', 'Welsh music sessions'],
      fact: 'St. David is the patron saint of Wales. He was a 6th-century Welsh bishop known for his ascetic lifestyle and founding of monasteries. Celebrated in Wales with traditional leeks and daffodils as national symbols.',
      historicalNote: 'Commemorates St. David, died around 589 AD',
    },
    {
      month: 3,
      day: 17,
      name: 'St. Patrick\'s Day',
      emoji: '🍀',
      color: 'bg-emerald-100 text-emerald-700',
      greetingBg: 'from-emerald-500 to-emerald-600',
      greetingText: 'Happy St. Patrick\'s Day! 🍀',
      animatedBg: 'from-emerald-500 via-green-400 to-lime-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🍀', '☘️', '🍺', '🎻', '🇮🇪'],
      particleColors: ['bg-emerald-400', 'bg-green-400', 'bg-lime-300', 'bg-yellow-300'],
      activities: ['Irish music sessions', 'Green theme activities', 'Traditional crafts'],
      fact: 'St. Patrick is the patron saint of Ireland. He was a Roman-British missionary who brought Christianity to Ireland. The shamrock became associated with the holiday as St. Patrick used it to explain the Holy Trinity to the Irish people.',
      historicalNote: 'St. Patrick died on March 17th, celebrated since the 9th century',
    },
    {
      month: 4,
      day: 6,
      name: 'Tartan Day',
      emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      color: 'bg-blue-100 text-blue-700',
      greetingBg: 'from-blue-600 to-blue-700',
      greetingText: 'Happy Tartan Day! 🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      animatedBg: 'from-blue-600 via-indigo-500 to-cyan-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🥃', '🎻', '🏔️', '🌾'],
      particleColors: ['bg-blue-400', 'bg-indigo-400', 'bg-cyan-300', 'bg-white'],
      activities: ['Scottish heritage celebration', 'Tartan wearing', 'Cultural events'],
      fact: 'Tartan Day celebrates Scottish heritage and culture. It commemorates the signing of the Declaration of Arbroath in 1320, which asserted Scotland\'s independence. Celebrated with tartan, kilts, and Scottish traditions.',
      historicalNote: 'Commemorates the Declaration of Arbroath signed on April 6, 1320',
    },
    {
      month: 4,
      day: 23,
      name: 'St. George\'s Day',
      emoji: '⚔️',
      color: 'bg-red-100 text-red-700',
      greetingBg: 'from-red-500 to-red-600',
      greetingText: 'Happy St. George\'s Day! ⚔️',
      animatedBg: 'from-red-600 via-crimson-500 to-maroon-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['⚔️', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🐉', '🛡️', '👑'],
      particleColors: ['bg-red-400', 'bg-crimson-400', 'bg-maroon-300', 'bg-white'],
      activities: ['English heritage celebration', 'Cultural activities', 'Stories and legends'],
      fact: 'St. George is the patron saint of England. Known for his legendary fight with a dragon, he became a symbol of courage and chivalry. The red cross on a white background is England\'s flag, derived from his symbol.',
      historicalNote: 'St. George died around 303 AD, patron saint since medieval times',
    },
    {
      month: 5,
      day: 5,
      name: 'Cinco de Mayo',
      emoji: '�🇽',
      color: 'bg-yellow-100 text-yellow-700',
      greetingBg: 'from-yellow-500 to-orange-500',
      greetingText: 'Feliz Cinco de Mayo! 🇲🇽',      animatedBg: 'from-yellow-500 via-orange-400 to-red-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🇲🇽', '🌮', '🎸', '🎺', '🌶️'],
      particleColors: ['bg-yellow-400', 'bg-orange-400', 'bg-red-300', 'bg-green-300'],      activities: ['Cultural celebration', 'Music and dance', 'International cuisine'],
      fact: 'Cinco de Mayo commemorates the Mexican victory over the French Empire at the Battle of Puebla in 1862. It\'s a celebration of Mexican heritage and culture, symbolizing resilience and pride.',
      historicalNote: 'Celebrates the Battle of Puebla on May 5, 1862',
    },
    {
      month: 6,
      day: 1,
      name: 'Pride Month Starts',
      emoji: '🌈',
      color: 'bg-purple-100 text-purple-700',
      greetingBg: 'from-purple-500 to-pink-500',
      greetingText: 'Happy Pride Month! 🌈',
      animatedBg: 'from-purple-500 via-pink-400 to-blue-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🌈', '🏳️‍🌈', '✨', '💜', '💙'],
      particleColors: ['bg-purple-400', 'bg-pink-400', 'bg-blue-300', 'bg-yellow-300'],
      activities: ['Inclusive celebrations', 'Community activities', 'Equality discussions'],
      fact: 'Pride Month celebrates LGBTQ+ history, visibility, and rights. June was chosen to commemorate the Stonewall riots of June 1969, a pivotal moment in the LGBTQ+ rights movement. The rainbow flag symbolizes diversity and inclusion.',
      historicalNote: 'Commemorates the Stonewall riots of June 28-29, 1969',
    },
    {
      month: 7,
      day: 4,
      name: 'Independence Day',
      emoji: '🎆',
      color: 'bg-blue-100 text-blue-700',
      greetingBg: 'from-blue-600 to-red-600',
      greetingText: 'Happy Independence Day! 🎆',
      animatedBg: 'from-blue-600 via-red-500 to-white',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎆', '🇺🇸', '🦅', '⭐', '✨'],
      particleColors: ['bg-blue-400', 'bg-red-400', 'bg-white', 'bg-yellow-300'],
      activities: ['American heritage activities', 'Cultural celebration', 'Fireworks viewing'],
      fact: 'Independence Day celebrates the Declaration of Independence signed on July 4, 1776, when the thirteen American colonies declared independence from British rule. It\'s a cornerstone of American identity and freedom.',
      historicalNote: 'Celebrates the Declaration of Independence, July 4, 1776',
    },
    {
      month: 9,
      day: 1,
      name: 'Back to School',
      emoji: '🎒',
      color: 'bg-amber-100 text-amber-700',
      greetingBg: 'from-amber-500 to-orange-500',
      greetingText: 'Welcome Back to School Season! 🎒',
      animatedBg: 'from-amber-500 via-orange-400 to-yellow-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎒', '📚', '✏️', '🚌', '📝'],
      particleColors: ['bg-amber-400', 'bg-orange-400', 'bg-yellow-300', 'bg-red-300'],
      activities: ['Educational programs', 'Memory games', 'Learning activities'],
      fact: 'Back to School traditionally marks the beginning of the academic year in September. This season celebrates learning, growth, and new beginnings. It\'s a time for students and families to prepare for educational adventures.',
      historicalNote: 'School year traditionally begins in September across most countries',
    },
    {
      month: 10,
      day: 31,
      name: 'Halloween',
      emoji: '🎃',
      color: 'bg-orange-100 text-orange-700',
      greetingBg: 'from-orange-600 to-purple-600',
      greetingText: 'Happy Halloween! 🎃',
      animatedBg: 'from-orange-600 via-purple-500 to-black',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎃', '👻', '🦇', '🕷️', '🕸️'],
      particleColors: ['bg-orange-400', 'bg-purple-400', 'bg-black', 'bg-yellow-300'],
      activities: ['Costume themes', 'Spooky stories', 'Pumpkin decorating'],
      fact: 'Halloween originated from the ancient Celtic festival of Samhain, celebrated 2,000 years ago. It marked the boundary between summer and winter, when it was believed the veil between the living and the dead was thin. The tradition of costumes comes from wearing disguises to ward off ghosts.',
      historicalNote: 'Evolved from Celtic Samhain festival and Christian All Hallows\' Eve',
    },
    {
      month: 11,
      day: 5,
      name: 'Guy Fawkes Night',
      emoji: '✨',
      color: 'bg-indigo-100 text-indigo-700',
      greetingBg: 'from-indigo-600 to-purple-600',
      greetingText: 'Remember, Remember the 5th of November! ✨',
      animatedBg: 'from-indigo-600 via-purple-500 to-orange-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['✨', '🔥', '🎆', '🎇', '🗝️'],
      particleColors: ['bg-indigo-400', 'bg-purple-400', 'bg-orange-300', 'bg-yellow-300'],
      activities: ['Historical stories', 'Bonfire night themes', 'Safety discussions'],
      fact: 'Guy Fawkes Night commemorates the failed Gunpowder Plot of 1605, when Guy Fawkes and conspirators attempted to blow up the British Parliament. It\'s celebrated with fireworks and bonfires, particularly popular in the UK.',
      historicalNote: 'Commemorates the failed Gunpowder Plot of November 5, 1605',
    },
    {
      month: 11,
      day: 30,
      name: 'St. Andrew\'s Day',
      emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      color: 'bg-blue-100 text-blue-700',
      greetingBg: 'from-blue-600 to-blue-700',
      greetingText: 'Happy St. Andrew\'s Day! 🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      animatedBg: 'from-blue-600 via-indigo-500 to-cyan-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🏴󠁧󠁢󠁳󠁣󠁴󠁿', '✝️', '🥃', '🎻', '🏔️'],
      particleColors: ['bg-blue-400', 'bg-indigo-400', 'bg-cyan-300', 'bg-white'],
      activities: ['Scottish culture celebration', 'Scottish music', 'Traditional crafts'],
      fact: 'St. Andrew is the patron saint of Scotland. He was one of Jesus\'s apostles and is symbolized by the saltire (X-shaped cross). St. Andrew\'s Day marks the beginning of the Scottish festive season and national celebrations.',
      historicalNote: 'Commemorates St. Andrew, died around 60 AD, patron saint of Scotland',
    },
    {
      month: 12,
      day: 25,
      name: 'Christmas Day',
      emoji: '🎄',
      color: 'bg-red-100 text-red-700',
      greetingBg: 'from-red-500 to-green-500',
      greetingText: 'Merry Christmas! 🎄',
      animatedBg: 'from-red-500 via-green-400 to-gold',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎄', '🎅', '❄️', '🎁', '⭐'],
      particleColors: ['bg-red-400', 'bg-green-400', 'bg-gold', 'bg-white'],
      activities: ['Christmas celebrations', 'Festive games', 'Caroling', 'Festive meals'],
      fact: 'Christmas celebrates the birth of Jesus Christ, though the exact date is uncertain. December 25 was chosen by the early church, possibly aligning with the winter solstice celebrations. Christmas has become a global celebration of joy, family, and giving.',
      historicalNote: 'Celebrated as Christian holy day since at least the 4th century',
    },
    {
      month: 12,
      day: 26,
      name: 'Boxing Day',
      emoji: '🎁',
      color: 'bg-emerald-100 text-emerald-700',
      greetingBg: 'from-emerald-500 to-teal-500',
      greetingText: 'Happy Boxing Day! 🎁',
      animatedBg: 'from-emerald-500 via-teal-400 to-cyan-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎁', '🏃‍♂️', '🎄', '❄️', '🥂'],
      particleColors: ['bg-emerald-400', 'bg-teal-400', 'bg-cyan-300', 'bg-white'],
      activities: ['Relaxation day', 'Games and activities', 'Festive gatherings'],
      fact: 'Boxing Day is celebrated the day after Christmas. The name comes from the tradition of giving boxes of gifts to servants and tradespeople. It\'s now a day for relaxation, sports, and spending time with family.',
      historicalNote: 'British tradition dating back to the 18th century',
    },
    {
      month: 12,
      day: 31,
      name: "New Year's Eve",
      emoji: '🎊',
      color: 'bg-indigo-100 text-indigo-700',
      greetingBg: 'from-indigo-600 to-purple-600',
      greetingText: 'Happy New Year\'s Eve! 🎊',
      animatedBg: 'from-indigo-600 via-purple-500 to-gold',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🎊', '🎆', '✨', '🥂', '🎇'],
      particleColors: ['bg-indigo-400', 'bg-purple-400', 'bg-gold', 'bg-white'],
      activities: ['Reflection activities', 'Goal setting', 'Celebration preparations'],
      fact: 'New Year\'s Eve marks the final day of the year in the Gregorian calendar. Celebrated worldwide with countdowns, fireworks, and celebrations. It\'s a moment of reflection on the past year and hope for the future.',
      historicalNote: 'Celebrated globally as the transition to a new year',
    },
  ],

  // Easter-based holidays (calculated)
  // These are approximate - actual dates vary by year
  moveable: [
    {
      name: 'Good Friday',
      offsetFromEaster: -2,
      emoji: '⛪',
      color: 'bg-purple-100 text-purple-700',
      greetingBg: 'from-purple-600 to-indigo-600',
      greetingText: 'Happy Good Friday! ⛪',
      animatedBg: 'from-purple-600 via-indigo-500 to-slate-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['⛪', '✝️', '🙏', '🌿', '🕊️'],
      particleColors: ['bg-purple-400', 'bg-indigo-400', 'bg-slate-300', 'bg-white'],
      activities: ['Reflection sessions', 'Quiet contemplation', 'Traditional stories'],
      fact: 'Good Friday commemorates the crucifixion of Jesus Christ. It\'s observed by Christians as a day of fasting and prayer. Hot cross buns are traditionally eaten on this day as a symbol of the cross.',
      historicalNote: 'The Friday before Easter Sunday, observed since early Christianity',
    },
    {
      name: 'Easter Sunday',
      offsetFromEaster: 0,
      emoji: '🐰',
      color: 'bg-yellow-100 text-yellow-700',
      greetingBg: 'from-yellow-500 to-pink-500',
      greetingText: 'Happy Easter! 🐰',
      animatedBg: 'from-yellow-500 via-pink-400 to-lavender-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🐰', '🥚', '🌸', '🕊️', '🌷'],
      particleColors: ['bg-yellow-400', 'bg-pink-400', 'bg-lavender-300', 'bg-white'],
      activities: ['Easter egg hunt', 'Spring celebration', 'Traditional crafts', 'Festive meals'],
      fact: 'Easter celebrates the resurrection of Jesus Christ. The date varies each year (between March 22 and April 25) and is determined by the lunar calendar. Easter eggs symbolize new life and rebirth.',
      historicalNote: 'The most important Christian holiday, celebrated since the 1st century',
    },
    {
      name: 'Easter Monday',
      offsetFromEaster: 1,
      emoji: '🌸',
      color: 'bg-pink-100 text-pink-700',
      greetingBg: 'from-pink-500 to-rose-500',
      greetingText: 'Happy Easter Monday! 🌸',
      animatedBg: 'from-pink-500 via-rose-400 to-lavender-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🌸', '🌷', '🐣', '🌼', '🕊️'],
      particleColors: ['bg-pink-400', 'bg-rose-400', 'bg-lavender-300', 'bg-white'],
      activities: ['Spring activities', 'Garden themes', 'Outdoor walks'],
      fact: 'Easter Monday is a public holiday in the UK and many Commonwealth countries, the day after Easter Sunday. It extends the Easter celebration and is often a time for community events and outdoor activities.',
      historicalNote: 'Public holiday in UK since the 19th century',
    },
  ],

  // Other observances
  observances: [
    {
      month: 2,
      day: 1,
      name: 'Groundhog Day',
      emoji: '🌤️',
      color: 'bg-amber-100 text-amber-700',
      greetingBg: 'from-amber-600 to-yellow-600',
      greetingText: 'Happy Groundhog Day! 🌤️',
      animatedBg: 'from-amber-600 via-yellow-500 to-orange-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['🌤️', '🐿️', '❄️', '🌞', '⛅'],
      particleColors: ['bg-amber-400', 'bg-yellow-400', 'bg-orange-300', 'bg-white'],
      activities: ['Weather predictions', 'Nature talks', 'Fun folklore'],
      fact: 'Groundhog Day is observed on February 2nd with roots in the ancient Celtic festival of Imbolc. According to tradition, if a groundhog sees its shadow, there will be six more weeks of winter. It\'s become a popular cultural phenomenon, especially in North America.',
      historicalNote: 'Evolved from the Celtic festival of Imbolc, popularized in North America',
    },
    {
      month: 3,
      day: 21,
      name: 'World Down Syndrome Day',
      emoji: '💙',
      color: 'bg-blue-100 text-blue-700',
      greetingBg: 'from-blue-500 to-blue-600',
      greetingText: 'World Down Syndrome Awareness Day! 💙',      animatedBg: 'from-blue-500 via-sky-400 to-cyan-400',
      bgPattern: 'bg-gradient-to-br',
      floatingEmojis: ['💙', '🤝', '🌟', '❤️', '✨'],
      particleColors: ['bg-blue-400', 'bg-sky-400', 'bg-cyan-300', 'bg-white'],      activities: ['Awareness discussions', 'Inclusive activities', 'Community support'],
      fact: 'World Down Syndrome Day is celebrated on March 21st (3/21) representing the three copies of chromosome 21. It aims to raise awareness and promote the rights, inclusion, and well-being of people with Down syndrome.',
      historicalNote: 'Recognized by the United Nations since 2012',
    },
    {
      month: 4,
      day: 22,
      name: 'Earth Day',
      emoji: '🌍',
      color: 'bg-green-100 text-green-700',
      greetingBg: 'from-green-500 to-emerald-600',
      greetingText: 'Happy Earth Day! 🌍',
      activities: ['Eco-friendly activities', 'Gardening', 'Nature conservation'],
      fact: 'Earth Day is celebrated on April 22nd to promote environmental awareness. Initiated in 1970, it marks the beginning of the modern environmental movement. Over a billion people participate worldwide in various environmental activities.',
      historicalNote: 'First celebrated April 22, 1970, coordinated by Gaylord Nelson',
    },
    {
      month: 5,
      day: 1,
      name: 'May Day',
      emoji: '🌼',
      color: 'bg-yellow-100 text-yellow-700',
      greetingBg: 'from-yellow-500 to-orange-500',
      greetingText: 'Happy May Day! 🌼',
      activities: ['Spring celebration', 'Floral activities', 'Traditional dances'],
      fact: 'May Day celebrates the beginning of summer in the Northern Hemisphere. It has roots in the Celtic festival of Beltane and the Roman festival of Floralia. Traditionally celebrated with dancing around the maypole and flower crowns.',
      historicalNote: 'Ancient festival celebrated for thousands of years across cultures',
    },
    {
      month: 6,
      day: 21,
      name: 'Summer Solstice',
      emoji: '☀️',
      color: 'bg-yellow-100 text-yellow-700',
      greetingBg: 'from-yellow-500 to-orange-600',
      greetingText: 'Happy Summer Solstice! ☀️',
      activities: ['Outdoor celebrations', 'Longest day activities', 'Garden tours'],
      fact: 'The Summer Solstice is the day with the most daylight hours in the Northern Hemisphere. It marks the astronomical beginning of summer. Ancient cultures built monuments like Stonehenge aligned with the solstice sunrise.',
      historicalNote: 'Celebrated for thousands of years, astronomical significance',
    },
    {
      month: 9,
      day: 21,
      name: 'Autumn Equinox',
      emoji: '🍂',
      color: 'bg-orange-100 text-orange-700',
      greetingBg: 'from-orange-500 to-red-600',
      greetingText: 'Happy Autumn Equinox! 🍂',
      activities: ['Harvest themes', 'Fall activities', 'Thanksgiving prep'],
      fact: 'The Autumn Equinox marks the astronomical beginning of fall in the Northern Hemisphere. Day and night are approximately equal length. Historically celebrated as a harvest festival in many cultures.',
      historicalNote: 'Astronomical event observed for millennia',
    },
    {
      month: 12,
      day: 21,
      name: 'Winter Solstice',
      emoji: '❄️',
      color: 'bg-blue-100 text-blue-700',
      greetingBg: 'from-blue-600 to-cyan-600',
      greetingText: 'Happy Winter Solstice! ❄️',
      activities: ['Indoor activities', 'Festive preparations', 'Cozy gatherings'],
      fact: 'The Winter Solstice is the shortest day in the Northern Hemisphere. It marks the astronomical beginning of winter. Celebrated in many cultures with festivals of light to symbolize the return of the sun.',
      historicalNote: 'Celebrated by ancient cultures including Stonehenge builders',
    },
  ],
};

/**
 * Calculate Easter Sunday for a given year
 * Using the Computus algorithm
 */
export const getEasterDate = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
};

/**
 * Check if a date is a UK holiday or special day
 */
export const getHolidayInfo = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();

  // Check fixed holidays
  for (const holiday of ukHolidays.fixed) {
    if (holiday.month === month && holiday.day === day) {
      return holiday;
    }
  }

  // Check observances
  for (const observance of ukHolidays.observances) {
    if (observance.month === month && observance.day === day) {
      return observance;
    }
  }

  // Check moveable holidays (Easter-based)
  const easterDate = getEasterDate(year);
  for (const holiday of ukHolidays.moveable) {
    const holidayDate = new Date(easterDate);
    holidayDate.setDate(easterDate.getDate() + holiday.offsetFromEaster);

    if (holidayDate.getDate() === day && holidayDate.getMonth() === date.getMonth()) {
      return {
        ...holiday,
        name: holiday.name,
        emoji: holiday.emoji,
        color: holiday.color,
        greetingBg: holiday.greetingBg,
        greetingText: holiday.greetingText,
        activities: holiday.activities,
      };
    }
  }

  return null;
};

/**
 * Get all holidays for a specific date
 */
export const getAllHolidaysForDate = (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const holidays = [];

  // Check fixed holidays
  for (const holiday of ukHolidays.fixed) {
    if (holiday.month === month && holiday.day === day) {
      holidays.push(holiday);
    }
  }

  // Check observances
  for (const observance of ukHolidays.observances) {
    if (observance.month === month && observance.day === day) {
      holidays.push(observance);
    }
  }

  // Check moveable holidays (Easter-based)
  const easterDate = getEasterDate(year);
  for (const holiday of ukHolidays.moveable) {
    const holidayDate = new Date(easterDate);
    holidayDate.setDate(easterDate.getDate() + holiday.offsetFromEaster);

    if (holidayDate.getDate() === day && holidayDate.getMonth() === date.getMonth()) {
      holidays.push({
        ...holiday,
        name: holiday.name,
        emoji: holiday.emoji,
        color: holiday.color,
        greetingBg: holiday.greetingBg,
        greetingText: holiday.greetingText,
        activities: holiday.activities,
      });
    }
  }

  return holidays;
};

/**
 * Get all holidays for a given month and year
 */
export const getHolidaysForMonth = (year, month) => {
  const holidays = [];

  // Add fixed holidays
  for (const holiday of ukHolidays.fixed) {
    if (holiday.month === month) {
      holidays.push({
        ...holiday,
        date: new Date(year, month - 1, holiday.day),
      });
    }
  }

  // Add observances
  for (const observance of ukHolidays.observances) {
    if (observance.month === month) {
      holidays.push({
        ...observance,
        date: new Date(year, month - 1, observance.day),
      });
    }
  }

  // Add moveable holidays
  const easterDate = getEasterDate(year);
  for (const holiday of ukHolidays.moveable) {
    const holidayDate = new Date(easterDate);
    holidayDate.setDate(easterDate.getDate() + holiday.offsetFromEaster);

    if (holidayDate.getMonth() === month - 1) {
      holidays.push({
        ...holiday,
        date: holidayDate,
      });
    }
  }

  return holidays.sort((a, b) => a.date.getDate() - b.date.getDate());
};

export default getHolidayInfo;
