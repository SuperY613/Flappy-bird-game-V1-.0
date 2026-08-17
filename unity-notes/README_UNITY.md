Unity port notes (high level)
- Create a new 2D Unity project.
- Add a Canvas for UI (score, level, controls).
- Create Bird prefab:
  - Circle sprite (or simple texture), Rigidbody2D (gravity scale tuned), CircleCollider2D.
  - BirdController.cs script (see skeleton).
- Create Pipe prefab:
  - Sprites (top/bottom) with BoxCollider2D, move them left with transform.Translate or rigidbody.
- GameController:
  - Spawn pipes periodically, track score, level progression up to 999.
  - Implement local multiplayer by instantiating multiple Bird prefabs and mapping inputs.
- Audio:
  - Use AudioSource components and lightweight audio clips (or generate via DSP).
- Build:
  - Adjust input mapping for mobile touches and add on-screen buttons.

See skeleton C# below for BirdController.
