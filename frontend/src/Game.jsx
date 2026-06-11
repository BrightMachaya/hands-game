import React, { useState, useEffect, useRef } from 'react';

const COMMANDS = ['no hand', 'raise hands', 'left hand', 'right hand'];

const AUDIO_MAPPING = {
  'no hand': '/audios/none.m4a',
  'raise hands': '/audios/both.m4a',
  'left hand': '/audios/left.m4a',
  'right hand': '/audios/right.m4a'
};

const getCommandDisplay = (cmd, currentScore, mode) => {
  if (mode === 'audio') {
    return '👂 Listen Closely!';
  }

  if (currentScore >= 20) {
    const cleanNames = {
      'no hand': 'No Hands!',
      'raise hands': 'Both Hands',
      'left hand': 'Left Hand',
      'right hand': 'Right Hand'
    };
    return cleanNames[cmd] || cmd;
  } else {
    const emojiNames = {
      'no hand': 'No Hands! 👐',
      'raise hands': 'Both Hands 🙌',
      'left hand': 'Left Hand 👈',
      'right hand': 'Right Hand 👉'
    };
    return emojiNames[cmd] || cmd;
  }
};

const Game = () => {
  const [command, setCommand] = useState('');
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('idle'); 
  const [difficultyTime, setDifficultyTime] = useState(3); 
  const [commandMode, setCommandMode] = useState('both'); 
  const [timer, setTimer] = useState(3);
  const [errorMessage, setErrorMessage] = useState('');
  const [liveStreamImg, setLiveStreamImg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamIntervalRef = useRef(null);
  const streamTracksRef = useRef(null);
  const activeAudioRef = useRef(null); 
  
  const stateRef = useRef({ gameState: 'idle', command: '', timer: 3, difficultyTime: 3, score: 0, commandMode: 'both' });

  useEffect(() => {
    stateRef.current = { gameState, command, timer, difficultyTime, score, commandMode };
  }, [gameState, command, timer, difficultyTime, score, commandMode]);

  // 1-Second Global Countdown Clock Loop
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const current = stateRef.current;

      if (current.gameState === 'playing') {
        if (current.timer > 1) {
          setTimer(prev => prev - 1);
        } else {
          // Synchronously lock state to prevent frame race conditions
          stateRef.current.gameState = 'game_over';
          setGameState('game_over');
          setErrorMessage(`Too slow! You failed to execute the command.`);
          cleanUpResources(); 
          
          // System Alert: Unconditional Playback
          const failAudio = new Audio('/audios/fail.mp3');
          activeAudioRef.current = failAudio;
          failAudio.play().catch(err => console.warn("Failure audio playback blocked:", err));
        }
      } else if (current.gameState === 'success_break') {
        if (current.timer > 1) {
          setTimer(prev => prev - 1);
        } else {
          generateNextCommand();
        }
      }
    }, 1000);

    return () => clearInterval(clockInterval);
  }, []);

  const playCommandAudio = (targetCommand) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
    }

    const currentMode = stateRef.current.commandMode;
    // Standard commands obey the chosen gameplay mode
    if (currentMode === 'both' || currentMode === 'audio') {
      const audioUrl = AUDIO_MAPPING[targetCommand];
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.play().catch(err => console.warn("Browser interaction blocked audio initialization:", err));
      }
    }
  };

  const startGame = async () => {
    try {
      setErrorMessage('');
      setScore(0);
      setLiveStreamImg('');
      setGameState('initializing');

      wsRef.current = new WebSocket('ws://127.0.0.1:8765');

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'prediction') {
          setLiveStreamImg(data.image);

          const current = stateRef.current;

          if (current.gameState === 'initializing') {
            const firstCmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
            
            stateRef.current.command = firstCmd;
            stateRef.current.gameState = 'playing';
            setCommand(firstCmd);
            setTimer(current.difficultyTime);
            setGameState('playing');
            
            playCommandAudio(firstCmd);
            return;
          }

          if (current.gameState === 'playing' && data.gesture === current.command) {
            triggerSuccessPhase();
          }
        }
      };

      wsRef.current.onerror = () => {
        stateRef.current.gameState = 'idle';
        setGameState('idle');
        setScore(0);
        setErrorMessage('Could not locate tracking backend server. Is server.py running?');
        cleanUpResources();
      };

      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      streamTracksRef.current = stream.getTracks();
      if (videoRef.current) videoRef.current.srcObject = stream;

      startFrameStreaming();

    } catch (err) {
      stateRef.current.gameState = 'idle';
      setGameState('idle');
      setScore(0);
      setErrorMessage("Webcam permissions access mapping rejected.");
      cleanUpResources();
    }
  };

  const generateNextCommand = () => {
    const nextCmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
    
    stateRef.current.command = nextCmd;
    stateRef.current.gameState = 'playing';
    setCommand(nextCmd);
    setTimer(stateRef.current.difficultyTime);
    setGameState('playing');
    
    playCommandAudio(nextCmd);
  };

  const triggerSuccessPhase = () => {
    const nextScore = stateRef.current.score + 2;
    stateRef.current.score = nextScore;
    setScore(nextScore);

    // CRITICAL WIN RESOLUTION: Fixed race conditions
    if (nextScore >= 100) {
      stateRef.current.gameState = 'winner';
      setGameState('winner');
      cleanUpResources(); // Safely closes sockets and stops regular commands first
      
      // System Alert: Plays unconditionally across all settings
      const winAudio = new Audio('/audios/winner.mp3');
      activeAudioRef.current = winAudio;
      winAudio.play().catch(err => console.warn("Winner audio playback blocked:", err));
      return;
    }

    stateRef.current.gameState = 'success_break';
    setGameState('success_break');

    let activeDifficulty = stateRef.current.difficultyTime;
    if (nextScore >= 60 && activeDifficulty > 2) {
      stateRef.current.difficultyTime = 2;
      setDifficultyTime(2);
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    setTimer(2); 
  };

  const stopGame = () => {
    cleanUpResources();
    stateRef.current.gameState = 'idle';
    setGameState('idle');
    setScore(0);
    setErrorMessage(''); 
  };

  const startFrameStreaming = () => {
    streamIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        wsRef.current.send(JSON.stringify({
          type: 'frame',
          image: canvas.toDataURL('image/jpeg', 0.5)
        }));
      }
    }, 110);
  };

  const cleanUpResources = () => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    if (streamTracksRef.current) streamTracksRef.current.forEach(track => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    if (wsRef.current) wsRef.current.close();
    
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif', padding: '40px 20px', backgroundColor: '#f1f3f5', minHeight: '100vh', boxSizing: 'border-box', position: 'relative' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <h1 style={{ color: '#212529', margin: '0 0 5px 0', fontSize: '38px', fontWeight: '800', letterSpacing: '-0.5px' }}>Hands Command game</h1>
        <p style={{ color: '#6c757d', margin: '0', fontSize: '15px', fontWeight: '500' }}>Real-Time Computer Vision Tracking Ecosystem</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '580px', gap: '20px', flex: 1, marginBottom: '60px' }}>
        
        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', boxSizing: 'border-box', gap: '10px' }}>
          
          <div>
            <select 
              value={difficultyTime} 
              onChange={(e) => setDifficultyTime(Number(e.target.value))}
              disabled={gameState === 'playing' || gameState === 'success_break' || gameState === 'initializing'}
              style={{ padding: '8px 10px', fontSize: '13px', fontWeight: '600', borderRadius: '6px', border: '1px solid #dee2e6', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
            >
              <option value={3}>🟢 Easy (3s)</option>
              <option value={2}>🟡 Intermediate (2s)</option>
              <option value={1}>🔴 Hard (1s)</option>
            </select>
          </div>

          <div>
            <select 
              value={commandMode} 
              onChange={(e) => setCommandMode(e.target.value)}
              disabled={gameState === 'playing' || gameState === 'success_break' || gameState === 'initializing'}
              style={{ padding: '8px 10px', fontSize: '13px', fontWeight: '600', borderRadius: '6px', border: '1px solid #dee2e6', backgroundColor: '#fff', cursor: 'pointer', outline: 'none' }}
            >
              <option value="text">📝 Text Only</option>
              <option value="both">📢 Text & Audio</option>
              <option value="audio">🔊 Audio Only</option>
            </select>
          </div>

          <div style={{ fontSize: '14px', fontWeight: '800', color: '#495057', backgroundColor: '#e9ecef', padding: '6px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
            SCORE: <span style={{ color: '#007bff', fontFamily: 'monospace', fontSize: '16px' }}>{String(score).padStart(2, '0')}</span>
          </div>

          <div>
            {gameState === 'idle' || gameState === 'game_over' || gameState === 'winner' ? (
              <button onClick={startGame} style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 'bold', background: '#2b9348', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ▶ Start
              </button>
            ) : (
              <button onClick={stopGame} style={{ padding: '9px 16px', fontSize: '13px', fontWeight: 'bold', background: '#e63946', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ⏹ Stop
              </button>
            )}
          </div>
        </div>

        {gameState === 'initializing' && (
          <div style={{ width: '100%', boxSizing: 'border-box', padding: '22px', background: '#e8f4fd', border: '2px solid #bbeeef', borderRadius: '12px', fontSize: '20px', textAlign: 'center' }}>
            <span style={{ color: '#004085', fontWeight: '800' }}>🔄 Verifying Environment...</span>
            <div style={{ fontSize: '14px', marginTop: '8px', color: '#004085', fontWeight: '500' }}>Starting the second your feed verifies live connection. Stand by!</div>
          </div>
        )}

        {gameState === 'playing' && (
          <div style={{ width: '100%', boxSizing: 'border-box', padding: '22px', background: '#fff3cd', border: '2px solid #ffc107', borderRadius: '12px', fontSize: '24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            COMMAND: <span style={{ color: commandMode === 'audio' ? '#007bff' : '#d90429', fontWeight: '800' }}>
              {getCommandDisplay(command, score, commandMode)}
            </span>
            <div style={{ fontSize: '16px', marginTop: '10px', color: '#6c757d', fontWeight: '500' }}>Time Remaining: <span style={{ color: timer === 1 ? '#d90429' : '#212529', fontWeight: '700' }}>{timer}s</span></div>
          </div>
        )}

        {gameState === 'success_break' && (
          <div style={{ width: '100%', boxSizing: 'border-box', padding: '22px', background: '#d4edda', border: '2px solid #2b9348', borderRadius: '12px', fontSize: '24px', textAlign: 'center' }}>
            <span style={{ color: '#155724', fontWeight: '800' }}>Success! +2 Points 🎉</span>
            <div style={{ fontSize: '15px', marginTop: '10px', color: '#155724', fontWeight: '500' }}>Next command in: <b>{timer}s</b></div>
          </div>
        )}

        {errorMessage && gameState !== 'game_over' && (
          <div style={{ color: '#d90429', background: '#f8d7da', padding: '12px 15px', borderRadius: '8px', fontWeight: 'bold', width: '100%', boxSizing: 'border-box', border: '1px solid #f5c6cb', fontSize: '14px', textAlign: 'center' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <div style={{ position: 'relative', width: '400px', height: '300px', background: '#212529', borderRadius: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 35px rgba(0,0,0,0.12)', border: '6px solid #fff' }}>
          {gameState === 'idle' ? (
            <div style={{ color: '#adb5bd', fontSize: '15px', fontWeight: '600' }}>Camera Engine Offline</div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
              <canvas ref={canvasRef} width="400" height="300" style={{ display: 'none' }} />
              
              {liveStreamImg ? (
                <img src={liveStreamImg} alt="Vision Processing Pipeline" style={{ width: '400px', height: '300px', transform: 'scaleX(-1)' }} />
              ) : (
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>Booting Mesh Framework...</div>
              )}
            </>
          )}
        </div>

      </div>

      {gameState === 'game_over' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(33, 37, 41, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#ffffff', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '400px', textAlign: 'center', borderTop: '10px solid #d90429' }}>
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>💥</div>
            <h2 style={{ color: '#d90429', margin: '0 0 15px 0', fontSize: '30px', fontWeight: '900' }}>GAME OVER</h2>
            <p style={{ color: '#495057', fontSize: '15px', margin: '0 0 25px 0', background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>{errorMessage}</p>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057', marginBottom: '30px' }}>
              Final Arcade Score: <span style={{ color: '#007bff', fontSize: '26px', fontFamily: 'monospace' }}>{String(score).padStart(2, '0')}</span>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={startGame} style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 'bold', background: '#2b9348', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔄 Replay</button>
              <button onClick={stopGame} style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 'bold', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>⏹ Stop</button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'winner' && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(33, 37, 41, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#ffffff', padding: '40px', borderRadius: '20px', width: '90%', maxWidth: '400px', textAlign: 'center', borderTop: '10px solid #2b9348' }}>
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>🏆</div>
            <h2 style={{ color: '#2b9348', margin: '0 0 15px 0', fontSize: '30px', fontWeight: '900' }}>YOU WIN!</h2>
            <p style={{ color: '#155724', fontSize: '15px', margin: '0 0 25px 0', background: '#d4edda', padding: '15px', borderRadius: '10px', fontWeight: '600' }}>Flawless performance! You scored a perfect 100!</p>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#495057', marginBottom: '30px' }}>
              Final Score: <span style={{ color: '#2b9348', fontSize: '28px', fontFamily: 'monospace' }}>100</span>
            </div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={startGame} style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 'bold', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🔄 Replay</button>
              <button onClick={stopGame} style={{ flex: 1, padding: '14px', fontSize: '15px', fontWeight: 'bold', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>⏹ Stop</button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ position: 'absolute', bottom: '0', width: '100%', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderTop: '1px solid #dee2e6', color: '#8d99ae', fontSize: '14px', fontWeight: '500' }}>
        Hands Command game &copy; {new Date().getFullYear()} | Developed by Bright Machaya
      </footer>

    </div>
  );
};

export default Game;