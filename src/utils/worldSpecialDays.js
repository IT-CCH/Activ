const FIXED_SPECIAL_DAYS = [
  {
    month: 2,
    day: 4,
    category: 'medical',
    name: 'World Cancer Day',
    emoji: '🎗️',
    fact: 'World Cancer Day is observed globally every year on 4 February to raise awareness, improve education, and encourage action for prevention, detection, and treatment.',
    historicalNote: 'Led by the Union for International Cancer Control (UICC), this day unites governments, healthcare professionals, organizations, and communities around cancer awareness.',
    activities: ['Promote screening awareness', 'Share prevention tips', 'Support cancer care charities'],
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    greetingBg: 'from-rose-500 to-pink-600',
  },
  {
    month: 2,
    day: 9,
    category: 'food',
    name: 'World Pizza Day',
    emoji: '🍕',
    fact: 'World Pizza Day celebrates one of the world’s most popular and shared foods.',
    historicalNote: 'Pizza evolved from traditional flatbreads and became a global staple through regional styles and modern food culture.',
    activities: ['Plan a pizza-themed meal', 'Offer balanced topping options', 'Share resident favorite combinations'],
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    greetingBg: 'from-orange-500 to-amber-600',
  },
  {
    month: 3,
    day: 24,
    category: 'medical',
    name: 'World Tuberculosis Day',
    emoji: '🫁',
    fact: 'World Tuberculosis Day highlights the global effort to eliminate TB and improve access to early diagnosis and treatment.',
    historicalNote: 'It marks Dr. Robert Koch\'s 1882 announcement of the discovery of the TB bacillus, which transformed understanding of the disease.',
    activities: ['Run TB awareness sessions', 'Share signs and symptoms', 'Encourage early medical checks'],
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    greetingBg: 'from-sky-500 to-cyan-600',
  },
  {
    month: 4,
    day: 7,
    category: 'medical',
    name: 'World Health Day',
    emoji: '🩺',
    fact: 'World Health Day is marked each year on 7 April to spotlight global public health priorities and universal access to care.',
    historicalNote: 'The date commemorates the founding of the World Health Organization (WHO) in 1948.',
    activities: ['Host health check events', 'Promote healthy habits', 'Discuss preventive care'],
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    greetingBg: 'from-blue-500 to-indigo-600',
  },
  {
    month: 5,
    day: 12,
    category: 'medical',
    name: 'International Nurses Day',
    emoji: '👩‍⚕️',
    fact: 'International Nurses Day celebrates the contribution of nurses to healthcare systems worldwide.',
    historicalNote: 'Observed on the birth anniversary of Florence Nightingale, a pioneer of modern nursing.',
    activities: ['Recognize nursing teams', 'Share care stories', 'Promote workforce wellbeing'],
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    greetingBg: 'from-violet-500 to-purple-600',
  },
  {
    month: 5,
    day: 28,
    category: 'food',
    name: 'International Burger Day',
    emoji: '🍔',
    fact: 'International Burger Day celebrates burger culture and modern comfort food around the world.',
    historicalNote: 'Burgers became globally popular through street food culture, diners, and regional interpretations.',
    activities: ['Create healthy burger options', 'Offer texture-friendly versions', 'Run a themed lunch menu'],
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    greetingBg: 'from-amber-500 to-orange-600',
  },
  {
    month: 6,
    day: 7,
    category: 'food',
    name: 'World Food Safety Day',
    emoji: '🥗',
    fact: 'World Food Safety Day promotes safe food handling, preparation, and storage across the full supply chain.',
    historicalNote: 'Supported by the World Health Organization and the Food and Agriculture Organization to improve food safety worldwide.',
    activities: ['Review kitchen hygiene routines', 'Check food storage standards', 'Teach safe handling practices'],
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    greetingBg: 'from-emerald-500 to-green-600',
  },
  {
    month: 6,
    day: 18,
    category: 'food',
    name: 'International Sushi Day',
    emoji: '🍣',
    fact: 'International Sushi Day celebrates sushi traditions and global appreciation for Japanese cuisine.',
    historicalNote: 'Sushi has roots in preservation methods and evolved into a refined culinary art shared worldwide.',
    activities: ['Discuss global food traditions', 'Offer suitable fish-free alternatives', 'Promote safe food preparation'],
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    greetingBg: 'from-teal-500 to-cyan-600',
  },
  {
    month: 7,
    day: 7,
    category: 'food',
    name: 'World Chocolate Day',
    emoji: '🍫',
    fact: 'World Chocolate Day celebrates the cultural and culinary impact of chocolate across many countries.',
    historicalNote: 'Chocolate originated from cacao traditions in Mesoamerica and later spread globally in different forms.',
    activities: ['Offer small dessert portions', 'Highlight sugar-aware options', 'Share chocolate origin stories'],
    color: 'bg-amber-50 text-amber-800 border-amber-300',
    greetingBg: 'from-amber-700 to-orange-800',
  },
  {
    month: 9,
    day: 17,
    category: 'medical',
    name: 'World Patient Safety Day',
    emoji: '🏥',
    fact: 'World Patient Safety Day encourages safer systems of care and reduction of preventable harm in healthcare settings.',
    historicalNote: 'The day was established by the World Health Assembly to strengthen patient safety as a global priority.',
    activities: ['Review medication safety', 'Run safety briefings', 'Improve communication checks'],
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    greetingBg: 'from-cyan-500 to-blue-600',
  },
  {
    month: 9,
    day: 29,
    category: 'food',
    name: 'International Day of Awareness of Food Loss and Waste',
    emoji: '♻️',
    fact: 'This UN day raises awareness on reducing food loss and waste to improve sustainability and food security.',
    historicalNote: 'Reducing food loss and waste is a key target under global sustainable development commitments.',
    activities: ['Track avoidable food waste', 'Improve portion planning', 'Promote leftovers and reuse strategies'],
    color: 'bg-lime-50 text-lime-700 border-lime-200',
    greetingBg: 'from-lime-500 to-emerald-600',
  },
  {
    month: 10,
    day: 1,
    category: 'food',
    name: 'International Coffee Day',
    emoji: '☕',
    fact: 'International Coffee Day recognizes coffee growers, culture, and the social role of coffee globally.',
    historicalNote: 'Coffee culture spread through trade routes and local traditions, creating unique rituals in many regions.',
    activities: ['Offer decaf and hydration alternatives', 'Host a social coffee hour', 'Share café-style menu moments'],
    color: 'bg-stone-50 text-stone-700 border-stone-200',
    greetingBg: 'from-stone-500 to-amber-700',
  },
  {
    month: 10,
    day: 16,
    category: 'food',
    name: 'World Food Day',
    emoji: '🌾',
    fact: 'World Food Day highlights food security, nutrition, and the right to safe and affordable food for all.',
    historicalNote: 'It marks the founding of the Food and Agriculture Organization (FAO) in 1945.',
    activities: ['Discuss nutrition goals', 'Plan balanced menus', 'Promote inclusive food access'],
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    greetingBg: 'from-amber-500 to-orange-600',
  },
  {
    month: 11,
    day: 14,
    category: 'medical',
    name: 'World Diabetes Day',
    emoji: '🩸',
    fact: 'World Diabetes Day raises awareness of diabetes prevention, diagnosis, and long-term management.',
    historicalNote: 'Observed on the birthday of Sir Frederick Banting, who co-discovered insulin.',
    activities: ['Promote healthy eating', 'Encourage routine blood sugar checks', 'Share diabetes education materials'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    greetingBg: 'from-indigo-500 to-blue-700',
  },
  {
    month: 12,
    day: 1,
    category: 'medical',
    name: 'World AIDS Day',
    emoji: '🎈',
    fact: 'World AIDS Day supports global awareness, prevention, treatment access, and solidarity with people living with HIV.',
    historicalNote: 'It was the first ever global health day, first observed in 1988.',
    activities: ['Share HIV awareness resources', 'Promote stigma-free care', 'Support testing and treatment campaigns'],
    color: 'bg-red-50 text-red-700 border-red-200',
    greetingBg: 'from-red-500 to-rose-600',
  },
];

const withDate = (year, item) => ({
  ...item,
  date: new Date(year, item.month - 1, item.day),
});

const getEasterSunday = (year) => {
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

const getDynamicSpecialDays = (year) => {
  const easterSunday = getEasterSunday(year);
  const pancakeDayDate = new Date(easterSunday);
  pancakeDayDate.setDate(easterSunday.getDate() - 47);

  return [
    {
      category: 'food',
      name: 'Pancake Day (Shrove Tuesday)',
      emoji: '🥞',
      fact: 'Pancake Day takes place on Shrove Tuesday, the day before Lent begins, and is celebrated with pancake-focused meals in many countries.',
      historicalNote: 'Traditionally, households used rich ingredients like eggs, milk, and butter before the Lenten fasting period.',
      activities: ['Serve sweet and savory pancakes', 'Offer texture-modified pancake options', 'Host a simple pancake social'],
      color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      greetingBg: 'from-yellow-500 to-amber-600',
      month: pancakeDayDate.getMonth() + 1,
      day: pancakeDayDate.getDate(),
      date: pancakeDayDate,
    },
  ];
};

const getAllWorldSpecialDays = (year) => {
  return [
    ...FIXED_SPECIAL_DAYS.map((item) => withDate(year, item)),
    ...getDynamicSpecialDays(year),
  ];
};

export const getWorldSpecialDaysForMonth = (year, month) => {
  return getAllWorldSpecialDays(year)
    .filter((item) => (item.date.getMonth() + 1) === month);
};

export const getWorldSpecialDaysForDate = (date) => {
  if (!date) return [];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return getAllWorldSpecialDays(year)
    .filter((item) => item.month === month && item.day === day);
};
