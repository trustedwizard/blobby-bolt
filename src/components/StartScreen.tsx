import { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useGameStore } from '../store/gameStore';
import { CircleDot, Loader2 } from 'lucide-react';
import { RoomList } from './RoomList';
import { TeamSelector } from './TeamSelector';
import { socketService } from '../services/socket';

const COLORS = [
  { name: 'Pink', value: 0xff1a8c },
  { name: 'Cyan', value: 0x00ccff },
  { name: 'Green', value: 0x00ff88 },
  { name: 'Orange', value: 0xff8800 },
  { name: 'Purple', value: 0x9900ff },
  { name: 'Yellow', value: 0xffff00 },
  { name: 'Electric Blue', value: 0x0066ff },
  { name: 'Neon Red', value: 0xff0044 },
  { name: 'Lime', value: 0xccff00 },
  { name: 'Hot Pink', value: 0xff00cc },
  { name: 'Aqua', value: 0x00ffcc },
  { name: 'Magenta', value: 0xff00ff },
  { name: 'Gold', value: 0xffcc00 },
  { name: 'Plasma Blue', value: 0x33ccff },
  { name: 'Toxic Green', value: 0x33ff00 },
  { name: 'Deep Purple', value: 0x6600ff }
];

const SUGGESTED_EMOJIS = [
  '😊', '😎', '🤪', '😈', '👻', '🐻', 
  '🦁', '🐯', '🐸', '🦊', '🐱', '🐼',
  '👽', '🤡', '💀', '👾', '🤓', '😍',
  '🥳', '🤩', '😜', '😇', '🤑', '🥵'
];

export function StartScreen() {
  const [showRooms, setShowRooms] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [emoji, setEmoji] = useState('😊');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { 
    initializePlayer, 
    startGame, 
    joinRoom, 
    addNotification 
  } = useGameStore();
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState('');

  useEffect(() => {
    socketService.setupMatchmakingListeners({
      onMatchFound: (gameId) => {
        setIsMatchmaking(false);
        joinRoom(gameId);
      },
      onMatchmakingStatus: (status) => {
        setMatchmakingStatus(status);
      },
      onMatchmakingError: (error) => {
        setIsMatchmaking(false);
        addNotification(error);
      }
    });
  }, [joinRoom, addNotification]);

  const handleStart = () => {
    if (!playerName.trim()) return;
  
    initializePlayer({
      id: socketService.getSocket()?.id || `player-${Date.now()}`,
      x: 2000,
      y: 2000,
      radius: 30,
      color: selectedColor,
      name: playerName.trim(),
      emoji: emoji,
      trail: [],
      score: 0
    });
    startGame();
  };

  const startMatchmaking = () => {
    if (!playerName.trim()) return;
    
    setIsMatchmaking(true);
    socketService.findMatch({
      gameMode: 'ffa', // or get from state if you have game mode selection
      skillLevel: 1000 // default skill level for new players
    });
  };

  const cancelMatchmaking = () => {
    setIsMatchmaking(false);
    socketService.cancelMatchmaking();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      {showRooms ? (
        <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-lg w-[800px]">
          <h1 className="text-3xl font-bold text-center text-white mb-8">
            Blob<span className="text-cyan-400">.by</span>
          </h1>
          <RoomList onJoinRoom={(() => setShowRooms(false)) as any} />
        </div>
      ) : (
        <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-lg w-96 space-y-6">
          <h1 className="text-3xl font-bold text-center text-white mb-8">
            Blob<span className="text-cyan-400">.by</span>
          </h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Player Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 rounded-md text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                placeholder="Enter your name"
                maxLength={15}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Blob Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className="relative w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    style={{ backgroundColor: `#${color.value.toString(16).padStart(6, '0')}` }}
                  >
                    {selectedColor === color.value && (
                      <CircleDot className="absolute inset-0 m-auto w-4 h-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Blob Face
              </label>
              <div className="grid grid-cols-6 gap-2 mb-2">
                {SUGGESTED_EMOJIS.map((suggestedEmoji) => (
                  <button
                    key={suggestedEmoji}
                    onClick={() => setEmoji(suggestedEmoji)}
                    className={`w-10 h-10 text-2xl flex items-center justify-center rounded hover:bg-gray-700 ${
                      suggestedEmoji === emoji ? 'bg-gray-700' : 'bg-gray-800'
                    }`}
                  >
                    {suggestedEmoji}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full px-3 py-2 bg-gray-800 rounded-md text-sm text-center hover:bg-gray-700"
              >
                More Emojis
              </button>
              {showEmojiPicker && (
                <div className="absolute mt-2 z-50">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setEmoji(emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    width={320}
                    height={400}
                  />
                </div>
              )}
            </div>
          </div>

          <TeamSelector />

          <div className="space-y-4">
            {isMatchmaking ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-cyan-400 mb-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Finding match...</span>
                </div>
                <p className="text-sm text-gray-400">{matchmakingStatus}</p>
                <button
                  onClick={cancelMatchmaking}
                  className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={startMatchmaking}
                  disabled={!playerName.trim()}
                  className="py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Quick Match
                </button>
                <button
                  onClick={() => setShowRooms(true)}
                  className="py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-md transition-colors"
                >
                  Browse Rooms
                </button>
                <button
                  onClick={handleStart}
                  disabled={!playerName.trim()}
                  className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Practice Mode
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}