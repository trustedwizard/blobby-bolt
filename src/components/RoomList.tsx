import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Room } from '../types/game';
import { Lock, Users, Trophy, Swords } from 'lucide-react';

interface RoomListProps {
  onJoinRoom: () => void;
}

export function RoomList({ onJoinRoom }: RoomListProps) {
  const { rooms, joinRoom, createRoom } = useGameStore();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    isPrivate: false,
    password: '',
    gameMode: 'ffa' as const,
    maxPlayers: 10
  });

  const handleCreateRoom = () => {
    if (!newRoom.name) return;
    createRoom({
      ...newRoom,
      id: `room-${Date.now()}`,
      players: [],
      teams: []
    });
    setShowCreateRoom(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Available Rooms</h2>
        <button
          onClick={() => setShowCreateRoom(true)}
          className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600"
        >
          Create Room
        </button>
      </div>

      <div className="grid gap-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-gray-800 p-4 rounded-lg flex justify-between items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{room.name}</span>
                {room.isPrivate && <Lock className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {room.players.length}/{room.maxPlayers}
                </span>
                <span className="flex items-center gap-1">
                  <Swords className="w-4 h-4" />
                  {room.gameMode.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                joinRoom(room.id);
                onJoinRoom();
              }}
              className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600"
            >
              Join
            </button>
          </div>
        ))}
      </div>

      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-96 space-y-4">
            <h3 className="text-xl font-bold text-white">Create Room</h3>
            <input
              type="text"
              placeholder="Room Name"
              value={newRoom.name}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 rounded-md text-white"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={newRoom.isPrivate}
                onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
              />
              <label htmlFor="private" className="text-white">Private Room</label>
            </div>
            {newRoom.isPrivate && (
              <input
                type="password"
                placeholder="Room Password"
                value={newRoom.password}
                onChange={(e) => setNewRoom({ ...newRoom, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 rounded-md text-white"
              />
            )}
            <select
              value={newRoom.gameMode}
              onChange={(e) => setNewRoom({ ...newRoom, gameMode: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-800 rounded-md text-white"
            >
              <option value="ffa">Free For All</option>
              <option value="teams">Teams</option>
              <option value="battle-royale">Battle Royale</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateRoom(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}