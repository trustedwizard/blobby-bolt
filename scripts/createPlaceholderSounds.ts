import { writeFileSync } from 'fs';
import { join } from 'path';

const soundFiles = [
  'powerup-collect.mp3',
  'powerup-activate.mp3',
  'shield-hit.mp3',
  'speed-boost.mp3',
  'magnet-active.mp3',
  'gravity-pulse.mp3',
  'teleport.mp3',
  'split-bomb.mp3'
];

// Create an empty MP3 file for each sound
soundFiles.forEach(file => {
  const path = join('public', 'sounds', file);
  writeFileSync(path, '');
  console.log(`Created placeholder for ${file}`);
}); 