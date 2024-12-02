import React, { useState, useEffect, useCallback, memo } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { useGameStore } from '../store/gameStore';
import { CircleDot, Loader2 } from 'lucide-react';
import { RoomList } from './RoomList';
import { TeamSelector } from './TeamSelector';
import { socketService } from '../services/socket';
import { ErrorBoundary } from './ErrorBoundary';

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
] as const;

const SUGGESTED_EMOJIS = [
  '😊', '😎', '🤪', '😈', '👻', '🐻', 
  '🦁', '🐯', '🐸', '🦊', '🐱', '🐼',
  '👽', '🤡', '💀', '👾', '🤓', '😍',
  '🥳', '🤩', '😜', '😇', '🤑', '🥵'
] as const;

interface FormState {
  playerName: string;
  selectedColor: number;
  emoji: string;
}

const StartScreen = memo(() => {
  const [showRooms, setShowRooms] = useState(true);
  const [formState, setFormState] = useState<FormState>({
    playerName: '',
    selectedColor: COLORS[0].value,
    emoji: SUGGESTED_EMOJIS[0]
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingStatus, setMatchmakingStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { joinRoom, addNotification } = useGameStore();

  useEffect(() => {
    const cleanup = socketService.setupMatchmakingListeners({
      onMatchFound: (gameId) => {
        setIsMatchmaking(false);
        joinRoom(gameId);
      },
      onMatchmakingStatus: (status) => {
        setMatchmakingStatus(status);
      },
      onMatchmakingError: (error) => {
        setIsMatchmaking(false);
        setError(error);
        addNotification(error);
      }
    });

    return cleanup;
  }, [joinRoom, addNotification]);

  useEffect(() => {
    const handleRoomCreated = (room: any) => {
      setIsLoading(false);
      console.log('Room created:', room);
    };

    const handleRoomError = (error: string) => {
      setIsLoading(false);
      setError(error);
      addNotification(error);
    };

    socketService.on('room:created', handleRoomCreated);
    socketService.on('room:join:error', handleRoomError);

    return () => {
      socketService.off('room:created', handleRoomCreated);
      socketService.off('room:join:error', handleRoomError);
    };
  }, [addNotification]);

  const handleInputChange = useCallback((field: keyof FormState, value: string | number) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formState.playerName.trim()) {
      setError('Please enter a player name');
      return false;
    }
    return true;
  }, [formState.playerName]);

  const startMatchmaking = useCallback(() => {
    if (!validateForm()) return;
    
    setIsMatchmaking(true);
    setError(null);
    socketService.findMatch({
      gameMode: 'ffa',
      skillLevel: 1000
    });
  }, [validateForm]);

  const cancelMatchmaking = useCallback(() => {
    setIsMatchmaking(false);
    socketService.cancelMatchmaking();
  }, []);

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        {showRooms ? (
          <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-lg w-[800px]">
            <h1 className="text-3xl font-bold text-center text-white mb-8">
              Blob<span className="text-cyan-400">.by</span>
            </h1>
            <RoomList onJoinRoom={() => setShowRooms(false)} />
          </div>
        ) : (
          <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-lg w-96 space-y-6">
            <h1 className="text-3xl font-bold text-center text-white mb-8">
              Blob<span className="text-cyan-400">.by</span>
            </h1>

            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  value={formState.playerName}
                  onChange={(e) => handleInputChange('playerName', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 rounded-md text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                  placeholder="Enter your name"
                  maxLength={15}
                  aria-label="Player name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Blob Color
                </label>
                <div className="flex gap-2 flex-wrap" role="radiogroup">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleInputChange('selectedColor', color.value)}
                      className="relative w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      style={{ backgroundColor: `#${color.value.toString(16).padStart(6, '0')}` }}
                      aria-label={`Select ${color.name} color`}
                      aria-pressed={formState.selectedColor === color.value}
                    >
                      {formState.selectedColor === color.value && (
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
                      onClick={() => handleInputChange('emoji', suggestedEmoji)}
                      className={`w-10 h-10 text-2xl flex items-center justify-center rounded hover:bg-gray-700 ${
                        suggestedEmoji === formState.emoji ? 'bg-gray-700' : 'bg-gray-800'
                      }`}
                      aria-label={`Select emoji ${suggestedEmoji}`}
                      aria-pressed={suggestedEmoji === formState.emoji}
                    >
                      {suggestedEmoji}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-full px-3 py-2 bg-gray-800 rounded-md text-sm text-center hover:bg-gray-700"
                  aria-expanded={showEmojiPicker}
                >
                  More Emojis
                </button>
                {showEmojiPicker && (
                  <div className="absolute mt-2 z-50">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        handleInputChange('emoji', emojiData.emoji);
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
                    disabled={isLoading || !formState.playerName.trim()}
                    className="py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Quick Match'
                    )}
                  </button>
                  <button
                    onClick={() => setShowRooms(true)}
                    disabled={isLoading}
                    className="py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-md transition-colors disabled:opacity-50"
                  >
                    Browse Rooms
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

StartScreen.displayName = 'StartScreen';

export default StartScreen;