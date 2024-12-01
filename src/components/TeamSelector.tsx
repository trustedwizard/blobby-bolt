import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Team } from '../types/game';
import { Users } from 'lucide-react';

export function TeamSelector() {
  const { currentRoom, joinTeam, player } = useGameStore();

  if (!currentRoom || currentRoom.gameMode !== 'teams') return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg">
      <div className="flex gap-4">
        {currentRoom.teams.map((team: Team) => (
          <button
            key={team.id}
            onClick={() => joinTeam(team.id)}
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all
              ${player?.teamId === team.id ? 'ring-2 ring-cyan-400' : ''}
              hover:bg-gray-800`}
            style={{ backgroundColor: `#${team.color.toString(16)}20` }}
          >
            <span className="text-white font-bold">{team.name}</span>
            <div className="flex items-center gap-1 text-gray-400">
              <Users className="w-4 h-4" />
              <span>{team.players.length}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}