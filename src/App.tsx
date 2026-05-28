/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Volume2, 
  VolumeX, 
  Orbit, 
  Info, 
  Sparkles, 
  Play, 
  Pause, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  EyeOff, 
  HelpCircle,
  Database,
  Crosshair
} from 'lucide-react';
import { planData, PlanetData, famousStars, StarData, constellationLines } from './spaceData';
import { spaceSound } from './spaceAudio';

export default function App() {
  // Config & State
  const [speed, setSpeed] = useState<number>(1.0); // 0 (paused), 0.2, 0.5, 1.0, 2.0, 5.0
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showConstellations, setShowConstellations] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'simplified' | 'realistic'>('simplified');
  
  const [soundOn, setSoundOn] = useState<boolean>(false);
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetData | null>(null);
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);
  const [trackingMode, setTrackingMode] = useState<boolean>(true);
  const [selectedConstellation, setSelectedConstellation] = useState<string>('all');
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'planets' | 'stars' | 'info'>('planets');
  
  // Iframe scroll protocol for Luna AI Hub
  useEffect(() => {
    let lastScrollY = 0;
    const scrollThreshold = 8;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      const currentScrollY = target.scrollTop;
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold && currentScrollY > 10) return;
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      window.parent.postMessage({
        type: 'iframe_scroll',
        scrollY: currentScrollY,
        direction: direction
      }, '*');
      lastScrollY = currentScrollY;
    };
    
    const scrollContainer = document.getElementById('sidebar-tab-view');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Vercount refresh on tab change
  useEffect(() => {
    // @ts-ignore
    if (window.vercount && typeof window.vercount.fetch === 'function') {
      // @ts-ignore
      window.vercount.fetch();
    }
  }, [activeTab]);
  
  // UI projected coordinates state
  const [projections, setProjections] = useState<Array<{ id: string; name: string; x: number; y: number; isPlanet: boolean; visible: boolean }>>([]);

  // Three.js REFs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // Simulation storage REFs (to update values inside the requestAnimationFrame loop)
  const planetMeshesRef = useRef<{ [key: string]: THREE.Group }>({});
  const planetOrbitAnglesRef = useRef<{ [key: string]: number }>({});
  const starMeshesRef = useRef<{ [key: string]: THREE.Mesh }>({});
  const constellationLineGroupRef = useRef<THREE.Group | null>(null);
  const orbitRingGroupRef = useRef<THREE.Group | null>(null);
  const sunRef = useRef<THREE.Mesh | null>(null);
  const innerSunGlowRef = useRef<THREE.Mesh | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  
  // Speed and config states mirror for animation loop
  const animConfigRef = useRef({
    speed,
    showOrbits,
    showConstellations,
    scaleMode,
    selectedPlanetId: '' as string | null,
    trackingMode,
    showLabels,
    selectedConstellation
  });

  // Track state changes inside animation loop
  useEffect(() => {
    animConfigRef.current = {
      speed,
      showOrbits,
      showConstellations,
      scaleMode,
      selectedPlanetId: selectedPlanet ? selectedPlanet.id : null,
      trackingMode,
      showLabels,
      selectedConstellation
    };
  }, [speed, showOrbits, showConstellations, scaleMode, selectedPlanet, trackingMode, showLabels, selectedConstellation]);

  // Planet orbit dynamic highlighting effect
  useEffect(() => {
    if (!orbitRingGroupRef.current) return;
    
    orbitRingGroupRef.current.children.forEach((child) => {
      if (!(child instanceof THREE.Line)) return;
      
      const planetId = child.name.replace('orbit-', '');
      const isSelected = selectedPlanet?.id === planetId;
      
      const mat = child.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.color.set(isSelected ? '#00e5ff' : '#222538');
        mat.opacity = isSelected ? 0.8 : 0.28;
        mat.needsUpdate = true;
      }
    });
  }, [selectedPlanet]);

  // Handle soundtrack toggle
  const toggleSound = () => {
    const newState = !soundOn;
    setSoundOn(newState);
    spaceSound.toggleMute(!newState);
    if (newState) {
      spaceSound.toggleDrone(true);
    }
  };

  // Keyboard controls handler function (W, S, A, D / Arrows to rotate camera; +, - to zoom)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!controlsRef.current || !cameraRef.current) return;
    const controls = controlsRef.current;
    const step = 0.05; // radians
    const zoomStep = 1.1; // scale factor
    
    // Get offset from camera to controls target (focus point)
    const offset = new THREE.Vector3().subVectors(cameraRef.current.position, controls.target);
    const radius = offset.length();
    
    // Convert to spherical coords
    let theta = Math.atan2(offset.x, offset.z);
    let phi = Math.acos(Math.max(-0.99, Math.min(0.99, offset.y / radius)));
    
    let changed = false;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        theta -= step;
        changed = true;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        theta += step;
        changed = true;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        phi = Math.max(0.1, phi - step);
        changed = true;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        phi = Math.min(Math.PI - 0.1, phi + step);
        changed = true;
        break;
      case 'Equal': // '+'
      case '+':
        offset.multiplyScalar(1 / zoomStep);
        changed = true;
        break;
      case 'Minus': // '-'
      case '-':
        offset.multiplyScalar(zoomStep);
        changed = true;
        break;
      default:
        break;
    }

    if (changed) {
      e.preventDefault();
      if (e.key === 'Equal' || e.key === '+' || e.key === 'Minus' || e.key === '-') {
        cameraRef.current.position.copy(controls.target).add(offset);
      } else {
        const newOffset = new THREE.Vector3(
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.cos(theta)
        );
        cameraRef.current.position.copy(controls.target).add(newOffset);
      }
      controls.update();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Set initial coordinates for planetary orbits
  useEffect(() => {
    planData.forEach(p => {
      if (!planetOrbitAnglesRef.current[p.id]) {
        planetOrbitAnglesRef.current[p.id] = Math.random() * Math.PI * 2;
      }
    });
  }, []);

  // Main Three.js Setup Loop
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // SCENE & BACKGROUND
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2('#020205', 0.0015);
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    // Position outside system looking slightly down
    camera.position.set(0, 30, 48);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 200;
    controls.minDistance = 2.5;
    controlsRef.current = controls;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight('#2a2a3e', 0.45);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Center point light (The Sun's glowing rays)
    const sunLight = new THREE.PointLight('#fff3d1', 3.2, 350, 0.82);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // PROCEDURAL TEXTURE GENERATOR FOR HIGH QUALITY OFFLINE MATERIALS
    const createProceduralTexture = (colorPrimary: string, colorSecondary: string, stripePattern = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Base color
        ctx.fillStyle = colorPrimary;
        ctx.fillRect(0, 0, 256, 256);

        // Fill secondary patterns
        if (stripePattern) {
          // Horizontal stripes for gas giants
          for (let i = 0; i < 20; i++) {
            ctx.fillStyle = colorSecondary;
            const h = Math.random() * 22 + 4;
            const y = Math.random() * (256 - h);
            ctx.fillRect(0, y, 256, h);
          }
          // Highlight/shadow banding
          const gradient = ctx.createLinearGradient(0, 0, 0, 256);
          gradient.addColorStop(0, '#ffffff22');
          gradient.addColorStop(0.5, '#00000033');
          gradient.addColorStop(1, '#ffffff11');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 256, 256);
        } else {
          // Speckled spots for rocky planets
          for (let i = 0; i < 65; i++) {
            ctx.fillStyle = colorSecondary + '99';
            const r = Math.random() * 10 + 3;
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
          // Extra noise
          for (let i = 0; i < 250; i++) {
            ctx.fillStyle = '#ffffff15';
            ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
          }
        }
      }
      return new THREE.CanvasTexture(canvas);
    };

    // SUN (Glowing Core in center)
    const sunGeo = new THREE.SphereGeometry(6.2, 32, 32);
    // Custom emissive glowing sun material
    const sunMat = new THREE.MeshBasicMaterial({
      color: '#ffe582',
    });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);
    sunRef.current = sun;

    // Outer corona glow mesh
    const glowGeo = new THREE.SphereGeometry(6.9, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#ffaa00',
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const sunGlow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(sunGlow);
    innerSunGlowRef.current = sunGlow;

    // STARS (2000 Twinkling background stars scattered in outer space)
    const starsCount = 2200;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);
    const starSizes = new Float32Array(starsCount);

    const spectralColors = [
      new THREE.Color('#ffffff'), // Class A
      new THREE.Color('#ddecff'), // Class B (Light blue)
      new THREE.Color('#ffeecc'), // Class K (Yellow-orange)
      new THREE.Color('#ffdfdf'), // Class M (Reddish-orange)
      new THREE.Color('#ebf5ff'), // Class F (White-blue)
    ];

    for (let i = 0; i < starsCount; i++) {
      // Place them on a giant sphere shell
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 160 + Math.random() * 120; // Radius between 160 and 280

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      // Assign random astronomical colors
      const col = spectralColors[Math.floor(Math.random() * spectralColors.length)];
      starColors[i * 3] = col.r;
      starColors[i * 3 + 1] = col.g;
      starColors[i * 3 + 2] = col.b;

      starSizes[i] = Math.random() * 0.9 + 0.3;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    // Custom Canvas Texture for a round, glowing star sprite (renders nice soft round points)
    const createStarSprite = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(235,245,255,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
      }
      const text = new THREE.CanvasTexture(canvas);
      return text;
    };

    const starMaterial = new THREE.PointsMaterial({
      size: 1.1,
      map: createStarSprite(),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starParticles = new THREE.Points(starGeometry, starMaterial);
    scene.add(starParticles);

    // FAMOUS STARS (Interactive deep-space stars)
    famousStars.forEach(star => {
      const starGeo = new THREE.SphereGeometry(0.35 + (3 - star.magnitude) * 0.1, 8, 8);
      const starMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(star.color),
        transparent: true,
        opacity: 0.95,
      });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(star.x, star.y, star.z);
      scene.add(starMesh);
      starMeshesRef.current[star.id] = starMesh;
    });

    // CONSTELLATION LINES (Lines between famous stars)
    const constellationLineGroup = new THREE.Group();
    scene.add(constellationLineGroup);
    constellationLineGroupRef.current = constellationLineGroup;

    // Function to draw constellation wires based on selection
    const drawConstellationLines = (activeConst?: string) => {
      // Clear old paths
      while (constellationLineGroup.children.length > 0) {
        const child = constellationLineGroup.children[0];
        constellationLineGroup.remove(child);
      }

      Object.entries(constellationLines).forEach(([constName, lines]) => {
        // Filter by UI selection
        if (activeConst !== 'all' && activeConst !== constName) return;

        const points: THREE.Vector3[] = [];

        lines.forEach(line => {
          const s1 = famousStars.find(s => s.id === line.id1);
          const s2 = famousStars.find(s => s.id === line.id2);
          if (s1 && s2) {
            points.push(new THREE.Vector3(s1.x, s1.y, s1.z));
            points.push(new THREE.Vector3(s2.x, s2.y, s2.z));
          }
        });

        if (points.length === 0) return;

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        // Space blueprint glow material
        const lineMat = new THREE.LineBasicMaterial({
          color: activeConst === constName ? '#00e5ff' : '#004a60',
          transparent: true,
          opacity: activeConst === constName ? 0.75 : 0.35,
          blending: THREE.AdditiveBlending,
        });

        const lineSegs = new THREE.LineSegments(lineGeo, lineMat);
        constellationLineGroup.add(lineSegs);
      });
    };
    drawConstellationLines(selectedConstellation);

    // PLANETS BUILDER
    const orbitRingGroup = new THREE.Group();
    scene.add(orbitRingGroup);
    orbitRingGroupRef.current = orbitRingGroup;

    // Function to calculate customized sizes & orbits based on current scale mode
    const getPlanetScaleData = (p: PlanetData) => {
      if (scaleMode === 'simplified') {
        return {
          radius: p.radius,
          distance: p.distance
        };
      } else {
        // Logarithmic scale for distances and sizes so that Neptune isn't too huge, but sizes are physically proportional
        // Scale of Earth radius: 1.2
        const logSize = Math.log10(p.realRadius) * 0.9 - 1.8;
        const logDistance = Math.log10(p.realDistance) * 16 - 12;
        return {
          radius: Math.max(0.25, logSize),
          distance: Math.max(12, logDistance)
        };
      }
    };

    // Draw circular orbital loops for planets
    const drawOrbitLines = () => {
      while (orbitRingGroup.children.length > 0) {
        orbitRingGroup.remove(orbitRingGroup.children[0]);
      }

      planData.forEach(p => {
        const { distance } = getPlanetScaleData(p);
        
        // Accurate resolution circle
        const segments = 120;
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(theta) * distance, 0, Math.sin(theta) * distance));
        }

        const ringGeo = new THREE.BufferGeometry().setFromPoints(points);
        const ringMat = new THREE.LineBasicMaterial({
          color: selectedPlanet?.id === p.id ? '#00e5ff' : '#222538',
          transparent: true,
          opacity: selectedPlanet?.id === p.id ? 0.8 : 0.28,
          linewidth: selectedPlanet?.id === p.id ? 2 : 1,
        });

        const orbitLine = new THREE.Line(ringGeo, ringMat);
        orbitLine.name = `orbit-${p.id}`;
        orbitRingGroup.add(orbitLine);
      });
    };
    drawOrbitLines();

    // Create Mesh Groups for Planets
    const newPlanetMeshes: { [key: string]: THREE.Group } = {};

    planData.forEach(p => {
      const { radius } = getPlanetScaleData(p);
      const planetGroup = new THREE.Group();

      // Core sphere
      const sphereGeo = new THREE.SphereGeometry(radius, 32, 28);
      
      // Build aesthetic offline textures
      const planetTexture = createProceduralTexture(
        p.color, 
        p.id === 'jupiter' || p.id === 'saturn' ? '#1c1b18' : '#2a201b', 
        p.id === 'jupiter' || p.id === 'saturn' || p.id === 'uranus' || p.id === 'neptune'
      );

      const sphereMat = new THREE.MeshStandardMaterial({
        map: planetTexture,
        roughness: 0.8,
        metalness: 0.1,
        bumpScale: 0.05,
      });

      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.castShadow = true;
      sphereMesh.receiveShadow = true;
      planetGroup.add(sphereMesh);

      // Planet rings (Saturn, Jupiter, Uranus, Neptune)
      if (p.hasRings && p.ringInner && p.ringOuter) {
        // Ring of Saturn
        const innerR = radius * p.ringInner;
        const outerR = radius * p.ringOuter;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 64);
        
        // Tweak ring rotation to align horizontally
        ringGeo.rotateX(Math.PI / 2);

        // Simple double-sided planar map for ring texture
        const ringCanvas = document.createElement('canvas');
        ringCanvas.width = 120;
        ringCanvas.height = 16;
        const rCtx = ringCanvas.getContext('2d');
        if (rCtx) {
          const grad = rCtx.createLinearGradient(0, 0, 120, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(0.2, p.ringsColor || '#ffffff88');
          grad.addColorStop(0.4, 'rgba(20,15,10,0.3)');
          grad.addColorStop(0.65, p.ringsColor || '#ffffffbb');
          grad.addColorStop(0.85, 'rgba(120,110,95,0.7)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          rCtx.fillStyle = grad;
          rCtx.fillRect(0, 0, 120, 16);
        }
        const ringTexture = new THREE.CanvasTexture(ringCanvas);

        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });

        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        planetGroup.add(ringMesh);
      }

      // Add Moon if it's Earth
      if (p.id === 'earth') {
        const moonRadius = radius * 0.28;
        const moonGeo = new THREE.SphereGeometry(moonRadius, 16, 16);
        // Procedural moon craters
        const moonTexture = createProceduralTexture('#7a7d80', '#4a4b4c');
        const moonMat = new THREE.MeshStandardMaterial({
          map: moonTexture,
          roughness: 0.9,
        });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.name = 'moon';
        // Place at offset orbit radius
        moonMesh.position.set(radius * 2.3, 0.4, 0);
        moonMesh.castShadow = true;
        moonMesh.receiveShadow = true;
        planetGroup.add(moonMesh);
      }

      scene.add(planetGroup);
      newPlanetMeshes[p.id] = planetGroup;
    });

    planetMeshesRef.current = newPlanetMeshes;

    // ANIMATION & PROJECTION RENDER LOOP
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      // Get frame delta
      const delta = clock.getDelta();
      const currentConfig = animConfigRef.current;
      const tSpeedMultiplier = currentConfig.speed;

      // Rotate Sun core and outer corona glow
      if (sunRef.current) {
        sunRef.current.rotation.y += 0.005 * tSpeedMultiplier;
      }
      if (innerSunGlowRef.current) {
        // Pulsate corona slightly
        const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 2.5) * 0.04;
        innerSunGlowRef.current.scale.set(pulse, pulse, pulse);
      }

      // Update Planet positions & self-rotation
      planData.forEach(p => {
        const meshGroup = newPlanetMeshes[p.id];
        if (!meshGroup) return;

        // Fetch scaling data
        const { radius, distance } = getPlanetScaleData(p);

        // Update angle using physics speed
        if (tSpeedMultiplier > 0) {
          // Increase theta based on planet's orbital cycle
          planetOrbitAnglesRef.current[p.id] += 0.12 * p.speed * tSpeedMultiplier * delta;
        }

        const angle = planetOrbitAnglesRef.current[p.id];
        const targetX = Math.cos(angle) * distance;
        const targetZ = Math.sin(angle) * distance;

        meshGroup.position.set(targetX, 0, targetZ);

        // Spin planet around self coordinate axial rotation index
        const spinMesh = meshGroup.children[0];
        if (spinMesh) {
          spinMesh.rotation.y += p.rotationSpeed * (tSpeedMultiplier || 1.0);
        }

        // Orbit Moon around the Earth
        if (p.id === 'earth') {
          const moonMesh = meshGroup.getObjectByName('moon');
          if (moonMesh) {
            // Spin Moon around Earth group center in local offset coordinates
            const moonAngle = clock.getElapsedTime() * 1.6 * (tSpeedMultiplier || 1.0);
            const offsetDist = radius * 2.1;
            moonMesh.position.set(
              Math.cos(moonAngle) * offsetDist,
              Math.sin(moonAngle) * 0.25, // Tilted orbital plane of moon
              Math.sin(moonAngle) * offsetDist
            );
          }
        }
      });

      // CAMERA WORK & PLANETARY ZOOM TRACKING
      if (currentConfig.selectedPlanetId) {
        const trackGroup = newPlanetMeshes[currentConfig.selectedPlanetId];
        if (trackGroup && currentConfig.trackingMode) {
          // Make Camera controls lock onto the target coordinate offset
          const pPos = new THREE.Vector3();
          trackGroup.getWorldPosition(pPos);
          
          // Smoothen transfer transition of target to make tracking sleek
          controls.target.lerp(pPos, 0.08);
          controls.update();
        }
      } else {
        // Default target Sun
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
        controls.update();
      }

      // 2D CLIENT-SIDE PROJECTIONS & LABELS CALCULATOR
      const activeProjections: Array<{ id: string; name: string; x: number; y: number; isPlanet: boolean; visible: boolean }> = [];

      if (currentConfig.showLabels) {
        // Project primary planets
        planData.forEach(p => {
          const group = newPlanetMeshes[p.id];
          if (!group) return;

          const pPos = new THREE.Vector3();
          group.getWorldPosition(pPos);

          // Project to NDC coordinates
          pPos.project(camera);

          // Is it behind the camera?
          const visible = pPos.z <= 1.0;

          // Convert to client pixels
          const screenX = (pPos.x * 0.5 + 0.5) * width;
          const screenY = (-pPos.y * 0.5 + 0.5) * height;

          activeProjections.push({
            id: p.id,
            name: `${p.name} (${p.englishName})`,
            x: screenX,
            y: screenY,
            isPlanet: true,
            visible
          });
        });

        // Project major famous stars
        famousStars.forEach(star => {
          const sPos = new THREE.Vector3(star.x, star.y, star.z);
          sPos.project(camera);

          const visible = sPos.z <= 1.0 && (currentConfig.selectedConstellation === 'all' || currentConfig.selectedConstellation === star.constellation.split(' ')[0]);

          const screenX = (sPos.x * 0.5 + 0.5) * width;
          const screenY = (-sPos.y * 0.5 + 0.5) * height;

          activeProjections.push({
            id: star.id,
            name: star.chineseName,
            x: screenX,
            y: screenY,
            isPlanet: false,
            visible
          });
        });

        setProjections(activeProjections);
      } else {
        setProjections([]);
      }

      // Constellation group rendering
      if (constellationLineGroupRef.current) {
        constellationLineGroupRef.current.visible = currentConfig.showConstellations;
      }
      // Orbit paths group rendering
      if (orbitRingGroupRef.current) {
        orbitRingGroupRef.current.visible = currentConfig.showOrbits;
      }

      // Twinkle ambient backdrop particles
      const colors = starGeometry.attributes.color.array as Float32Array;
      if (tSpeedMultiplier > 0) {
        for (let i = 0; i < starsCount; i++) {
          // Adjust bright colors slightly based on sin/cos noise
          if (i % 21 === 0) {
            const index = i * 3;
            const factor = 0.75 + Math.sin(clock.getElapsedTime() * 4.0 + i) * 0.25;
            colors[index] = factor * colors[index];
            colors[index + 1] = factor * colors[index + 1];
            colors[index + 2] = factor * colors[index + 2];
          }
        }
        starGeometry.attributes.color.needsUpdate = true;
      }

      // Core Render of frame
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // HANDLE RESIZING EVENTS USING RESIZEOBSERVER
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) continue;
        const { width: w, height: h } = entry.contentRect;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // CLEANUP
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      
      // Deep cleanup of Scene GPU resources (Mesh, Line, Points)
      scene.traverse((object: any) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat: any) => cleanMaterial(mat));
          } else {
            cleanMaterial(object.material);
          }
        }
      });

      renderer.dispose();
    };

    function cleanMaterial(material: any) {
      material.dispose();
      
      // Explicitly dispose of textures
      if (material.map && typeof material.map.dispose === 'function') {
        material.map.dispose();
      }
      if (material.bumpMap && typeof material.bumpMap.dispose === 'function') {
        material.bumpMap.dispose();
      }
      if (material.normalMap && typeof material.normalMap.dispose === 'function') {
        material.normalMap.dispose();
      }
      if (material.specularMap && typeof material.specularMap.dispose === 'function') {
        material.specularMap.dispose();
      }

      for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value.dispose === 'function') {
          value.dispose();
        }
      }
    }
  }, [scaleMode]); // Only re-init if scaleMode changes (realistic vs simplified sizes)

  // Hook to handle redraw of constellation lines on selection
  useEffect(() => {
    if (constellationLineGroupRef.current) {
      // Clear old paths with proper GPU disposal
      while (constellationLineGroupRef.current.children.length > 0) {
        const child = constellationLineGroupRef.current.children[0] as any;
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        constellationLineGroupRef.current.remove(child);
      }

      Object.entries(constellationLines).forEach(([constName, lines]) => {
        if (selectedConstellation !== 'all' && selectedConstellation !== constName) return;

        const points: THREE.Vector3[] = [];
        lines.forEach(line => {
          const s1 = famousStars.find(s => s.id === line.id1);
          const s2 = famousStars.find(s => s.id === line.id2);
          if (s1 && s2) {
            points.push(new THREE.Vector3(s1.x, s1.y, s1.z));
            points.push(new THREE.Vector3(s2.x, s2.y, s2.z));
          }
        });

        if (points.length === 0) return;

        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: selectedConstellation === constName ? '#00ffd0' : '#4a6080',
          transparent: true,
          opacity: selectedConstellation === constName ? 0.9 : 0.45,
          linewidth: selectedConstellation === constName ? 2 : 1,
        });

        const lineSegs = new THREE.LineSegments(lineGeo, lineMat);
        constellationLineGroupRef.current?.add(lineSegs);
      });
    }
  }, [selectedConstellation]);

  // Handle zooming using user controls
  const manualZoom = (factor: number) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const offset = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target);
    offset.multiplyScalar(factor);
    cameraRef.current.position.copy(controlsRef.current.target).add(offset);
    controlsRef.current.update();
  };

  // Select cosmic element callback
  const handleSelectPlanet = (planet: PlanetData) => {
    setSelectedStar(null);
    setSelectedPlanet(planet);
    setTrackingMode(true);
    setActiveTab('info');
    
    // Play sci-fi cosmic chord chime based on solar planet indices!
    const idx = planData.findIndex(p => p.id === planet.id);
    spaceSound.playCelestialChord(idx);
  };

  const handleSelectStar = (star: StarData) => {
    setSelectedPlanet(null);
    setSelectedStar(star);
    setTrackingMode(false);
    setActiveTab('info');
    
    // Zoom camera directly towards Star coordinates for inspection
    if (cameraRef.current && controlsRef.current) {
      const starVec = new THREE.Vector3(star.x, star.y, star.z);
      controlsRef.current.target.copy(starVec);
      // Zoom close
      const cameraOffset = new THREE.Vector3().copy(starVec).normalize().multiplyScalar(15);
      cameraRef.current.position.copy(starVec).add(cameraOffset);
      controlsRef.current.update();
    }

    // Play light cosmic wave sound
    spaceSound.playPing(587.33, 'triangle', 1.8);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div id="full-scope-sim" className="relative flex flex-col md:flex-row w-screen h-[100dvh] overflow-hidden bg-[#020206] text-slate-100 font-sans antialiased select-none">

      {/* LEFT SIDE PANEL - TELEMETRY & FLIGHT DECK CONTROLS */}
      <div id="flight-deck-sidebar" className="relative z-10 flex flex-col w-full md:w-[360px] h-auto max-h-[40vh] md:max-h-none md:h-full bg-slate-950/90 md:bg-slate-950/80 border-b md:border-b-0 md:border-r border-slate-800/80 backdrop-blur-md shrink-0">
        {/* BRAND & HEADER SECTION */}
        <div id="deck-logo" className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-md font-bold tracking-widest uppercase bg-gradient-to-r from-cyan-400 via-indigo-200 to-white bg-clip-text text-transparent">
              Cosmos 3D Tracker
            </h1>
          </div>
          <button 
            id="help-deck-btn"
            onClick={() => setShowHelp(!showHelp)} 
            className="p-1 px-2 text-xs rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 font-mono transition"
            title="Help Manual"
          >
            手冊 [H]
          </button>
        </div>

        {/* TIME & AUDIO PANEL */}
        <div id="quick-telemetry" className="p-4 bg-slate-900/40 border-b border-slate-800/40 grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/40 text-slate-400">
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest">系統狀態</span>
            <span className="text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE [聯機]
            </span>
          </div>
          <button 
            id="audio-sound-btn"
            onClick={toggleSound} 
            className={`p-2.5 rounded border text-left cursor-pointer transition duration-300 ${soundOn ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300' : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:bg-slate-900'}`}
          >
            <span className="block text-[10px] text-slate-500 uppercase tracking-widest">立體音場</span>
            <span className="flex items-center gap-1.5 mt-0.5">
              {soundOn ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundOn ? 'AMBIENT [開]' : 'OFF [靜音]'}
            </span>
          </button>
        </div>

        {/* MODULE SELECTION TABS */}
        <div id="sidebar-tab-switcher" className="flex border-b border-slate-800/60 bg-slate-950/40 text-xs font-mono font-bold">
          <button
            id="tab-planets-btn"
            onClick={() => setActiveTab('planets')}
            className={`flex-1 py-3 text-center transition ${activeTab === 'planets' ? 'border-b-2 border-cyan-400 text-cyan-300 bg-slate-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'}`}
          >
            行星目錄
          </button>
          <button
            id="tab-stars-btn"
            onClick={() => setActiveTab('stars')}
            className={`flex-1 py-3 text-center transition ${activeTab === 'stars' ? 'border-b-2 border-cyan-400 text-cyan-300 bg-slate-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'}`}
          >
            常見星標
          </button>
          <button
            id="tab-info-btn"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-center transition ${activeTab === 'info' ? 'border-b-2 border-cyan-400 text-cyan-300 bg-slate-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/20'}`}
          >
            天體規格
          </button>
        </div>

        {/* ACTIVE TAB CONTENT WINDOW */}
        <div id="sidebar-tab-view" className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          
          {/* TAB 1: PLANET SELECTOR */}
          {activeTab === 'planets' && (
            <div id="planet-catalogue-tab" className="space-y-2">
              <p className="text-xs text-slate-400 mb-3 font-mono">
                太陽系核心。點選以下星體，觀測計畫面鏡將自動聚焦與追蹤。
              </p>
              
              <button
                id="select-sun-btn"
                onClick={() => {
                  setSelectedPlanet(null);
                  setSelectedStar(null);
                  if (cameraRef.current && controlsRef.current) {
                    controlsRef.current.target.set(0, 0, 0);
                    controlsRef.current.update();
                  }
                  spaceSound.playPing(329.63, 'sine', 1.5);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded border border-orange-500/20 bg-orange-950/10 hover:bg-orange-950/20 active:bg-orange-900/30 text-orange-200 text-sm transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 shadow-md shadow-orange-500/50" />
                  <span className="font-bold">太陽 (Sun)</span>
                </div>
                <span className="text-[10px] bg-orange-500/20 px-2 py-0.5 rounded text-orange-400 uppercase font-mono">星系主星</span>
              </button>

              {planData.map(p => {
                const isSelected = selectedPlanet?.id === p.id;
                return (
                  <button
                    id={`select-planet-${p.id}`}
                    key={p.id}
                    onClick={() => handleSelectPlanet(p)}
                    className={`w-full flex items-center justify-between p-2.5 rounded text-sm transition text-left ${
                      isSelected 
                        ? 'border border-cyan-500 bg-cyan-950/30 text-cyan-50 shadow-md shadow-cyan-500/10' 
                        : 'border border-slate-800/60 bg-slate-900/40 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          {p.name}
                          <span className="text-[10.5px] font-mono text-slate-400 font-normal">{p.englishName}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TAB 2: DEEP SPACE STARS */}
          {activeTab === 'stars' && (
            <div id="stellar-catalogue-tab" className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-400 font-mono font-bold mb-1.5">
                  星座網絡選擇
                </label>
                <select
                  id="constellation-chart-select"
                  value={selectedConstellation}
                  onChange={(e) => setSelectedConstellation(e.target.value)}
                  className="w-full text-xs p-2 rounded border border-slate-800 bg-slate-900 text-slate-300"
                >
                  <option value="all">顯示所有星座 (Show All)</option>
                  <option value="Orion">獵戶座 (Orion)</option>
                  <option value="Ursa Major">北斗七星 (Big Dipper)</option>
                  <option value="Cassiopeia">仙后座 (Cassiopeia)</option>
                  <option value="Summer Triangle">夏季大三角 (Summer Triangle)</option>
                  <option value="none">關閉所有星座結構 (Hide Connect Lines)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs uppercase tracking-widest text-slate-400 font-mono font-bold">
                  著名恆星
                </span>
                {famousStars.map(star => {
                  const isSelected = selectedStar?.id === star.id;
                  return (
                    <button
                      id={`select-star-${star.id}`}
                      key={star.id}
                      onClick={() => handleSelectStar(star)}
                      className={`w-full flex items-center justify-between p-2 py-2.5 rounded text-xs transition text-left ${
                        isSelected 
                          ? 'border border-cyan-500 bg-cyan-950/30 text-cyan-200' 
                          : 'border border-slate-800/40 bg-slate-900/20 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: star.color }} />
                        <div>
                          <p className="font-bold text-slate-200">{star.chineseName}</p>
                          <p className="text-[10px] text-slate-400">{star.constellation}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {star.magnitude} mag
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY DATA INFORMATION */}
          {activeTab === 'info' && (
            <div id="celestial-details-tab" className="space-y-4">
              
              {/* DISPLAY MODE 1: SELECTED PLANET */}
              {selectedPlanet && (
                <div id="detail-card-planet" className="space-y-4">
                  <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">觀測對象：九大行星</span>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-200 mt-1">
                      <span className="w-3.5 h-3.5 rounded-full inline-block shrink-0 shadow" style={{ backgroundColor: selectedPlanet.color }} />
                      {selectedPlanet.name} <span className="text-sm text-slate-400 font-mono font-normal">({selectedPlanet.englishName})</span>
                    </h2>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded.5 border border-slate-800/40 divide-y divide-slate-800/50 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">平均半徑</span>
                      <span className="text-slate-100 font-bold">{selectedPlanet.realRadius.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">距離太陽 (日距主軸)</span>
                      <span className="text-slate-100 font-bold">
                        {selectedPlanet.realDistance ? `${selectedPlanet.realDistance.toLocaleString()} 百萬 km (${(selectedPlanet.realDistance / 149.6).toFixed(2)} AU)` : '居中 (Sun)'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">公轉週期 (Orbital Period)</span>
                      <span className="text-cyan-300 font-bold">{selectedPlanet.realPeriod}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">自轉週期 (Day Length)</span>
                      <span className="text-slate-100 font-bold">{selectedPlanet.realRotation}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">環境溫度</span>
                      <span className="text-slate-150 text-indigo-200 font-bold">{selectedPlanet.temperature}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">已知衛星數 (Moons)</span>
                      <span className="text-slate-100 font-bold">{selectedPlanet.moonsCount} 顆</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">物理質量 (Mass)</span>
                      <span className="text-slate-400 font-bold">{selectedPlanet.mass} kg</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded text-xs space-y-1.5 leading-relaxed text-slate-300">
                    <h3 className="font-bold text-cyan-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> 天體簡介
                    </h3>
                    <p>{selectedPlanet.fact}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="toggle-track-btn"
                      onClick={() => setTrackingMode(!trackingMode)}
                      className={`flex-1 py-1 px-2.5 rounded text-xs font-mono text-center transition flex items-center justify-center gap-1.5 border border-slate-800 ${trackingMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-slate-900 text-slate-400 hover:bg-slate-850'}`}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      {trackingMode ? '追蹤鎖定中' : '鎖定星體'}
                    </button>
                    <button
                      id="reset-focus-btn"
                      onClick={() => {
                        setSelectedPlanet(null);
                        setTrackingMode(false);
                        if (cameraRef.current && controlsRef.current) {
                          controlsRef.current.target.set(0, 0, 0);
                          controlsRef.current.update();
                        }
                      }}
                      className="py-1 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono rounded"
                    >
                      重設視角
                    </button>
                  </div>
                </div>
              )}

              {/* DISPLAY MODE 2: SELECTED STAR */}
              {selectedStar && (
                <div id="detail-card-star" className="space-y-4">
                  <div className="p-3 bg-indigo-950/10 border border-indigo-500/20 rounded">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">觀測對象：深空恆星標記</span>
                    <h2 className="text-xl font-bold text-indigo-200 mt-1">
                      {selectedStar.chineseName}
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">{selectedStar.name}</span>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded.5 border border-slate-800/40 divide-y divide-slate-800/50 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">所屬星群/星座</span>
                      <span className="text-cyan-300 font-bold">{selectedStar.constellation}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">視星等 (Magnitude)</span>
                      <span className="text-slate-100 font-bold">{selectedStar.magnitude} m</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">光線光譜特徵</span>
                      <span className="flex items-center gap-1 text-slate-100 font-bold">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: selectedStar.color }} />
                        Astrometal
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">天球方位 X / Y / Z</span>
                      <span className="text-slate-300 font-mono text-[10px]">
                        X:{selectedStar.x.toFixed(1)} / Y:{selectedStar.y.toFixed(1)} / Z:{selectedStar.z.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded text-xs space-y-1.5 leading-relaxed text-slate-300">
                    <h3 className="font-bold text-indigo-400 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> 恆星資料與趣聞
                    </h3>
                    <p>{selectedStar.fact}</p>
                  </div>

                  <button
                    id="deselect-star-btn"
                    onClick={() => {
                      setSelectedStar(null);
                      if (cameraRef.current && controlsRef.current) {
                        controlsRef.current.target.set(0, 0, 0);
                        controlsRef.current.update();
                      }
                    }}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono rounded"
                  >
                    解除恆星特徵鎖定
                  </button>
                </div>
              )}

              {/* DEFAULT LOGO IF NONE SELECTED */}
              {!selectedPlanet && !selectedStar && (
                <div id="detail-card-default" className="text-center py-10 px-4 border border-dashed border-slate-850 rounded">
                  <Compass className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-[spin_8s_linear_infinite]" />
                  <p className="text-sm font-bold text-slate-300">星儀監測面板靜止中</p>
                  <p className="text-xs text-slate-500 mt-2 font-sans">
                    請點選左側或畫面中的任意星體，獲取該天體的即時軌道幾何、公轉速率及物理特徵。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM METADATA RAIL */}
        <div id="deck-telemetry-panel" className="p-4 border-t border-slate-800/60 bg-slate-950 flex flex-col gap-1.5 text-[10px] font-mono text-slate-500">
          <div className="flex justify-between">
            <span>模擬時區基準</span>
            <span>UTC/GMT +0</span>
          </div>
          <div className="flex justify-between">
            <span>星表版本</span>
            <span>HYG v2.8 / JPLephem</span>
          </div>
          <div className="flex justify-between text-[9px] text-slate-600">
            <span>© {currentYear} Cosmos 3D Interactive. Licensed under Apache-2.0.</span>
          </div>
        </div>
      </div>

      {/* RIGHT MAIN GRAPHICS VIEWPORT */}
      <div id="simulation-graphics-container" className="relative flex-1 h-full flex flex-col overflow-hidden">
        
        {/* INTERACTIVE CONTROLS HUD (TOP OVERLAY) */}
        <div id="hud-top" className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2.5 items-center justify-between pointer-events-none">
          
          {/* CONTROL BOX: PHYSICS SIM SPEED CONTROL */}
          <div id="hud-play-controls" className="pointer-events-auto flex items-center gap-1 px-3 py-2 bg-slate-950/85 backdrop-blur border border-slate-800/80 rounded-lg shadow-lg">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 mr-2 uppercase">公轉速比:</span>
            
            <button
              id="speed-pause-btn"
              onClick={() => setSpeed(0)}
              className={`p-1 px-2 text-xs rounded font-mono ${speed === 0 ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Pause"
            >
              <Pause className="w-3.5 h-3.5 inline mr-1" />
              PAUSE
            </button>
            
            <button
              id="speed-1x-btn"
              onClick={() => setSpeed(1.0)}
              className={`p-1 px-2 text-xs rounded font-mono ${speed === 1.0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
              title="Normal speed"
            >
              <Play className="w-3.5 h-3.5 inline mr-1" />
              1.0x
            </button>

            <button
              id="speed-3x-btn"
              onClick={() => setSpeed(3.0)}
              className={`p-1 px-2 text-xs rounded font-mono ${speed === 3.0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              3.0x
            </button>

            <button
              id="speed-8x-btn"
              onClick={() => setSpeed(8.0)}
              className={`p-1 px-2 text-xs rounded font-mono ${speed === 8.0 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}
            >
              8.0x
            </button>
          </div>

          {/* CONTROL BOX: CAMERA GEOMETRY & FILTERS */}
          <div id="hud-visual-filters" className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 bg-slate-950/85 backdrop-blur border border-slate-800/80 rounded-lg shadow-lg text-xs font-mono">
            {/* Scale toggle */}
            <button
              id="toggle-scale-mode-btn"
              onClick={() => setScaleMode(scaleMode === 'simplified' ? 'realistic' : 'simplified')}
              className={`p-1 px-2.5 rounded transition flex items-center gap-1.5 ${scaleMode === 'realistic' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'}`}
              title="切換真實行星大小比例與 simplified 模式"
            >
              <Database className="w-3.5 h-3.5" />
              比例: {scaleMode === 'simplified' ? '觀察聚焦' : '真實對數'}
            </button>

            {/* Orbit lines toggle */}
            <button
              id="toggle-orbits-btn"
              onClick={() => setShowOrbits(!showOrbits)}
              className={`p-1 px-2.5 rounded transition flex items-center gap-1.5 ${showOrbits ? 'bg-cyan-500/10 text-cyan-300' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              {showOrbits ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              軌道圈
            </button>

            {/* Star constellations line toggle */}
            <button
              id="toggle-constellations-btn"
              onClick={() => setShowConstellations(!showConstellations)}
              className={`p-1 px-2.5 rounded transition flex items-center gap-1.5 ${showConstellations ? 'bg-cyan-500/10 text-cyan-300' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              {showConstellations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              星座線
            </button>

            {/* General labels overlay toggle */}
            <button
              id="toggle-labels-btn"
              onClick={() => setShowLabels(!showLabels)}
              className={`p-1 px-2.5 rounded transition flex items-center gap-1.5 ${showLabels ? 'bg-cyan-500/10 text-cyan-300' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
            >
              {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              標籤 HUD
            </button>
          </div>
        </div>

        {/* THREEJS CANVAS STAGE VIEWPORT container */}
        <div id="3d-rendering-viewport" ref={containerRef} className="absolute inset-0 z-0">
          <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing outline-none" />
          
          {/* LABELS OVERLAY PROJECTIONS LAYER (Crisp HTML elements tracked continuously over planetary coordinates) */}
          {projections.map(proj => {
            if (!proj.visible) return null;
            
            const isSelected = selectedPlanet?.id === proj.id || selectedStar?.id === proj.id;
            
            return (
              <div
                id={`projected-label-${proj.id}`}
                key={proj.id}
                style={{
                  position: 'absolute',
                  left: `${proj.x}px`,
                  top: `${proj.y}px`,
                  transform: 'translate(-50%, -100%)',
                }}
                className={`pointer-events-auto transition-all duration-75 select-none ${proj.isPlanet ? 'mt-[-8px]' : 'mt-[-4px]'}`}
              >
                {/* Clean Sci-Fi Crosshair Pointer Element */}
                <button
                  id={`action-label-btn-${proj.id}`}
                  onClick={() => {
                    if (proj.isPlanet) {
                      const planet = planData.find(p => p.id === proj.id);
                      if (planet) handleSelectPlanet(planet);
                    } else {
                      const star = famousStars.find(s => s.id === proj.id);
                      if (star) handleSelectStar(star);
                    }
                  }}
                  className={`flex flex-col items-center group cursor-pointer focus:outline-none`}
                >
                  {/* Subtle target diamond point */}
                  <span className={`w-1.5 h-1.5 transform rotate-45 border transition-all ${
                    isSelected 
                      ? 'bg-cyan-400 border-cyan-400 scale-125' 
                      : 'bg-white/40 border-white/60 group-hover:bg-cyan-400 group-hover:scale-125'
                  }`} />
                  
                  {/* Glowing text node */}
                  <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap font-sans border tracking-wider transition ${
                    isSelected 
                      ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-500/25' 
                      : 'bg-slate-950/75 border-slate-800/90 text-slate-300 group-hover:bg-cyan-950/80 group-hover:border-cyan-400 group-hover:text-cyan-200'
                  }`}>
                    {proj.name}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* BOTTOM TELEMETRY OVERLAY GUIDES (FOOTER IN CANVAS) */}
        <div id="hud-bottom" className="absolute bottom-4 left-4 right-4 z-10 flex flex-col md:flex-row gap-2 justify-between items-center pointer-events-none">
          
          {/* MANUAL CONTROLS PROMPT */}
          <div id="keyboard-guide-prompt" className="bg-slate-950/80 backdrop-blur border border-slate-800/80 px-3 py-2 rounded text-[11px] text-slate-400 font-sans shadow-lg leading-relaxed max-w-lg pointer-events-auto">
            <span className="font-bold text-cyan-400 block mb-0.5 mb-1 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> 互動操作操控面板資訊
            </span>
            <p className="font-sans">
              <strong className="text-white">滑鼠拖曳：</strong>按住左鍵旋轉俯仰視角；滾動滾輪放大、縮小深空。
            </p>
            <p className="font-sans mt-0.5">
              <strong className="text-white">鍵盤操控：</strong>支援使用 <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-200 font-mono text-[9px] font-bold">W</kbd> 
              <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-200 font-mono text-[9px] font-bold">A</kbd> 
              <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-200 font-mono text-[9px] font-bold">S</kbd> 
              <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-200 font-mono text-[9px] font-bold">D</kbd> 或方向鍵調整轉角，
              按下 <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-200 font-mono text-[9px] font-bold">+</kbd> 和 <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-700 text-slate-200 font-mono text-[9px] font-bold">-</kbd> 進行深空縮放。
            </p>
          </div>

          {/* QUICK CAMERA TWEAKING SHORTCUTS */}
          <div id="camera-zoom-btns-hud" className="pointer-events-auto flex items-center gap-1 bg-slate-950/85 backdrop-blur border border-slate-800/80 p-1 rounded-lg shadow-lg">
            <button
              id="zoom-in-shortcut-btn"
              onClick={() => manualZoom(0.8)}
              className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono font-bold flex items-center gap-1.5"
              title="Camera zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              放大 [=]
            </button>
            <button
              id="zoom-out-shortcut-btn"
              onClick={() => manualZoom(1.25)}
              className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono font-bold flex items-center gap-1.5"
              title="Camera zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              縮小 [-]
            </button>
            <button
              id="reset-cam-shortcut-btn"
              onClick={() => {
                setSelectedPlanet(null);
                setSelectedStar(null);
                if (cameraRef.current && controlsRef.current) {
                  cameraRef.current.position.set(0, 30, 48);
                  controlsRef.current.target.set(0, 0, 0);
                  controlsRef.current.update();
                }
                spaceSound.playPing(392.00, 'sine', 1.2);
              }}
              className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded text-xs font-mono font-bold flex items-center gap-1.5"
              title="Reset view"
            >
              <Orbit className="w-3.5 h-3.5" />
              全景視角
            </button>
          </div>
        </div>

        {/* FLOATING HELP MODAL WINDOW */}
        {showHelp && (
          <div id="instructions-manual-modal" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div id="manual-modal-body" className="w-full max-w-lg bg-slate-900 border border-slate-800/90 rounded-xl shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Compass className="w-5 h-5 text-cyan-400 animate-spin" />
                <h3 className="text-lg font-bold tracking-wider text-slate-100 font-sans">
                  🌌 宇宙互動星空與九大行星觀測儀
                </h3>
              </div>

              <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-sans">
                <p>
                  歡迎來到這款基於 WebGL / Three.js 前端 3D 技術建構的星空與太陽系模擬系統。
                  這台模擬器整合了極高互動性的攝像軌道追蹤與立體交互體驗！
                </p>

                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded space-y-2">
                  <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
                    🕹️ 飛行機艙操作指令
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                    <li>
                      <strong className="text-white">滑鼠視點更變：</strong>
                      於渲染視窗內按住滑鼠左鍵並拖曳即可旋轉視角；按住滑鼠右鍵並拖曳即可平移攝像機；滾動滑鼠滾輪進行細緻縮放。
                    </li>
                    <li>
                      <strong className="text-white">鍵盤快捷按鍵：</strong>
                      使用鍵盤上的 <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-600 text-slate-200">A</kbd> <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-600 text-slate-200">D</kbd> (或左右方向鍵) 改變左右旋轉角度，使用 <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-600 text-slate-200">W</kbd> <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-600 text-slate-200">S</kbd> (或上下方向鍵) 改變俯仰角，按下 <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-600 text-slate-200">+</kbd> 和 <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-600 text-slate-200">-</kbd> 實施深空焦距調整。
                    </li>
                    <li>
                      <strong className="text-white">天體追蹤與聚焦：</strong>
                      在星空畫布中點擊任何標籤按鈕，或者在左側目錄點擊任意星體，攝像機將會自動向前滑行，鎖定並跟隨其在軌道上的運行！
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded space-y-2">
                  <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                    ☄️ 星空探索觀測亮點
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400">
                    <li>
                      <strong className="text-white">經典 9 大行星與月球：</strong>
                      包含水、金、地（及公轉月球）、火、木、土、天、海，以及傳統的第九大行星——冥王星。
                    </li>
                    <li>
                      <strong className="text-white">真實恆星標記背景：</strong>
                      背景散落著 2000 多顆微調閃爍的太空星沙，並內含北極星、天狼星、參宿四等著名高光度恆星，點擊可直接追焦觀看！
                    </li>
                    <li>
                      <strong className="text-white">著名古代星座劃分：</strong>
                      可自由過濾與描繪大熊座（北斗七星）、獵戶座、仙后座、夏季大三角的星座連線。
                    </li>
                    <li>
                      <strong className="text-white">宇宙環繞聲場：</strong>
                      點選開啟「立體音場」，即可載入低頻的太空磁場波動聲（ procedural synthesis drone ），且每次點選星體皆會共鳴敲擊出優雅的和弦琴音。
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                <button
                  id="dismiss-manual-btn"
                  onClick={() => {
                    setShowHelp(false);
                    // Proactively prompt synthesized sounds on launch to start audio context
                    spaceSound.init();
                  }}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider transition uppercase"
                >
                  進入模擬星空觀測儀
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
