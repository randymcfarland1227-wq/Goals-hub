// Snapshot of goals from the "Life and Present Goals" Google Sheet.
// Edit this file directly when goals change, or ask Claude to re-sync it from the Sheet.
// Sheet: https://docs.google.com/spreadsheets/d/1Lh0bKm7BIantGkWX4eK-zFkfZt5sESbKua9PnVY8010/edit

const GOALS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Lh0bKm7BIantGkWX4eK-zFkfZt5sESbKua9PnVY8010/edit';

// Bi-Weekly Review cadence: first review is this date, then repeats every REVIEW_INTERVAL_DAYS.
const REVIEW_ANCHOR_DATE = '2026-08-15';
const REVIEW_INTERVAL_DAYS = 14;

// The overarching vision — long term life goals / dream board.
const VISION = {
  title: 'I will build a world I am proud of',
  subtitle: 'Long Term Life Goals',
  dreams: [
    { id: 'travel', icon: '🌍', dream: 'Travel', details: 'Backpack Europe, hostels, memories', how: 'Fix credit and have a set place to live and money saved' },
    { id: 'business', icon: '💼', dream: 'Business', details: 'A small business, not from a place of desperation', how: 'Gain security through other avenues first — find time to brainstorm ideas' },
    { id: 'security', icon: '🏡', dream: 'Security', details: 'Buy a house after experience', how: 'Where, credit, when — decide what feels right' },
    { id: 'tangible', icon: '🎁', dream: 'Something Tangible', details: 'Real rewards for my efforts — using my potential to its fullest to make life easier', how: 'Hard work for lasting things — yolo asf' },
    { id: 'creative', icon: '🎸', dream: 'Creative', details: 'A music career, a fearless life', how: 'In motion, but still defining our sound and what we need to know to get there' },
  ],
};

// Present-focus categories — the "why" layer that the bi-weekly review tracks.
const CATEGORIES = [
  { id: 'physical', label: 'Physical Body', icon: '💪', headline: 'Our body is our best friend and we take care of her like a delicate rose, so we have the best physical experience.' },
  { id: 'mental', label: 'Mental', icon: '🧠', headline: 'Equally as important as physical well-being is mental — we take care of our body daily, so we must do the same for our brain. We take care of our brain for an emotional and mental experience in this world.' },
  { id: 'connection', label: 'Connection', icon: '🤝', headline: 'Building a life that focuses on the souls in the world around us rewards us with an experience of love, memories, joy, and connection.' },
  { id: 'financial', label: 'Financial', icon: '💰', headline: 'Having a healthy relationship with our finances embolds us to think in non-restrictive ways and allows security to ease tension in our brains and bodies — providing a breeding ground for connections and experiences.' },
  { id: 'spiritual', label: 'Spiritual / Embodiment', icon: '✨', headline: 'Having the deepest connection within our soul provides us purpose — how we act is how we embody it.' },
];

// freq/dateAdded are unused today but kept for parity with other hubs, in case items get added later.
const EFFORTS = [
  // ---------- PHYSICAL BODY ----------
  { id: 'physical-protein', category: 'physical', effort: 'Protein Intake', reason: 'To help grow muscles for both strength, aesthetic, and endurance', how: '170 grams of protein daily via natural sources and protein shakes' },
  { id: 'physical-hydration', category: 'physical', effort: 'Hydrating Our Body', reason: 'To give our body the required hydration for optimal physical and mental experience', how: '3–4 bottles a day (add lime for flavor if not wanting it plain)' },
  { id: 'physical-selfcare', category: 'physical', effort: 'Self Care Practices', reason: 'To take care of our beautiful body and also grow our confidence and ensure emboldness', how: 'Follow the self care guide on a routine basis and keep up with needs' },
  { id: 'physical-nourish', category: 'physical', effort: 'Nourishing Our Body', reason: 'To give our body the proper tools to repair and manage functions for all parts of us', how: 'Eating whole foods — fruits, vegetables, etc.' },
  { id: 'physical-sleep', category: 'physical', effort: 'Getting Good Sleep', reason: 'To allow peak body repair and feeling rested to take on the world', how: '8 hours (7 hour minimum)' },
  { id: 'physical-vitamins', category: 'physical', effort: 'Taking Vitamins / Supps', reason: 'To supplement or enhance the vitamins we are deriving from foods', how: 'Using the pill organizer and the purchase sheet to keep up on needs' },

  // ---------- MENTAL ----------
  { id: 'mental-reading', category: 'mental', effort: 'Reading More', reason: 'To promote a healthy and aware brain while also learning / intaking low stimuli', how: 'Using the books we have and setting an intention to be curious' },
  { id: 'mental-journaling', category: 'mental', effort: 'Journaling', reason: 'Present moment awareness — slowing down enough to realize we are all we need to be', how: 'Using Google Docs as a reflection space, not as a task planner or psychoanalyzer' },
  { id: 'mental-healthyminds', category: 'mental', effort: 'Healthy Minds Sessions', reason: 'To cover a range of healthy mind practices that in turn grow a richer reality and experience', how: 'Daily sessions on the Healthy Minds app' },
  { id: 'mental-cleanspaces', category: 'mental', effort: 'Clean Spaces / Things', reason: 'Less clutter will always equal calm — routine prevents needing to catch up', how: 'Follow the TickTick schedule and do extra when we can' },

  // ---------- CONNECTION ----------
  { id: 'connection-social', category: 'connection', effort: 'Social Connection', reason: 'To feel connected and cultured — being present with the people in the world around us', how: 'Look for / plan lunches, fun experiences, momentum' },
  { id: 'connection-relationships', category: 'connection', effort: 'Cultivating Relationships', reason: 'To give friendship and compassion to someone I can build memories and experiences with', how: 'To be a villager — put in the effort' },
  { id: 'connection-experiences', category: 'connection', effort: 'Experiences and Pics', reason: 'Creating novel experiences I can look back on reflectively with proudness', how: 'Make opportunities for pics' },
  { id: 'connection-training', category: 'connection', effort: "Training (Marvel)", reason: "To help Marvel and I's bond and promote an environment where he knows how to be", how: 'Following the plan and auditing monthly' },

  // ---------- FINANCIAL ----------
  { id: 'financial-credit', category: 'financial', effort: 'Credit', reason: 'To ascertain a credit score that opens the door for us to be independent and long lasting', how: 'Making active accounts attractive, paying old debts, and a plan for the two big ones' },
  { id: 'financial-savings', category: 'financial', effort: 'Moving Forward Savings', reason: 'To give us the tools needed to spread our wings into the world, to experience life', how: 'Using the savings tracker to best build how we are preparing ourselves' },
  { id: 'financial-material', category: 'financial', effort: 'Material', reason: 'To catch up on odds and ends that cause us disdain', how: 'Use the sheet to snowball them into a complete state' },

  // ---------- SPIRITUAL / EMBODIMENT ----------
  { id: 'spiritual-guitar', category: 'spiritual', effort: 'Guitar', reason: 'To embody the art of acoustic songwriting and storytelling', how: 'Use TickTick reminder with the guitar reference sheet' },
  { id: 'spiritual-vocal', category: 'spiritual', effort: 'Vocal', reason: 'To give our gift a place to grow and tell the story of emotion through expression', how: 'Use TickTick reminder with the guitar reference sheet' },
  { id: 'spiritual-production', category: 'spiritual', effort: 'Production', reason: 'To master how to deliver our creativity to a broad range in a quality and well-done way', how: 'Use TickTick reminder with the guitar reference sheet' },
];
