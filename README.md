# Blobby Bolt 🟢

A real-time multiplayer blob game built with React, TypeScript, and WebGL. Players control blobs that can eat, split, and use power-ups while competing in various game modes.

## Features ✨

### Core Gameplay
- Real-time multiplayer blob control
- Power-up system with combos
- Team and FFA game modes
- Collision and physics system
- Dynamic obstacle interactions
- Trail and visual effects
- Leaderboard system

### Technical Features
- WebGL rendering with PIXI.js
- WebSocket real-time communication
- Spatial partitioning for performance
- Dynamic quality management
- Memory-aware object pooling
- Mobile-responsive design
- Performance monitoring
- Error boundaries and recovery

## Tech Stack 🛠

- **Frontend**: React, TypeScript, PIXI.js, Tailwind CSS
- **Backend**: Node.js, Socket.IO
- **State Management**: Zustand
- **Build Tools**: Vite
- **Animation**: Framer Motion
- **UI Components**: Lucide React

## Getting Started 🚀

### Prerequisites
- Node.js (v18 or higher)
- Conda (optional, for environment management)

### Environment Setup

Using Conda (recommended):
```bash
conda create -n blobby-env
conda activate blobby-env
```

Using npm directly:
```bash
npm install
```

### Development

1. Start the development server:
```bash
npm run dev
```

2. Start both client and server:
```bash
npm run dev:client
npm run dev:server
```

3. For production build:
```bash
npm run build
npm start
```

The game will be available at `http://localhost:5173` (development) or `http://localhost:3000` (production).

## Game Modes 🎮

- **FFA (Free-For-All)**: Every blob for themselves
- **Teams**: Collaborate with teammates to dominate
- **Battle Royale**: Coming soon!

## Controls 🎯

- **Mouse/Touch**: Move blob
- **Space**: Split blob
- **W**: Boost
- **X/Q**: Eject mass
- **1-9**: Activate power-ups

## Power-Ups ⚡

- Speed Boost
- Shield
- Mass Boost
- Ghost Mode
- Split Master
- And more!

## Development Status 📊

### Completed ✅
- Core game mechanics and physics
- Real-time multiplayer infrastructure
- Power-up and combo system
- Performance optimizations
- Visual effects system
- Basic AI implementation
- Obstacle system

### In Progress 🚧
- Mobile optimization
- Team mode testing
- Battle royale mode
- Game mode selection UI

### Planned Features 📝
- Authentication system
- Database integration
- Advanced AI behaviors
- Tutorial system
- Tournament mode
- Achievement system
- Historical stats

## Performance Considerations 🔧

The game includes several performance optimizations:
- Spatial hashing for collision detection
- Object pooling for particles and entities
- Batch rendering for similar objects
- Dynamic quality settings based on device capabilities
- Memory pressure handling
- Automatic quality scaling

## Known Issues 🐛

- Mobile controls need further optimization
- High player count scenarios need testing
- Network performance under heavy load needs optimization


## Acknowledgments 🙏

- PIXI.js team for the awesome rendering engine
- Socket.IO team for real-time communication
- React and TypeScript communities