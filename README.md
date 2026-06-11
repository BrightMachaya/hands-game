# ✋ Hands Command Game

An interactive, real-time computer vision arcade game built using a **Python asynchronous WebSocket server** powered by **Google MediaPipe** and a responsive **React (Vite) frontend**. Players must quickly execute hand gestures matching the displayed or spoken commands before the timer runs out to rack up a perfect score of 100!

---

## 🚀 Features

- **Real-Time Machine Learning Pipeline:** Processes video frames every 110ms with sub-second latency using MediaPipe's 21-point tracking mesh.
- **Dynamic Gameplay Modes:** Choose between **Text Only**, **Audio Only** (listen closely!), or **Text & Audio** combinations.
- **Adaptive Difficulty:** Scale the game clock between Easy (3s), Intermediate (2s), or Hard (1s). The engine automatically shifts gears as your score climbs!
- **Immersive Arcade Audio:** Features custom verbal cues for commands, a dedicated failure theme (`fail.mp3`), and an absolute victory anthem (`winner.mp3`) that plays unconditionally across all game configurations.
- **Fail-Safe UI Sync:** Synchronous state locking prevents asynchronous network race conditions from cutting off victory/defeat sequences or leaving zombie warning banners on the screen.

## 🎮 Gameplay Instructions & Game Conditions

This section outlines how to interact with the game, how scoring works, and the underlying conditions that govern winning, losing, and adaptive difficulty.

### 1. Step-by-Step Instructions

1. **Launch Environment:** Make sure both the Python backend server and React frontend are running (see Installation steps). Open the game page in your browser.
2. **Configure Your Settings:** Before clicking start, use the drop-down selectors in the control hotbar to choose your preferred options:
   - **Difficulty:** Easy (3 seconds per command), Intermediate (2 seconds), or Hard (1 second).
   - **Command Mode:** Text Only, Text & Audio, or Audio Only (Blind mode).
3. **Initialize the Stream:** Click the **▶ Start** button. Grant webcam permissions if prompted. The game will show a `🔄 Verifying Environment...` status block until your live camera stream connects to the tracking backend.
4. **Execute Commands:** As soon as the first command triggers, match the gesture with your hands inside the camera viewport. 
5. **The Success Transition:** Once a gesture is successfully verified, the game enters a brief 2-second `success_break` phase to let you rest your hands before the next instruction is randomly generated.
6. **Stopping Mid-Game:** Clicking the **⏹ Stop** button at any point will instantly clear out all video streams, safely close the WebSocket connection, reset your score to 0, and cleanly wipe out any error banners from the screen.

---

### 2. Core Game Conditions & Rules

The game engine evaluates a series of strict structural rules based on user performance:

#### 📈 Scoring & Win Condition
* **Points per Success:** Every time your hand gesture matches the command, you receive **+2 points**.
* **The Ultimate Victory:** The maximum possible score is **100**. The exact millisecond your score updates to 100, the game halts regular execution, isolates your network sockets, launches the Victory popup modal, and plays the `winner.mp3` anthem.

#### 📉 Loss Condition
* **The Countdown Timer:** A ticking clock loop counts down by 1 second intervals. 
* **Too Slow!:** If the timer reaches **0** before you execute the command, you immediately fail. The game locks down frame streaming, opens the Game Over popup overlay, displays the warning message `⚠️ Too slow! You failed to execute the command.`, and triggers the `fail.mp3` audio tracking sound.

#### 🎚️ Dynamic Difficulty Scaling
The game naturally gets harder as you perform better. The engine tracks your points and applies these rules on the fly:

| Player Score | Condition/Change Applied | Game Consequence |
| :--- | :--- | :--- |
| **Score < 20** | Visual Emojis Active | Commands show helpful clues (e.g., `Left Hand 👈`, `Both Hands 🙌`). |
| **Score ≥ 20** | Visual Emojis Deactivated | The interface strips away emojis for text-only clarity, forcing you to read faster. |
| **Score ≥ 60** | Automatic Timer Clamp | If you started on **Easy (3s)**, the engine clamps your maximum response limit down to **2 seconds** for all subsequent commands. |

#### 🔊 Audio Playback Conditions
* **Command Audio:** Voice lines prompting you to move your hands (e.g., `left.m4a`, `both.m4a`) respect your settings. They will **only** play if your Command Mode is set to **Text & Audio** or **Audio Only**.
* **System Critical Alerts:** The `winner.mp3` and `fail.mp3` tracks behave as system alerts. They **completely bypass your configurations** and will play unconditionally across all settings—even if you are playing on **Text Only** mode.
---