import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Room, GameMode } from '../types/game';
import { Lock, Users, Swords } from 'lucide-react';
import { CONFIG } from '../constants/gameConfig';

interface RoomListProps {
  onJoinRoom: () => void;
}

interface NewRoomData {
  name: string;
  isPrivate: boolean;
  password: string;
  gameMode: GameMode;
  maxPlayers: number;
}

const DEFAULT_ROOM_CONFIG: NewRoomData = {
  name: '',
  isPrivate: false,
  password: '',
  gameMode: 'ffa',
  maxPlayers: CONFIG.game.maxPlayers
};

export function RoomList({ onJoinRoom }: RoomListProps) {
  const { rooms, joinRoom, createRoom } = useGameStore(state => ({
    rooms: state.rooms,
    joinRoom: state.joinRoom,
    createRoom: state.createRoom
  }));
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState<NewRoomData>(DEFAULT_ROOM_CONFIG);

  const handleCreateRoom = () => {
    if (!newRoom.name) return;

    const roomConfig: Partial<Room> = {
      ...newRoom,
      id: `room-${Date.now()}`,
      players: new Map(),
      teams: new Map(),
      state: 'waiting',
      createdAt: Date.now(),
      config: {
        ...CONFIG.game,
        maxPlayers: newRoom.maxPlayers,
        minPlayers: CONFIG.game.minPlayers
      }
    };

    createRoom(roomConfig);
    setShowCreateRoom(false);
    setNewRoom(DEFAULT_ROOM_CONFIG);
  };

  const getGameModeLabel = (mode: GameMode): string => {
    return CONFIG.gameModes[mode]?.name || mode.toUpperCase();
  };

  const roomArray = Array.from(rooms.values());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Available Rooms</h2>
        <button
          onClick={() => setShowCreateRoom(true)}
          className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors"
        >
          Create Room
        </button>
      </div>

      <div className="grid gap-4">
        {roomArray.map((room: Room) => (
          <div
            key={room.id}
            className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg flex justify-between items-center hover:bg-gray-800/90 transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{room.name}</span>
                {room.isPrivate && <Lock className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {room.players.size}/{room.maxPlayers}
                </span>
                <span className="flex items-center gap-1">
                  <Swords className="w-4 h-4" />
                  {getGameModeLabel(room.gameMode)}
                </span>
                {room.state !== 'waiting' && (
                  <span className="text-yellow-400">
                    {room.state.charAt(0).toUpperCase() + room.state.slice(1)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                joinRoom(room.id);
                onJoinRoom();
              }}
              disabled={room.state !== 'waiting' || room.players.size >= room.maxPlayers}
              className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors
                disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
        ))}
      </div>

      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/90 p-6 rounded-lg w-96 space-y-4">
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
              onChange={(e) => setNewRoom({ ...newRoom, gameMode: e.target.value as GameMode })}
              className="w-full px-3 py-2 bg-gray-800 rounded-md text-white"
            >
              {Object.entries(CONFIG.gameModes).map(([mode, config]) => (
                <option key={mode} value={mode}>
                  {config.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Max Players"
              value={newRoom.maxPlayers}
              min={CONFIG.game.minPlayers}
              max={CONFIG.game.maxPlayers}
              onChange={(e) => setNewRoom({ 
                ...newRoom, 
                maxPlayers: Math.min(
                  Math.max(parseInt(e.target.value) || CONFIG.game.minPlayers, CONFIG.game.minPlayers),
                  CONFIG.game.maxPlayers
                )
              })}
              className="w-full px-3 py-2 bg-gray-800 rounded-md text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoom(DEFAULT_ROOM_CONFIG);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoom.name}
                className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 transition-colors
                  disabled:bg-gray-600 disabled:cursor-not-allowed"
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