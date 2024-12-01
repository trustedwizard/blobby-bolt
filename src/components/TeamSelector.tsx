import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Team, Room } from '../types/game';
import { Users } from 'lucide-react';

export function TeamSelector() {
  const { rooms, player, socket } = useGameStore();
  
  // Get the current room from the rooms Map
  const currentRoom = Array.from(rooms.values()).find(room => 
    room.players.has(player?.id || '')
  );

  const joinTeam = (teamId: string) => {
    if (socket) {
      socket.emit('join-team', { teamId });
    }
  };

  if (!currentRoom || currentRoom.gameMode !== 'teams') return null;

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg"
      role="region"
      aria-label="Team Selection"
    >
      <h2 className="text-white text-sm font-medium mb-2 text-center">Choose Your Team</h2>
      <div className="flex gap-4">
        {Array.from(currentRoom.teams.values()).map((team: Team) => {
          const bgColor = `#${team.color.toString(16)}20`;
          const isSelected = player?.teamId === team.id;
          const playerCount = team.players.size;
          
          return (
            <button
              key={team.id}
              onClick={() => joinTeam(team.id)}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all
                ${isSelected ? 'ring-2 ring-cyan-400' : ''}
                hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-400`}
              style={{ backgroundColor: bgColor }}
              aria-pressed={isSelected}
              aria-label={`Join ${team.name} team with ${playerCount} players`}
            >
              <span className="text-white font-bold">{team.name}</span>
              <div className="flex items-center gap-1 text-gray-300">
                <Users className="w-4 h-4" />
                <span>{playerCount}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}