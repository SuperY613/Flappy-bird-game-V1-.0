// FlappyController.cs - skeleton for Unity (C#)
// Attach to Bird GameObject (with Rigidbody2D)
using UnityEngine;
public class FlappyController : MonoBehaviour {
    public float flapStrength = 6f;
    public bool isAlive = true;
    private Rigidbody2D rb;
    void Awake(){ rb = GetComponent<Rigidbody2D>(); }
    void Start(){ }
    void Update(){
        if (!isAlive) return;
        // Keyboard or touch
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0)) {
            Flap();
        }
    }
    public void Flap() {
        rb.velocity = new Vector2(rb.velocity.x, flapStrength);
        // Add particle and sound triggers here
    }
    void OnCollisionEnter2D(Collision2D other) {
        isAlive = false;
        // notify GameController
    }
}
