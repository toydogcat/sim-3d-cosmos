/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SpaceSoundEngine {
  private ctx: AudioContext | null = null;
  
  // Drone nodes
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private oscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isDroneActive: boolean = false;
  private isMuted: boolean = false;

  constructor() {}

  init() {
    if (this.ctx) return;
    try {
      // Create context
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      
      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Drone chain
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime); // Start silent
      
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(4, this.ctx.currentTime);
      
      this.droneGain.connect(this.filter);
      this.filter.connect(this.masterGain);

      // Build dual low drone for space atmosphere hum
      const frequencies = [60, 60.5, 90, 120.2];
      frequencies.forEach((freq, idx) => {
        if (!this.ctx || !this.droneGain) return;
        const osc = this.ctx.createOscillator();
        const oGain = this.ctx.createGain();
        
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        // Lower volume for higher harmonics
        const vol = idx < 2 ? 0.35 : 0.15;
        oGain.gain.setValueAtTime(vol, this.ctx.currentTime);
        
        osc.connect(oGain);
        oGain.connect(this.droneGain);
        osc.start();
        
        this.oscillators.push({ osc, gain: oGain });
      });

      // LFO to slowly modulate dry/wet filter frequency to emulate solar wind / vacuum breathing
      this.lfo = this.ctx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // super slow 12 seconds per cycle
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(40, this.ctx.currentTime); // swings freq by 40Hz
      
      this.lfo.connect(lfoGain);
      if (this.filter) {
        lfoGain.connect(this.filter.frequency);
      }
      this.lfo.start();

    } catch (e) {
      console.error('Space Audio Engine failed to initialize:', e);
    }
  }

  toggleDrone(active: boolean) {
    this.init();
    if (!this.ctx || !this.droneGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const targetVal = active && !this.isMuted ? 0.08 : 0;
    this.droneGain.gain.setTargetAtTime(targetVal, this.ctx.currentTime, 1.2);
    this.isDroneActive = active;
  }

  toggleMute(mute: boolean) {
    this.isMuted = mute;
    if (!this.ctx || !this.masterGain || !this.droneGain) return;
    
    if (this.ctx.state === 'suspended' && !mute) {
      this.ctx.resume();
    }

    const masterTarget = mute ? 0 : 0.4;
    this.masterGain.gain.setTargetAtTime(masterTarget, this.ctx.currentTime, 0.2);
    
    // Also manage drone gain
    const droneTarget = !mute && this.isDroneActive ? 0.08 : 0;
    this.droneGain.gain.setTargetAtTime(droneTarget, this.ctx.currentTime, 0.5);
  }

  playPing(freq: number = 440, type: 'sine' | 'triangle' = 'sine', duration: number = 2.0) {
    this.init();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      const now = this.ctx.currentTime;
      
      // Delay / Echo effect using built-in Audio Nodes for rich metallic reverb!
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(0.35, now);
      
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.setValueAtTime(0.4, now);
      
      delay.connect(delayFeedback);
      delayFeedback.connect(delay); // Loop back for feedback

      const pOsc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      
      pOsc.type = type;
      pOsc.frequency.setValueAtTime(freq, now);
      
      // Beautiful harmonic ping
      pGain.gain.setValueAtTime(0, now);
      pGain.gain.linearRampToValueAtTime(0.2, now + 0.05); // quick attack
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // smooth release

      pOsc.connect(pGain);
      pGain.connect(this.masterGain);
      
      // Connect to delay for echo
      pGain.connect(delay);
      delay.connect(this.masterGain);

      pOsc.start(now);
      pOsc.stop(now + duration + 1.0);
    } catch (e) {
      console.warn('Could not play interactive celestial ping:', e);
    }
  }

  // Harmonic chord chords based on planet's index!
  playCelestialChord(index: number) {
    // Beautiful pentatonic tones that always sound pleasant
    const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    const baseFreq = scale[index % scale.length];
    
    // Play root
    this.playPing(baseFreq, 'sine', 2.0);
    
    // Play perfect fifth after a tiny delay
    setTimeout(() => {
      const fifthFreq = scale[(index + 3) % scale.length];
      this.playPing(fifthFreq, 'triangle', 1.5);
    }, 120);

    // Play high octave
    setTimeout(() => {
      const octaveFreq = baseFreq * 2;
      this.playPing(octaveFreq, 'sine', 1.0);
    }, 240);
  }
}

export const spaceSound = new SpaceSoundEngine();
