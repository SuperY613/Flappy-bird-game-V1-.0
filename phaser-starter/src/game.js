// Minimal Phaser 3 scene scaffold to port the Flappy 999 logic into Phaser.
// This is a starting point: implement gravity/jump, pipe group, collisions, scoring here.
export default class GameScene extends Phaser.Scene {
  constructor(){ super({ key: 'GameScene' }); }
  preload(){}
  create(){
    this.score = 0;
    this.add.text(10,10, 'Phaser Flappy 999 starter', { font: '16px sans-serif', fill: '#000' });
    // Add birds, pipes and controls here.
  }
  update(){}
}
