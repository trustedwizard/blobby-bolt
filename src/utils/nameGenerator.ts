const ADJECTIVES = [
  'Swift', 'Clever', 'Brave', 'Mighty', 'Quick',
  'Wise', 'Bold', 'Sharp', 'Bright', 'Agile'
];

const NOUNS = [
  'Blob', 'Runner', 'Hunter', 'Seeker', 'Chaser',
  'Warrior', 'Spirit', 'Shadow', 'Spark', 'Star'
];

export function generateAIName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}${noun}`;
}