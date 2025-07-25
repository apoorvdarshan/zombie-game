// Game state management
let gameState = "mainMenu"; // 'mainMenu', 'instructions', 'playing', 'paused', 'gameOver'
let gameInitialized = false;

// Scene setup
let scene, camera, renderer;
let ground, sky;
let controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();

// Zombie system
let zombies = [];
let zombieModel = null;
let loader = new THREE.GLTFLoader();
const ZOMBIE_COUNT = 10;

// Zombie types with different stats
const ZOMBIE_TYPES = {
  NORMAL: {
    name: "Normal",
    emoji: "🧟",
    health: 1,
    speed: 1.0,
    scale: 1.0,
    color: 0x4a5c3a, // Green
    headColor: 0x8b7355, // Brown
    eyeColor: 0xff0000, // Red
    detectRange: 60,
    attackRange: 3.5,
    chaseRange: 8,
    attackDamage: 10,
    spawnWeight: 100, // Higher = more common
  },
  FAST: {
    name: "Runner",
    emoji: "🏃‍♂️",
    health: 1,
    speed: 1.8,
    scale: 0.9,
    color: 0x6b4226, // Dark brown
    headColor: 0x8b7355, // Brown
    eyeColor: 0xff4400, // Orange-red
    detectRange: 70,
    attackRange: 4.0,
    chaseRange: 10,
    attackDamage: 8,
    spawnWeight: 60,
  },
  TANK: {
    name: "Tank",
    emoji: "🦾",
    health: 3,
    speed: 0.6,
    scale: 1.4,
    color: 0x2c3e2a, // Dark green
    headColor: 0x654321, // Dark brown
    eyeColor: 0xff0000, // Red
    detectRange: 50,
    attackRange: 4.5,
    chaseRange: 8,
    attackDamage: 20,
    spawnWeight: 30,
  },
  BOSS: {
    name: "Brute",
    emoji: "👹",
    health: 8,
    speed: 0.8,
    scale: 2.0,
    color: 0x1a1a1a, // Almost black
    headColor: 0x4a0e0e, // Dark red
    eyeColor: 0xff6600, // Bright orange
    detectRange: 80,
    attackRange: 6.0,
    chaseRange: 12,
    attackDamage: 30,
    spawnWeight: 5,
  },
};

// Track zombie type counts for UI
let zombieTypeCounts = {
  NORMAL: 0,
  FAST: 0,
  TANK: 0,
  BOSS: 0,
};

// Health pack system
let healthPacks = [];
let lastHealthPackSpawn = 0;
const HEALTH_PACK_SPAWN_INTERVAL = 15000; // 15 seconds between spawns
const HEALTH_PACK_HEAL_AMOUNT = 25; // How much health each pack restores
const MAX_HEALTH_PACKS = 3; // Maximum health packs on map at once
let healthPacksCollected = 0;

// Ammo pack system
let ammoPacks = [];
let lastAmmoPackSpawn = 0;
const AMMO_PACK_SPAWN_INTERVAL = 20000; // 20 seconds between spawns
const AMMO_PACK_REFILL_AMOUNT = 60; // How much ammo each pack restores
const MAX_AMMO_PACKS = 2; // Maximum ammo packs on map at once
let ammoPacksCollected = 0;

// Gun and shooting system
let gun = null;
let machineGun = null;
let currentWeapon = "rifle"; // 'rifle' or 'machinegun'
let bullets = [];
const BULLET_SPEED = 50;
const BULLET_LIFETIME = 3000; // 3 seconds in milliseconds

// Weapon-specific properties
const WEAPONS = {
  rifle: {
    name: "Assault Rifle",
    fireRate: 0, // Single shot
    damage: 1,
    recoil: 0.4,
    emoji: "🔫",
    maxAmmo: 999, // Effectively unlimited
    currentAmmo: 999,
  },
  machinegun: {
    name: "Machine Gun",
    fireRate: 400, // Rounds per minute
    damage: 1,
    recoil: 0.25,
    emoji: "⚡",
    maxAmmo: 150, // Limited ammo
    currentAmmo: 150,
  },
};

// Rapid fire system
let isAutoFiring = false;
let lastShotTime = 0;
let mouseHeld = false;

// Gun animation and effects
let gunRecoilOffset = 0;
let gunRecoilVelocity = 0;
let muzzleFlashLight = null;
let gunBasePosition = { x: 0, y: -3, z: -5 }; // Base gun position

// Crosshair and targeting system
let raycaster = new THREE.Raycaster();
let isAimingAtZombie = false;

// Mini radar system
let radarCanvas = null;
let radarContext = null;
const RADAR_RANGE = 50; // Range in game units
const RADAR_SIZE = 120; // Canvas size in pixels

// Score system
let zombieKills = 0;

// Wave system
let currentWave = 1;
let zombiesThisWave = 0;
let zombiesSpawnedThisWave = 0;
let waveInProgress = false;
let timeBetweenWaves = 5000; // 5 seconds between waves
let nextWaveTimer = null;
let zombieSpawnTimer = null;

// Player health system
let playerHealth = 100;
let maxHealth = 100;
let isGameOver = false;
let lastDamageTime = 0;
let damageInvulnerabilityTime = 1000; // 1 second invulnerability after damage

// Audio system
let audioListener;
let audioLoader;
let backgroundMusic;
let gunfireSound;
let zombieGrowlSound;
let zombieAttackSound;
let sounds = {
  backgroundMusic: null,
  gunfire: null,
  machinegun: null,
  zombieGrowl: null,
  zombieAttack: null,
};
let musicVolume = 0.3;
let effectsVolume = 0.7;
let lastGrowlTime = 0;
let growlCooldownTime = 2000; // 2 seconds between growls

// Initialize audio system
function initAudio() {
  console.log("Initializing audio system...");

  // Create audio listener
  audioListener = new THREE.AudioListener();
  camera.add(audioListener);

  // Create audio loader
  audioLoader = new THREE.AudioLoader();

  // Initialize sounds
  initBackgroundMusic();
  initSoundEffects();

  console.log("Audio system initialized");
}

// Initialize background music
function initBackgroundMusic() {
  backgroundMusic = new THREE.Audio(audioListener);

  // For now we'll use ambient background without loading music
  // You can add music file loading here if needed
  console.log("Background music system ready");
}

// Initialize sound effects
function initSoundEffects() {
  // Create sound objects
  gunfireSound = new THREE.Audio(audioListener);
  zombieGrowlSound = new THREE.Audio(audioListener);
  zombieAttackSound = new THREE.Audio(audioListener);

  // Load actual sound files
  console.log("Loading sound effects...");

  // Load single shot gunfire sound
  audioLoader.load(
    "assets/single gun shot.mp3",
    function (buffer) {
      console.log("Single gun shot loaded successfully");
      gunfireSound.setBuffer(buffer);
      gunfireSound.setVolume(effectsVolume);
      sounds.gunfire = gunfireSound;
    },
    undefined,
    function (error) {
      console.error("Error loading single gun shot:", error);
      sounds.gunfire = null;
    }
  );

  // Load machine gun sound for rapid fire
  const machineGunSound = new THREE.Audio(audioListener);
  audioLoader.load(
    "assets/machine gun (rapid fire).mp3",
    function (buffer) {
      console.log("Machine gun sound loaded successfully");
      machineGunSound.setBuffer(buffer);
      machineGunSound.setVolume(effectsVolume);
      sounds.machinegun = machineGunSound;
    },
    undefined,
    function (error) {
      console.error("Error loading machine gun sound:", error);
      sounds.machinegun = null;
    }
  );

  // Load zombie sound
  audioLoader.load(
    "assets/zombie.mp3",
    function (buffer) {
      console.log("Zombie sound loaded successfully");
      zombieGrowlSound.setBuffer(buffer);
      zombieGrowlSound.setVolume(effectsVolume);
      zombieAttackSound.setBuffer(buffer); // Use same sound for attack
      zombieAttackSound.setVolume(effectsVolume);
      sounds.zombieGrowl = zombieGrowlSound;
      sounds.zombieAttack = zombieAttackSound;
    },
    undefined,
    function (error) {
      console.error("Error loading zombie sound:", error);
      sounds.zombieGrowl = null;
      sounds.zombieAttack = null;
    }
  );

  console.log("Sound effects loading initiated");
}

// Update volume for loaded sounds
function updateSoundVolumes() {
  if (sounds.gunfire && sounds.gunfire.setVolume) {
    sounds.gunfire.setVolume(effectsVolume);
  }
  if (sounds.machinegun && sounds.machinegun.setVolume) {
    sounds.machinegun.setVolume(effectsVolume);
  }
  if (sounds.zombieGrowl && sounds.zombieGrowl.setVolume) {
    sounds.zombieGrowl.setVolume(effectsVolume);
  }
  if (sounds.zombieAttack && sounds.zombieAttack.setVolume) {
    sounds.zombieAttack.setVolume(effectsVolume);
  }
}

// Play gunfire sound
function playGunfireSound() {
  // Use appropriate sound based on current weapon
  const weaponSound =
    currentWeapon === "rifle" ? sounds.gunfire : sounds.machinegun;

  if (!weaponSound) {
    console.warn(`No sound loaded for ${currentWeapon}`);
    return;
  }

  // Stop the sound if it's already playing (for rapid fire)
  if (weaponSound.isPlaying) {
    weaponSound.stop();
  }

  // Update volume and play
  weaponSound.setVolume(effectsVolume);
  weaponSound.play();
}

// Play zombie growl sound
function playZombieGrowlSound() {
  if (!sounds.zombieGrowl) {
    console.warn("No zombie growl sound loaded");
    return;
  }

  const currentTime = Date.now();
  if (currentTime - lastGrowlTime < growlCooldownTime) return;

  lastGrowlTime = currentTime;

  // Stop the sound if it's already playing
  if (sounds.zombieGrowl.isPlaying) {
    sounds.zombieGrowl.stop();
  }

  // Update volume and play
  sounds.zombieGrowl.setVolume(effectsVolume * 0.6);
  sounds.zombieGrowl.play();
}

// Play zombie attack sound
function playZombieAttackSound() {
  if (!sounds.zombieAttack) {
    console.warn("No zombie attack sound loaded");
    return;
  }

  // Stop the sound if it's already playing
  if (sounds.zombieAttack.isPlaying) {
    sounds.zombieAttack.stop();
  }

  // Update volume and play
  sounds.zombieAttack.setVolume(effectsVolume * 0.8);
  sounds.zombieAttack.play();
}

// Initialize the scene
function init() {
  // Create scene
  scene = new THREE.Scene();

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
  );
  camera.position.set(0, 5, 20);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x87ceeb); // Sky blue background
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Initialize audio system
  initAudio();

  // Initialize pointer lock controls
  initControls();

  // Create weapons
  createGun();
  createMachineGun();

  // Create ground
  createGround();

  // Create sky
  createSky();

  // Add lighting
  addLighting();

  // Add some objects to make the scene more interesting
  addObjects();

  // Load zombie model and start wave system
  loadZombieModel();

  // Add event listeners
  addEventListeners();

  // Initialize radar
  initRadar();

  // Start animation loop
  animate();
}

// Create ground plane
function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(100, 100);
  const groundMaterial = new THREE.MeshLambertMaterial({
    color: 0x4a4a4a,
    side: THREE.DoubleSide,
  });

  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Add a grid helper for better depth perception
  const gridHelper = new THREE.GridHelper(100, 100, 0x606060, 0x404040);
  scene.add(gridHelper);
}

// Create sky dome
function createSky() {
  const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
  const skyMaterial = new THREE.MeshBasicMaterial({
    color: 0x87ceeb,
    side: THREE.BackSide, // Render inside of sphere
  });

  sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);

  // Add gradient effect to sky
  const skyGradient = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x0077be) },
      bottomColor: { value: new THREE.Color(0x87ceeb) },
      offset: { value: 33 },
      exponent: { value: 0.6 },
    },
    vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
    fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `,
    side: THREE.BackSide,
  });

  sky.material = skyGradient;
}

// Add lighting to the scene
function addLighting() {
  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);

  // Directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  directionalLight.castShadow = true;

  // Configure shadow properties
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;

  scene.add(directionalLight);

  // Point light for additional illumination
  const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
  pointLight.position.set(10, 10, 10);
  pointLight.castShadow = true;
  scene.add(pointLight);
}

// Add apocalyptic environment objects to create zombie movie atmosphere
function addObjects() {
  // Create burned/abandoned buildings
  createBurnedBuildings();

  // Create abandoned vehicles
  createAbandonedVehicles();

  // Create graveyard elements
  createGraveyardElements();

  // Create dead trees
  createDeadTrees();

  // Create debris and wreckage
  createDebrisAndWreckage();

  // Create additional urban elements
  createStreetLights();

  // Create barricades and barriers
  createBarricades();

  // Create ruined structures
  createRuinedStructures();

  // Create playground areas
  createPlaygrounds();

  // Create school buildings
  createSchools();

  // Create hospital complexes
  createHospitals();
}

// Create burned and damaged buildings
function createBurnedBuildings() {
  for (let i = 0; i < 2; i++) {
    const buildingGroup = new THREE.Group();

    // Main building structure
    const buildingGeometry = new THREE.BoxGeometry(
      4 + Math.random() * 3,
      3 + Math.random() * 4,
      4 + Math.random() * 3
    );
    const buildingMaterial = new THREE.MeshLambertMaterial({
      color: 0x2a2a2a, // Dark gray/black for burned look
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = building.geometry.parameters.height / 2;
    buildingGroup.add(building);

    // Roof (damaged/collapsed)
    const roofGeometry = new THREE.BoxGeometry(
      buildingGeometry.parameters.width + 0.5,
      0.3,
      buildingGeometry.parameters.depth + 0.5
    );
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = buildingGeometry.parameters.height + 0.15;
    roof.rotation.z = (Math.random() - 0.5) * 0.3; // Slight tilt for damage
    buildingGroup.add(roof);

    // Windows (broken/dark)
    for (let j = 0; j < 3; j++) {
      const windowGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.1);
      const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(
        -1.5 + j * 1.5,
        1 + Math.random() * 1.5,
        buildingGeometry.parameters.depth / 2 + 0.05
      );
      buildingGroup.add(window);
    }

    // Damage/holes in walls
    const holeGeometry = new THREE.BoxGeometry(1, 1.5, 0.2);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.position.set(Math.random() * 2 - 1, 1, 0);
    buildingGroup.add(hole);

    // Add social media advertising text on walls
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1024;
    canvas.height = 512;

    // Set background with border
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.fillStyle = "#000000";
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Configure text style
    ctx.fillStyle = "#00ffcc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add different social media handles for each building
    if (i === 0) {
      // First building: GitHub, LinkedIn, X
      ctx.font = "bold 40px Arial";
      ctx.fillText("FOLLOW ON:", canvas.width / 2, 80);

      ctx.font = "bold 32px Arial";
      ctx.fillText("GitHub: apoorvdarshan", canvas.width / 2, 150);
      ctx.fillText("LinkedIn: apoorvdarshan", canvas.width / 2, 200);
      ctx.fillText("X: @apoorvdarshan", canvas.width / 2, 250);

      ctx.font = "bold 28px Arial";
      ctx.fillText("FOLLOW FOR UPDATES!", canvas.width / 2, 320);
    } else {
      // Second building: YouTube, Instagram
      ctx.font = "bold 40px Arial";
      ctx.fillText("FOLLOW ON:", canvas.width / 2, 100);

      ctx.font = "bold 32px Arial";
      ctx.fillText("YouTube: @apoorvdarshan", canvas.width / 2, 170);
      ctx.fillText("Instagram: @404apoorv", canvas.width / 2, 220);

      ctx.font = "bold 28px Arial";
      ctx.fillText("LIKE & SUBSCRIBE!", canvas.width / 2, 290);
    }

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    // Don't flip Y - keep it as default (true) for proper orientation

    // Create advertising sign material
    const signMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: false,
    });

    // Add advertising sign to building wall
    const signGeometry = new THREE.PlaneGeometry(5, 2.5);
    const sign = new THREE.Mesh(signGeometry, signMaterial);

    // Position the sign clearly on the front wall
    sign.position.set(0, 2.5, buildingGeometry.parameters.depth / 2 + 0.02);

    // Make sure it casts and receives shadows
    sign.castShadow = true;
    sign.receiveShadow = true;

    buildingGroup.add(sign);

    // Position building
    buildingGroup.position.set(
      (Math.random() - 0.5) * 70,
      0,
      (Math.random() - 0.5) * 70
    );
    buildingGroup.rotation.y = Math.random() * Math.PI;

    // Enable shadows
    buildingGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(buildingGroup);
  }
}

// Create abandoned and wrecked vehicles
function createAbandonedVehicles() {
  for (let i = 0; i < 6; i++) {
    const carGroup = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(4, 1.2, 1.8);
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: [0x8b0000, 0x2f4f4f, 0x1a1a1a, 0x654321][
        Math.floor(Math.random() * 4)
      ], // Random rust/dark colors
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    carGroup.add(body);

    // Car roof/cabin
    const cabinGeometry = new THREE.BoxGeometry(2.5, 1, 1.6);
    const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0.5, 1.7, 0);
    carGroup.add(cabin);

    // Wheels (flat/damaged)
    for (let j = 0; j < 4; j++) {
      const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
      const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(j < 2 ? -1.5 : 1.5, 0.2, j % 2 === 0 ? -0.8 : 0.8);
      carGroup.add(wheel);
    }

    // Broken windows
    const windshieldGeometry = new THREE.BoxGeometry(2.2, 0.8, 0.05);
    const windshieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const windshield = new THREE.Mesh(windshieldGeometry, windshieldMaterial);
    windshield.position.set(0.8, 1.5, 0.8);
    windshield.rotation.x = -0.2;
    carGroup.add(windshield);

    // Position car
    carGroup.position.set(
      (Math.random() - 0.5) * 75,
      0,
      (Math.random() - 0.5) * 75
    );
    carGroup.rotation.y = Math.random() * Math.PI * 2;
    carGroup.rotation.z = (Math.random() - 0.5) * 0.2; // Slight tilt

    // Enable shadows
    carGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(carGroup);
  }
}

// Create graveyard elements
function createGraveyardElements() {
  for (let i = 0; i < 8; i++) {
    const tombstoneGroup = new THREE.Group();

    // Tombstone base
    const baseGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.2);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.75;
    tombstoneGroup.add(base);

    // Tombstone top (rounded or cross)
    if (Math.random() > 0.5) {
      // Rounded top
      const topGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 8);
      const topMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
      const top = new THREE.Mesh(topGeometry, topMaterial);
      top.position.y = 1.6;
      top.rotation.x = Math.PI / 2;
      tombstoneGroup.add(top);
    } else {
      // Cross
      const crossV = new THREE.BoxGeometry(0.1, 0.6, 0.1);
      const crossH = new THREE.BoxGeometry(0.4, 0.1, 0.1);
      const crossMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });

      const verticalCross = new THREE.Mesh(crossV, crossMaterial);
      verticalCross.position.y = 1.8;
      tombstoneGroup.add(verticalCross);

      const horizontalCross = new THREE.Mesh(crossH, crossMaterial);
      horizontalCross.position.y = 1.9;
      tombstoneGroup.add(horizontalCross);
    }

    // Small mound of dirt
    const moundGeometry = new THREE.SphereGeometry(1.2, 8, 6);
    const moundMaterial = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const mound = new THREE.Mesh(moundGeometry, moundMaterial);
    mound.position.y = -0.3;
    mound.scale.y = 0.3;
    tombstoneGroup.add(mound);

    // Position tombstone
    tombstoneGroup.position.set(
      (Math.random() - 0.5) * 65,
      0,
      (Math.random() - 0.5) * 65
    );
    tombstoneGroup.rotation.y = Math.random() * Math.PI * 2;
    tombstoneGroup.rotation.z = (Math.random() - 0.5) * 0.1; // Slight lean

    // Enable shadows
    tombstoneGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(tombstoneGroup);
  }
}

// Create dead trees
function createDeadTrees() {
  for (let i = 0; i < 6; i++) {
    const treeGroup = new THREE.Group();

    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(
      0.2,
      0.3,
      3 + Math.random() * 2,
      6
    );
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x2d1b14 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunk.geometry.parameters.height / 2;
    treeGroup.add(trunk);

    // Dead branches
    for (let j = 0; j < 3 + Math.random() * 3; j++) {
      const branchGeometry = new THREE.CylinderGeometry(
        0.05,
        0.1,
        1 + Math.random() * 1.5,
        4
      );
      const branchMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);

      branch.position.set(
        Math.random() * 2 - 1,
        2 + Math.random() * 2,
        Math.random() * 2 - 1
      );
      branch.rotation.z = ((Math.random() - 0.5) * Math.PI) / 2;
      branch.rotation.x = ((Math.random() - 0.5) * Math.PI) / 4;

      treeGroup.add(branch);
    }

    // Position tree
    treeGroup.position.set(
      (Math.random() - 0.5) * 80,
      0,
      (Math.random() - 0.5) * 80
    );

    // Enable shadows
    treeGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(treeGroup);
  }
}

// Create debris and wreckage
function createDebrisAndWreckage() {
  for (let i = 0; i < 6; i++) {
    const debrisGroup = new THREE.Group();

    // Random debris pieces
    for (let j = 0; j < 2 + Math.random() * 3; j++) {
      const debrisGeometry = new THREE.BoxGeometry(
        0.3 + Math.random() * 1.5,
        0.2 + Math.random() * 0.8,
        0.3 + Math.random() * 1.2
      );
      const debrisMaterial = new THREE.MeshLambertMaterial({
        color: [0x2f2f2f, 0x8b4513, 0x1a1a1a, 0x654321][
          Math.floor(Math.random() * 4)
        ],
      });
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);

      debris.position.set(
        (Math.random() - 0.5) * 3,
        debris.geometry.parameters.height / 2,
        (Math.random() - 0.5) * 3
      );
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      debris.castShadow = true;
      debris.receiveShadow = true;
      debrisGroup.add(debris);
    }

    // Position debris cluster
    debrisGroup.position.set(
      (Math.random() - 0.5) * 70,
      0,
      (Math.random() - 0.5) * 70
    );

    scene.add(debrisGroup);
  }
}

// Create broken street lights and lamp posts
function createStreetLights() {
  for (let i = 0; i < 6; i++) {
    const lampGroup = new THREE.Group();

    // Lamp post
    const postGeometry = new THREE.CylinderGeometry(0.1, 0.15, 4, 8);
    const postMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = 2;
    lampGroup.add(post);

    // Lamp head (broken/dark)
    const headGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 4.3;
    head.rotation.x = (Math.random() - 0.5) * 0.4; // Tilted/damaged
    lampGroup.add(head);

    // Some hanging wires
    const wireGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
    const wireMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    wire.position.set(0.3, 3.5, 0);
    wire.rotation.z = 0.3;
    lampGroup.add(wire);

    // Position lamp
    lampGroup.position.set(
      (Math.random() - 0.5) * 75,
      0,
      (Math.random() - 0.5) * 75
    );
    lampGroup.rotation.y = Math.random() * Math.PI * 2;
    lampGroup.rotation.z = (Math.random() - 0.5) * 0.2; // Slight lean

    // Enable shadows
    lampGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(lampGroup);
  }
}

// Create barricades and roadblocks
function createBarricades() {
  for (let i = 0; i < 8; i++) {
    const barrierGroup = new THREE.Group();

    // Main barrier structure
    for (let j = 0; j < 2 + Math.random() * 3; j++) {
      const barrierGeometry = new THREE.BoxGeometry(2, 0.8, 0.3);
      const barrierMaterial = new THREE.MeshLambertMaterial({
        color: [0x8b4513, 0x2f2f2f, 0x654321][Math.floor(Math.random() * 3)],
      });
      const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
      barrier.position.set(j * 2.2, 0.4, 0);
      barrier.rotation.y = (Math.random() - 0.5) * 0.3;
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      barrierGroup.add(barrier);
    }

    // Support posts
    for (let k = 0; k < 3; k++) {
      const postGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
      const postMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.set(k * 2, 0.75, -0.3);
      post.castShadow = true;
      post.receiveShadow = true;
      barrierGroup.add(post);
    }

    // Position barricade
    barrierGroup.position.set(
      (Math.random() - 0.5) * 70,
      0,
      (Math.random() - 0.5) * 70
    );
    barrierGroup.rotation.y = Math.random() * Math.PI * 2;

    scene.add(barrierGroup);
  }
}

// Create ruined structures and walls
function createRuinedStructures() {
  for (let i = 0; i < 10; i++) {
    const ruinGroup = new THREE.Group();

    // Broken wall sections
    for (let j = 0; j < 1 + Math.random() * 3; j++) {
      const wallGeometry = new THREE.BoxGeometry(
        1 + Math.random() * 2,
        1 + Math.random() * 2,
        0.3
      );
      const wallMaterial = new THREE.MeshLambertMaterial({
        color: [0x3e3e3e, 0x2a2a2a, 0x4a4a4a][Math.floor(Math.random() * 3)],
      });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(j * 1.5, wall.geometry.parameters.height / 2, 0);
      wall.rotation.z = (Math.random() - 0.5) * 0.4; // Leaning walls
      wall.castShadow = true;
      wall.receiveShadow = true;
      ruinGroup.add(wall);
    }

    // Rubble pile
    const rubbleGeometry = new THREE.SphereGeometry(1, 6, 4);
    const rubbleMaterial = new THREE.MeshLambertMaterial({ color: 0x2f2f2f });
    const rubble = new THREE.Mesh(rubbleGeometry, rubbleMaterial);
    rubble.position.y = 0.3;
    rubble.scale.set(1, 0.4, 1);
    rubble.castShadow = true;
    rubble.receiveShadow = true;
    ruinGroup.add(rubble);

    // Position ruin
    ruinGroup.position.set(
      (Math.random() - 0.5) * 75,
      0,
      (Math.random() - 0.5) * 75
    );
    ruinGroup.rotation.y = Math.random() * Math.PI * 2;

    scene.add(ruinGroup);
  }
}

// Create abandoned playgrounds
function createPlaygrounds() {
  for (let i = 0; i < 2; i++) {
    const playgroundGroup = new THREE.Group();

    // Swing set
    const swingGroup = new THREE.Group();

    // Swing frame
    const frameGeometry = new THREE.BoxGeometry(0.2, 3, 0.2);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

    const leftPost = new THREE.Mesh(frameGeometry, frameMaterial);
    leftPost.position.set(-2, 1.5, 0);
    swingGroup.add(leftPost);

    const rightPost = new THREE.Mesh(frameGeometry, frameMaterial);
    rightPost.position.set(2, 1.5, 0);
    swingGroup.add(rightPost);

    const topBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 4, 8),
      frameMaterial
    );
    topBar.rotation.z = Math.PI / 2;
    topBar.position.y = 2.8;
    swingGroup.add(topBar);

    // Broken swings
    for (let j = 0; j < 2; j++) {
      const seatGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.4);
      const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
      const seat = new THREE.Mesh(seatGeometry, seatMaterial);
      seat.position.set(-1 + j * 2, 1.2, 0);
      seat.rotation.z = (Math.random() - 0.5) * 0.3; // Tilted/broken
      swingGroup.add(seat);

      // Chain (only one side hanging)
      const chainGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4);
      const chainMaterial = new THREE.MeshLambertMaterial({ color: 0x2c2c2c });
      const chain = new THREE.Mesh(chainGeometry, chainMaterial);
      chain.position.set(-1 + j * 2, 2, 0);
      chain.rotation.z = (Math.random() - 0.5) * 0.2;
      swingGroup.add(chain);
    }

    playgroundGroup.add(swingGroup);

    // Slide (broken)
    const slideGroup = new THREE.Group();
    slideGroup.position.set(6, 0, 0);

    // Slide platform
    const platformGeometry = new THREE.BoxGeometry(2, 0.2, 2);
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 2;
    slideGroup.add(platform);

    // Slide surface (cracked)
    const slideGeometry = new THREE.BoxGeometry(0.8, 0.1, 3);
    const slideMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f4f });
    const slide = new THREE.Mesh(slideGeometry, slideMaterial);
    slide.position.set(0, 1, 1.5);
    slide.rotation.x = -0.5;
    slideGroup.add(slide);

    // Support legs
    for (let k = 0; k < 4; k++) {
      const legGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 6);
      const legMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(k < 2 ? -0.8 : 0.8, 1, k % 2 === 0 ? -0.8 : 0.8);
      slideGroup.add(leg);
    }

    playgroundGroup.add(slideGroup);

    // Seesaw (broken)
    const seesawGroup = new THREE.Group();
    seesawGroup.position.set(-6, 0, 0);

    const seesawPlank = new THREE.BoxGeometry(4, 0.2, 0.4);
    const seesawMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const seesaw = new THREE.Mesh(seesawPlank, seesawMaterial);
    seesaw.position.y = 0.8;
    seesaw.rotation.z = (Math.random() - 0.5) * 0.4; // Tilted
    seesawGroup.add(seesaw);

    const fulcrumGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8);
    const fulcrum = new THREE.Mesh(
      fulcrumGeometry,
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
    );
    fulcrum.position.y = 0.3;
    seesawGroup.add(fulcrum);

    playgroundGroup.add(seesawGroup);

    // Position playground
    playgroundGroup.position.set(
      (Math.random() - 0.5) * 60,
      0,
      (Math.random() - 0.5) * 60
    );
    playgroundGroup.rotation.y = Math.random() * Math.PI * 2;

    // Enable shadows
    playgroundGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(playgroundGroup);
  }
}

// Create school buildings
function createSchools() {
  for (let i = 0; i < 1; i++) {
    const schoolGroup = new THREE.Group();

    // Main school building
    const buildingGeometry = new THREE.BoxGeometry(8, 4, 6);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 }); // School brick color
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 2;
    schoolGroup.add(building);

    // School roof
    const roofGeometry = new THREE.BoxGeometry(8.5, 0.4, 6.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 4.2;
    schoolGroup.add(roof);

    // School windows (many)
    for (let j = 0; j < 6; j++) {
      for (let k = 0; k < 2; k++) {
        const windowGeometry = new THREE.BoxGeometry(0.8, 1, 0.1);
        const windowMaterial = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.7 ? 0x000000 : 0x1a1a3a, // Some broken, some dark
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(-3.5 + j * 1.2, 1.5 + k * 1.5, 3.05);
        schoolGroup.add(window);
      }
    }

    // School entrance
    const doorGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.1);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.25, 3.05);
    schoolGroup.add(door);

    // School sign (fallen)
    const signGeometry = new THREE.BoxGeometry(3, 0.8, 0.1);
    const signMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(2, 0.5, 4);
    sign.rotation.x = Math.PI / 2;
    sign.rotation.z = (Math.random() - 0.5) * 0.5;
    schoolGroup.add(sign);

    // Basketball hoop (broken)
    const hoopGroup = new THREE.Group();
    hoopGroup.position.set(10, 0, 0);

    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8);
    const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 1.75;
    hoopGroup.add(pole);

    const backboardGeometry = new THREE.BoxGeometry(1.5, 1, 0.1);
    const backboardMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
    });
    const backboard = new THREE.Mesh(backboardGeometry, backboardMaterial);
    backboard.position.set(0, 3.2, 0.5);
    backboard.rotation.x = -0.2; // Tilted/damaged
    hoopGroup.add(backboard);

    schoolGroup.add(hoopGroup);

    // Position school
    schoolGroup.position.set(
      (Math.random() - 0.5) * 70,
      0,
      (Math.random() - 0.5) * 70
    );
    schoolGroup.rotation.y = Math.random() * Math.PI * 2;

    // Enable shadows
    schoolGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(schoolGroup);
  }
}

// Create hospital complexes
function createHospitals() {
  for (let i = 0; i < 1; i++) {
    const hospitalGroup = new THREE.Group();

    // Main hospital building (larger)
    const buildingGeometry = new THREE.BoxGeometry(10, 5, 8);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff }); // White hospital
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 2.5;
    hospitalGroup.add(building);

    // Hospital roof
    const roofGeometry = new THREE.BoxGeometry(10.5, 0.3, 8.5);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x2f2f2f });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 5.15;
    hospitalGroup.add(roof);

    // Red cross on building
    const crossV = new THREE.BoxGeometry(0.3, 2, 0.1);
    const crossH = new THREE.BoxGeometry(1.5, 0.3, 0.1);
    const crossMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });

    const verticalCross = new THREE.Mesh(crossV, crossMaterial);
    verticalCross.position.set(0, 3, 4.05);
    hospitalGroup.add(verticalCross);

    const horizontalCross = new THREE.Mesh(crossH, crossMaterial);
    horizontalCross.position.set(0, 3, 4.05);
    hospitalGroup.add(horizontalCross);

    // Hospital windows
    for (let j = 0; j < 8; j++) {
      for (let k = 0; k < 3; k++) {
        const windowGeometry = new THREE.BoxGeometry(0.8, 1, 0.1);
        const windowMaterial = new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x87ceeb : 0x000000, // Some lit, some dark
        });
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(-4 + j * 1, 1 + k * 1.3, 4.05);
        hospitalGroup.add(window);
      }
    }

    // Emergency entrance
    const entranceGeometry = new THREE.BoxGeometry(3, 3, 0.1);
    const entranceMaterial = new THREE.MeshLambertMaterial({ color: 0xff6347 });
    const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
    entrance.position.set(-3, 1.5, 4.05);
    hospitalGroup.add(entrance);

    // Ambulance (abandoned)
    const ambulanceGroup = new THREE.Group();
    ambulanceGroup.position.set(8, 0, -2);

    // Ambulance body
    const ambulanceBody = new THREE.BoxGeometry(3, 1.5, 1.8);
    const ambulanceMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
    });
    const ambBody = new THREE.Mesh(ambulanceBody, ambulanceMaterial);
    ambBody.position.y = 0.75;
    ambulanceGroup.add(ambBody);

    // Ambulance cabin
    const cabinGeometry = new THREE.BoxGeometry(1.5, 1.2, 1.6);
    const cabin = new THREE.Mesh(
      cabinGeometry,
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    cabin.position.set(1.2, 1.8, 0);
    ambulanceGroup.add(cabin);

    // Red cross on ambulance
    const ambCrossV = new THREE.BoxGeometry(0.1, 0.5, 0.05);
    const ambCrossH = new THREE.BoxGeometry(0.3, 0.1, 0.05);

    const ambVerticalCross = new THREE.Mesh(ambCrossV, crossMaterial);
    ambVerticalCross.position.set(-1.5, 1, 0.9);
    ambulanceGroup.add(ambVerticalCross);

    const ambHorizontalCross = new THREE.Mesh(ambCrossH, crossMaterial);
    ambHorizontalCross.position.set(-1.5, 1, 0.9);
    ambulanceGroup.add(ambHorizontalCross);

    // Ambulance wheels
    for (let j = 0; j < 4; j++) {
      const wheelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
      const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(j < 2 ? -0.8 : 1, 0.3, j % 2 === 0 ? -0.7 : 0.7);
      ambulanceGroup.add(wheel);
    }

    hospitalGroup.add(ambulanceGroup);

    // Medical equipment (scattered)
    for (let j = 0; j < 3; j++) {
      const equipGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
      const equipMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
      const equipment = new THREE.Mesh(equipGeometry, equipMaterial);
      equipment.position.set(
        (Math.random() - 0.5) * 10,
        0.4,
        (Math.random() - 0.5) * 8
      );
      equipment.rotation.y = Math.random() * Math.PI;
      equipment.castShadow = true;
      equipment.receiveShadow = true;
      hospitalGroup.add(equipment);
    }

    // Position hospital
    hospitalGroup.position.set(
      (Math.random() - 0.5) * 65,
      0,
      (Math.random() - 0.5) * 65
    );
    hospitalGroup.rotation.y = Math.random() * Math.PI * 2;

    // Enable shadows
    hospitalGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.add(hospitalGroup);
  }
}

// Load zombie model and spawn zombies
function loadZombieModel() {
  console.log("Starting zombie model loading...");

  // For now, let's skip GLTF loading and go straight to placeholder zombies
  // This ensures zombies appear immediately
  console.log("Creating placeholder zombie models...");
  createPlaceholderZombieModel();

  // Initialize all UI elements
  initializeUI();

  // Start wave system instead of spawning all zombies at once
  startWaveSystem();

  // Uncomment below to try loading GLTF models
  /*
  const modelURL = "https://threejs.org/examples/models/gltf/Soldier/Soldier.glb";
  
  loader.load(
    modelURL,
    function (gltf) {
      console.log("GLTF model loaded successfully");
      // Replace existing zombies with GLTF model
      zombies.forEach(zombie => scene.remove(zombie));
      zombies = [];
      zombieModel = gltf.scene;
      spawnZombies();
    },
    function (progress) {
      console.log("Loading progress:", (progress.loaded / progress.total) * 100 + "%");
    },
    function (error) {
      console.log("Error loading GLTF model:", error);
    }
  );
  */
}

// Create a zombie model based on type
function createZombieModel(zombieType) {
  const typeData = ZOMBIE_TYPES[zombieType];
  const zombieGroup = new THREE.Group();

  // Body (using box geometry for better compatibility)
  const bodyGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.3);
  const bodyMaterial = new THREE.MeshLambertMaterial({ color: typeData.color });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.6;
  zombieGroup.add(body);

  // Head
  const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const headMaterial = new THREE.MeshLambertMaterial({
    color: typeData.headColor,
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.4;
  zombieGroup.add(head);

  // Eyes (different colors for different types)
  const eyeGeometry = new THREE.SphereGeometry(0.08, 8, 8);
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: typeData.eyeColor,
    emissive: typeData.eyeColor,
    emissiveIntensity: 0.5,
  });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.1, 1.45, 0.25);
  zombieGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.1, 1.45, 0.25);
  zombieGroup.add(rightEye);

  // Arms
  const armGeometry = new THREE.BoxGeometry(0.15, 0.7, 0.15);
  const armMaterial = new THREE.MeshLambertMaterial({
    color: typeData.headColor,
  });

  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.45, 0.8, 0);
  leftArm.rotation.z = 0.3;
  zombieGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.45, 0.8, 0);
  rightArm.rotation.z = -0.3;
  zombieGroup.add(rightArm);

  // Legs
  const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
  const legMaterial = new THREE.MeshLambertMaterial({ color: typeData.color });

  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.15, -0.4, 0);
  zombieGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.15, -0.4, 0);
  zombieGroup.add(rightLeg);

  // Special features based on zombie type
  if (zombieType === "TANK" || zombieType === "BOSS") {
    // Add armor/spikes for tank and boss
    const armorGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.4);
    const armorMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const armor = new THREE.Mesh(armorGeometry, armorMaterial);
    armor.position.y = 1.0;
    zombieGroup.add(armor);
  }

  if (zombieType === "FAST") {
    // Add running gear for fast zombies
    const helmetGeometry = new THREE.BoxGeometry(0.45, 0.15, 0.45);
    const helmetMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 1.6;
    zombieGroup.add(helmet);
  }

  if (zombieType === "BOSS") {
    // Add crown for boss
    const crownGeometry = new THREE.ConeGeometry(0.3, 0.4, 6);
    const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
    const crown = new THREE.Mesh(crownGeometry, crownMaterial);
    crown.position.y = 1.8;
    zombieGroup.add(crown);
  }

  // Enable shadows
  zombieGroup.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Store zombie type in the model
  zombieGroup.userData.zombieType = zombieType;

  return zombieGroup;
}

// Create placeholder zombie models for all types
function createPlaceholderZombieModel() {
  console.log("Creating placeholder zombie models for all types...");

  // Create base model (normal type)
  zombieModel = createZombieModel("NORMAL");

  console.log("Placeholder zombie models created successfully");
}

// Create an ammo pack model
function createAmmoPack() {
  const ammoPackGroup = new THREE.Group();

  // Main ammo symbol (lightning bolt/battery)
  const symbolGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.05);
  const symbolMaterial = new THREE.MeshLambertMaterial({
    color: 0x00aaff,
    emissive: 0x001144,
    emissiveIntensity: 0.3,
  });

  // Vertical part of lightning bolt
  const symbolVertical = new THREE.Mesh(symbolGeometry, symbolMaterial);
  symbolVertical.position.y = 0.5;
  symbolVertical.rotation.z = 0.2;
  ammoPackGroup.add(symbolVertical);

  // Diagonal part of lightning bolt
  const symbolDiagonal = new THREE.Mesh(symbolGeometry, symbolMaterial);
  symbolDiagonal.rotation.z = Math.PI / 3;
  symbolDiagonal.position.set(0.05, 0.45, 0);
  ammoPackGroup.add(symbolDiagonal);

  // Base/container (dark metallic box)
  const baseGeometry = new THREE.BoxGeometry(0.7, 0.9, 0.7);
  const baseMaterial = new THREE.MeshLambertMaterial({
    color: 0x333333,
    emissive: 0x001122,
    emissiveIntensity: 0.1,
  });

  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.45;
  ammoPackGroup.add(base);

  // Add pulsing glow effect around the pack (blue)
  const glowGeometry = new THREE.SphereGeometry(0.9, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = 0.45;
  ammoPackGroup.add(glow);

  // Enable shadows
  ammoPackGroup.traverse(function (child) {
    if (child.isMesh && child !== glow) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Store glow for animation
  ammoPackGroup.userData.glow = glow;
  ammoPackGroup.userData.creationTime = Date.now();

  return ammoPackGroup;
}

// Create a health pack model
function createHealthPack() {
  const healthPackGroup = new THREE.Group();

  // Main cross (red cross symbol)
  const crossGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
  const crossMaterial = new THREE.MeshLambertMaterial({
    color: 0xff0000,
    emissive: 0x330000,
    emissiveIntensity: 0.3,
  });

  // Horizontal part of cross
  const crossHorizontal = new THREE.Mesh(crossGeometry, crossMaterial);
  crossHorizontal.position.y = 0.5;
  healthPackGroup.add(crossHorizontal);

  // Vertical part of cross
  const crossVertical = new THREE.Mesh(crossGeometry, crossMaterial);
  crossVertical.rotation.z = Math.PI / 2;
  crossVertical.position.y = 0.5;
  healthPackGroup.add(crossVertical);

  // Base/container (white box)
  const baseGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.6);
  const baseMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x111111,
    emissiveIntensity: 0.1,
  });

  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = 0.4;
  healthPackGroup.add(base);

  // Add pulsing glow effect around the pack
  const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
  });

  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = 0.4;
  healthPackGroup.add(glow);

  // Enable shadows
  healthPackGroup.traverse(function (child) {
    if (child.isMesh && child !== glow) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Store glow for animation
  healthPackGroup.userData.glow = glow;
  healthPackGroup.userData.creationTime = Date.now();

  return healthPackGroup;
}

// Spawn an ammo pack at a random location
function spawnAmmoPack() {
  if (ammoPacks.length >= MAX_AMMO_PACKS) {
    return; // Don't spawn if at maximum
  }

  const ammoPack = createAmmoPack();

  // Random position on the map (avoiding zombies and player)
  let x, z;
  let attempts = 0;
  do {
    x = (Math.random() - 0.5) * 50; // Slightly smaller area than zombies
    z = (Math.random() - 0.5) * 50;
    attempts++;
  } while (attempts < 10 && isTooCloseToEntities(x, z, 8)); // 8 unit clearance

  ammoPack.position.set(x, 0, z);
  ammoPack.rotation.y = Math.random() * Math.PI * 2;

  ammoPacks.push(ammoPack);
  scene.add(ammoPack);

  // Update UI
  updateAmmoPackCount();

  console.log(`🔋 Ammo pack spawned at (${x.toFixed(2)}, ${z.toFixed(2)})`);
}

// Spawn a health pack at a random location
function spawnHealthPack() {
  if (healthPacks.length >= MAX_HEALTH_PACKS) {
    return; // Don't spawn if at maximum
  }

  const healthPack = createHealthPack();

  // Random position on the map (avoiding zombies and player)
  let x, z;
  let attempts = 0;
  do {
    x = (Math.random() - 0.5) * 50; // Slightly smaller area than zombies
    z = (Math.random() - 0.5) * 50;
    attempts++;
  } while (attempts < 10 && isTooCloseToEntities(x, z, 8)); // 8 unit clearance

  healthPack.position.set(x, 0, z);
  healthPack.rotation.y = Math.random() * Math.PI * 2;

  healthPacks.push(healthPack);
  scene.add(healthPack);

  // Update UI
  updateHealthPackCount();

  console.log(`💊 Health pack spawned at (${x.toFixed(2)}, ${z.toFixed(2)})`);
}

// Check if position is too close to player or zombies
function isTooCloseToEntities(x, z, minDistance) {
  // Check distance to player
  const playerPos = controls.getObject().position;
  const distToPlayer = Math.sqrt(
    Math.pow(x - playerPos.x, 2) + Math.pow(z - playerPos.z, 2)
  );
  if (distToPlayer < minDistance) return true;

  // Check distance to zombies
  for (const zombie of zombies) {
    if (!zombie) continue;
    const distToZombie = Math.sqrt(
      Math.pow(x - zombie.position.x, 2) + Math.pow(z - zombie.position.z, 2)
    );
    if (distToZombie < minDistance) return true;
  }

  return false;
}

// Update ammo pack spawning
function updateAmmoPackSpawning() {
  const currentTime = Date.now();

  // Spawn ammo packs periodically
  if (currentTime - lastAmmoPackSpawn > AMMO_PACK_SPAWN_INTERVAL) {
    spawnAmmoPack();
    lastAmmoPackSpawn = currentTime;
  }
}

// Update health pack spawning
function updateHealthPackSpawning() {
  const currentTime = Date.now();

  // Spawn health packs periodically
  if (currentTime - lastHealthPackSpawn > HEALTH_PACK_SPAWN_INTERVAL) {
    spawnHealthPack();
    lastHealthPackSpawn = currentTime;
  }
}

// Update ammo pack animations and effects
function updateAmmoPacks() {
  ammoPacks.forEach((ammoPack, index) => {
    if (!ammoPack) return;

    const time = Date.now() * 0.003;

    // Floating animation
    ammoPack.position.y = 0.2 + Math.sin(time + index + 1) * 0.18;

    // Rotation animation
    ammoPack.rotation.y += 0.025;

    // Pulsing glow effect (blue)
    if (ammoPack.userData.glow) {
      const glowIntensity = 0.15 + Math.sin(time * 2.5 + index) * 0.1;
      ammoPack.userData.glow.material.opacity = glowIntensity;

      // Scale pulsing
      const scale = 1 + Math.sin(time * 1.8 + index) * 0.12;
      ammoPack.userData.glow.scale.setScalar(scale);
    }
  });
}

// Update health pack animations and effects
function updateHealthPacks() {
  healthPacks.forEach((healthPack, index) => {
    if (!healthPack) return;

    const time = Date.now() * 0.003;

    // Floating animation
    healthPack.position.y = 0.2 + Math.sin(time + index) * 0.15;

    // Rotation animation
    healthPack.rotation.y += 0.02;

    // Pulsing glow effect
    if (healthPack.userData.glow) {
      const glowIntensity = 0.1 + Math.sin(time * 2 + index) * 0.1;
      healthPack.userData.glow.material.opacity = glowIntensity;

      // Scale pulsing
      const scale = 1 + Math.sin(time * 1.5 + index) * 0.1;
      healthPack.userData.glow.scale.setScalar(scale);
    }
  });
}

// Check collision between player and ammo packs
function checkAmmoPackCollision() {
  if (isGameOver) return;

  const playerPosition = controls.getObject().position;
  const machineGun = WEAPONS.machinegun;

  // Don't collect if machine gun is already at max ammo
  if (machineGun.currentAmmo >= machineGun.maxAmmo) return;

  ammoPacks.forEach((ammoPack, index) => {
    if (!ammoPack) return;

    // Calculate distance between player and ammo pack
    const dx = playerPosition.x - ammoPack.position.x;
    const dz = playerPosition.z - ammoPack.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If player is close enough to collect
    if (distance < 2.0) {
      // 2 unit collection radius
      collectAmmoPack(ammoPack, index);
    }
  });
}

// Check collision between player and health packs
function checkHealthPackCollision() {
  if (isGameOver || playerHealth >= maxHealth) return;

  const playerPosition = controls.getObject().position;

  healthPacks.forEach((healthPack, index) => {
    if (!healthPack) return;

    // Calculate distance between player and health pack
    const dx = playerPosition.x - healthPack.position.x;
    const dz = playerPosition.z - healthPack.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // If player is close enough to collect
    if (distance < 2.0) {
      // 2 unit collection radius
      collectHealthPack(healthPack, index);
    }
  });
}

// Collect an ammo pack
function collectAmmoPack(ammoPack, index) {
  const machineGun = WEAPONS.machinegun;

  // Calculate ammo to add
  const oldAmmo = machineGun.currentAmmo;
  machineGun.currentAmmo = Math.min(
    machineGun.maxAmmo,
    machineGun.currentAmmo + AMMO_PACK_REFILL_AMOUNT
  );
  const actualRefill = machineGun.currentAmmo - oldAmmo;

  // Update weapon display
  updateWeaponDisplay();

  // Create collection effect
  createAmmoPackCollectionEffect(ammoPack.position);

  // Play collection sound
  playAmmoPackSound();

  // Remove ammo pack from scene and array
  scene.remove(ammoPack);
  ammoPacks.splice(index, 1);

  // Update collection count
  ammoPacksCollected++;

  // Update UI
  updateAmmoPackCount();

  console.log(
    `🔋 Ammo pack collected! Refilled ${actualRefill} ammo (${oldAmmo} → ${machineGun.currentAmmo})`
  );

  // Show floating text
  showFloatingText(`+${actualRefill} AMMO`, ammoPack.position, 0x00aaff);
}

// Collect a health pack
function collectHealthPack(healthPack, index) {
  // Heal player
  const oldHealth = playerHealth;
  playerHealth = Math.min(maxHealth, playerHealth + HEALTH_PACK_HEAL_AMOUNT);
  const actualHeal = playerHealth - oldHealth;

  // Update health bar
  updateHealthBar();

  // Create collection effect
  createHealthPackCollectionEffect(healthPack.position);

  // Play collection sound
  playHealthPackSound();

  // Remove health pack from scene and array
  scene.remove(healthPack);
  healthPacks.splice(index, 1);

  // Update collection count
  healthPacksCollected++;

  // Update UI
  updateHealthPackCount();

  console.log(
    `💊 Health pack collected! Healed ${actualHeal} HP (${oldHealth} → ${playerHealth})`
  );

  // Show floating text
  showFloatingText(`+${actualHeal} HP`, healthPack.position, 0x00ff00);
}

// Create visual effect when ammo pack is collected
function createAmmoPackCollectionEffect(position) {
  // Create blue ammo particles
  const particles = [];

  for (let i = 0; i < 12; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.04, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.9,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position at collection location
    particle.position.copy(position);
    particle.position.y += 0.5;

    // Random velocity upward and outward
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        Math.random() * 3.5 + 1, // Upward bias
        (Math.random() - 0.5) * 2.5
      ),
      life: 1.0,
    };

    particles.push(particle);
    scene.add(particle);
  }

  // Animate and remove particles
  const animateParticles = () => {
    particles.forEach((particle, index) => {
      if (!particle.userData) return;

      // Move particle
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(0.025)
      );
      particle.userData.velocity.y -= 0.05; // Gravity

      // Fade out
      particle.userData.life -= 0.025;
      particle.material.opacity = particle.userData.life;

      // Remove when faded
      if (particle.userData.life <= 0) {
        scene.remove(particle);
        particles.splice(index, 1);
      }
    });

    if (particles.length > 0) {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
}

// Create visual effect when health pack is collected
function createHealthPackCollectionEffect(position) {
  // Create green healing particles
  const particles = [];

  for (let i = 0; i < 15; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position at collection location
    particle.position.copy(position);
    particle.position.y += 0.5;

    // Random velocity upward and outward
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 1, // Upward bias
        (Math.random() - 0.5) * 2
      ),
      life: 1.0,
    };

    particles.push(particle);
    scene.add(particle);
  }

  // Animate and remove particles
  const animateParticles = () => {
    particles.forEach((particle, index) => {
      if (!particle.userData) return;

      // Move particle
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(0.02)
      );
      particle.userData.velocity.y -= 0.04; // Gravity

      // Fade out
      particle.userData.life -= 0.02;
      particle.material.opacity = particle.userData.life;

      // Remove when faded
      if (particle.userData.life <= 0) {
        scene.remove(particle);
        particles.splice(index, 1);
      }
    });

    if (particles.length > 0) {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
}

// Show floating text above position
function showFloatingText(text, position, color) {
  // Create temporary div for floating text (simple implementation)
  // In a real game, you'd use a more sophisticated text rendering system
  console.log(
    `Floating text: ${text} at (${position.x.toFixed(1)}, ${position.z.toFixed(
      1
    )})`
  );
}

// Play ammo pack collection sound
function playAmmoPackSound() {
  if (!audioListener) return;

  // Create a distinctive electric/power sound for ammo pack collection
  const audioContext = audioListener.context;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Configure electric power sound
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
  oscillator.frequency.exponentialRampToValueAtTime(
    440,
    audioContext.currentTime + 0.2
  ); // A4
  oscillator.frequency.exponentialRampToValueAtTime(
    330,
    audioContext.currentTime + 0.4
  ); // E4

  // Envelope for electric sound
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(
    effectsVolume * 0.6,
    audioContext.currentTime + 0.05
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.5
  );

  // Connect and play
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Play health pack collection sound
function playHealthPackSound() {
  if (!audioListener) return;

  // Create a pleasant chime sound for health pack collection
  const audioContext = audioListener.context;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  // Configure healing sound
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
  oscillator.frequency.exponentialRampToValueAtTime(
    784,
    audioContext.currentTime + 0.3
  ); // G5

  // Envelope for chime
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(
    effectsVolume * 0.5,
    audioContext.currentTime + 0.1
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.6
  );

  // Connect and play
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.6);
}

// Spawn zombies randomly around the map
function spawnZombies() {
  console.log(`Spawning ${ZOMBIE_COUNT} zombies...`);

  if (!zombieModel) {
    console.error("Zombie model not created yet!");
    return;
  }

  for (let i = 0; i < ZOMBIE_COUNT; i++) {
    const zombie = zombieModel.clone();

    // Random position on the map (avoiding the center where player starts)
    let x, z;
    do {
      x = (Math.random() - 0.5) * 60; // Spread across 60 units (smaller for visibility)
      z = (Math.random() - 0.5) * 60;
    } while (Math.sqrt(x * x + z * z) < 10); // Keep away from player start position

    zombie.position.set(x, 0, z);
    zombie.rotation.y = Math.random() * Math.PI * 2; // Random rotation

    // Scale zombies to make them more visible
    const scale = 1.5 + Math.random() * 0.5; // 1.5 to 2.0 scale (larger)
    zombie.scale.setScalar(scale);

    // Add some properties for zombie behavior
    zombie.userData = {
      walkSpeed: 0.3 + Math.random() * 0.4, // Base walk speed (0.3-0.7)
      rotationSpeed: 0.01 + Math.random() * 0.02,
      wanderDirection: Math.random() * Math.PI * 2,
      wanderTimer: Math.random() * 100,
      attackCooldown: 0,
      isAttacking: false,
      hasAttacked: false, // New: track if zombie has attacked in current cycle
      originalScale: scale, // Store original scale
      attackScaleSet: false,
    };

    zombies.push(zombie);
    scene.add(zombie);

    console.log(
      `Zombie ${i + 1} spawned at position (${x.toFixed(2)}, 0, ${z.toFixed(
        2
      )})`
    );
  }

  // Also add a few test zombies close to the player for immediate visibility
  for (let i = 0; i < 3; i++) {
    const testZombie = zombieModel.clone();
    testZombie.position.set(
      5 + i * 3, // 5, 8, 11 units in front
      0,
      -10 - i * 2 // Spread them out
    );
    testZombie.scale.setScalar(2); // Make them big and obvious
    testZombie.userData = {
      walkSpeed: 0.3,
      rotationSpeed: 0.01,
      wanderDirection: 0,
      wanderTimer: 0,
      attackCooldown: 0,
      isAttacking: false,
      hasAttacked: false,
      originalScale: 2, // Test zombies are scaled to 2
      attackScaleSet: false,
    };
    zombies.push(testZombie);
    scene.add(testZombie);
    console.log(
      `Test zombie ${i + 1} placed at (${testZombie.position.x}, ${
        testZombie.position.y
      }, ${testZombie.position.z})`
    );
  }

  console.log(`Successfully spawned ${ZOMBIE_COUNT + 3} zombies on the map!`);
  console.log("Total zombies in array:", zombies.length);
}

// Wave system functions
function startWaveSystem() {
  console.log("Starting wave system...");
  updateWaveDisplay();
  startWave();
}

function startWave() {
  console.log(`Starting Wave ${currentWave}`);
  waveInProgress = true;
  zombiesThisWave = getZombiesForWave(currentWave);
  zombiesSpawnedThisWave = 0;

  updateWaveDisplay();

  // Start spawning zombies for this wave
  spawnWaveZombies();
}

function getZombiesForWave(waveNumber) {
  // Increase zombie count each wave: Wave 1 = 3, Wave 2 = 5, Wave 3 = 8, etc.
  return Math.floor(2 + waveNumber * 1.5);
}

// Determine which zombie types can spawn in current wave
function getAvailableZombieTypes(waveNumber) {
  const availableTypes = [];

  // Normal zombies always available
  availableTypes.push({
    type: "NORMAL",
    weight: ZOMBIE_TYPES.NORMAL.spawnWeight,
  });

  // Fast zombies from wave 2
  if (waveNumber >= 2) {
    availableTypes.push({
      type: "FAST",
      weight: ZOMBIE_TYPES.FAST.spawnWeight,
    });
  }

  // Tank zombies from wave 4
  if (waveNumber >= 4) {
    availableTypes.push({
      type: "TANK",
      weight: ZOMBIE_TYPES.TANK.spawnWeight,
    });
  }

  // Boss zombies from wave 6 (rare)
  if (waveNumber >= 6) {
    availableTypes.push({
      type: "BOSS",
      weight: ZOMBIE_TYPES.BOSS.spawnWeight,
    });
  }

  return availableTypes;
}

// Select a random zombie type based on spawn weights
function selectZombieType(waveNumber) {
  const availableTypes = getAvailableZombieTypes(waveNumber);

  // Calculate total weight
  const totalWeight = availableTypes.reduce(
    (sum, type) => sum + type.weight,
    0
  );

  // Random selection based on weight
  let random = Math.random() * totalWeight;

  for (const typeInfo of availableTypes) {
    random -= typeInfo.weight;
    if (random <= 0) {
      return typeInfo.type;
    }
  }

  // Fallback to normal
  return "NORMAL";
}

function spawnWaveZombies() {
  if (zombiesSpawnedThisWave >= zombiesThisWave) {
    console.log(
      `All ${zombiesThisWave} zombies spawned for wave ${currentWave}`
    );
    return;
  }

  // Spawn one zombie
  spawnSingleZombie();
  zombiesSpawnedThisWave++;

  // Schedule next zombie spawn (every 1-3 seconds)
  const spawnDelay = 1000 + Math.random() * 2000;
  zombieSpawnTimer = setTimeout(spawnWaveZombies, spawnDelay);
}

function spawnSingleZombie() {
  // Select zombie type based on current wave
  const zombieType = selectZombieType(currentWave);
  const typeData = ZOMBIE_TYPES[zombieType];

  // Create zombie of selected type
  const zombie = createZombieModel(zombieType);

  // Random position on the map (avoiding the center where player starts)
  let x, z;
  do {
    x = (Math.random() - 0.5) * 60;
    z = (Math.random() - 0.5) * 60;
  } while (Math.sqrt(x * x + z * z) < 10);

  zombie.position.set(x, 0, z);
  zombie.rotation.y = Math.random() * Math.PI * 2;

  // Apply type-specific scaling with wave multiplier
  const waveMultiplier = 1 + (currentWave - 1) * 0.05; // Reduced wave scaling
  const baseScale = 1.5 + Math.random() * 0.5;
  const finalScale = baseScale * typeData.scale * waveMultiplier;
  zombie.scale.setScalar(finalScale);

  // Set up zombie data based on type
  zombie.userData = {
    zombieType: zombieType,
    health: typeData.health,
    maxHealth: typeData.health,
    walkSpeed: typeData.speed * (0.8 + Math.random() * 0.4) * waveMultiplier,
    rotationSpeed: 0.01 + Math.random() * 0.02,
    wanderDirection: Math.random() * Math.PI * 2,
    wanderTimer: Math.random() * 100,
    attackCooldown: 0,
    isAttacking: false,
    hasAttacked: false,
    originalScale: finalScale,
    attackScaleSet: false,
    detectRange: typeData.detectRange,
    attackRange: typeData.attackRange,
    chaseRange: typeData.chaseRange,
    attackDamage: typeData.attackDamage,
  };

  zombies.push(zombie);
  scene.add(zombie);

  // Update type count for UI
  zombieTypeCounts[zombieType]++;

  console.log(
    `${typeData.emoji} ${typeData.name} zombie spawned for wave ${currentWave} (${zombiesSpawnedThisWave}/${zombiesThisWave})`
  );
}

function checkWaveComplete() {
  if (!waveInProgress || isGameOver) return;

  // Count living zombies (not dead or falling)
  const livingZombies = zombies.filter(
    (zombie) =>
      zombie.userData && !zombie.userData.isDead && !zombie.userData.isFalling
  ).length;

  if (livingZombies === 0 && zombiesSpawnedThisWave >= zombiesThisWave) {
    completeWave();
  }
}

function completeWave() {
  console.log(`Wave ${currentWave} completed!`);
  waveInProgress = false;
  currentWave++;

  // Clear any remaining spawn timers
  if (zombieSpawnTimer) {
    clearTimeout(zombieSpawnTimer);
    zombieSpawnTimer = null;
  }

  updateWaveDisplay();

  // Start next wave after delay
  console.log(`Next wave starts in ${timeBetweenWaves / 1000} seconds...`);
  nextWaveTimer = setTimeout(() => {
    startWave();
  }, timeBetweenWaves);
}

// Enhanced zombie AI - hunt the player
function updateZombies() {
  if (zombies.length === 0) return;

  const playerPosition = controls.getObject().position;

  zombies.forEach((zombie, index) => {
    if (!zombie || !zombie.userData) return;

    const userData = zombie.userData;

    // Handle falling zombies
    if (userData.isFalling) {
      userData.fallSpeed += 0.02; // Increase fall speed
      zombie.rotation.x += userData.fallSpeed;

      // Stop falling when zombie has rotated 90 degrees
      if (zombie.rotation.x >= Math.PI / 2) {
        zombie.rotation.x = Math.PI / 2;
        userData.isFalling = false;
        userData.isDead = true;
        console.log("Zombie fell down and is now dead");
      }
      return; // Skip normal movement for falling zombies
    }

    // Skip movement if zombie is dead
    if (userData.isDead) return;

    // Calculate distance to player
    const dx = playerPosition.x - zombie.position.x;
    const dz = playerPosition.z - zombie.position.z;
    const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Initialize attack state if not present
    if (userData.attackCooldown === undefined) {
      userData.attackCooldown = 0;
      userData.isAttacking = false;
    }

    // Update attack cooldown
    if (userData.attackCooldown > 0) {
      userData.attackCooldown--;
    }

    // Enhanced pathfinding and behavior system using type-specific ranges
    const detectionRange = userData.detectRange || 60;
    const attackRange = userData.attackRange || 3.5;
    const chaseRange = userData.chaseRange || 8;

    // Determine zombie behavior based on distance to player
    if (distanceToPlayer < detectionRange) {
      // PLAYER DETECTED - Start hunting behavior

      // Play growl sound occasionally when hunting
      if (Math.random() < 0.003) {
        // Slightly more frequent growls
        playZombieGrowlSound();
      }

      // Calculate optimal path to player (basic pathfinding)
      const pathToPlayer = calculatePathToPlayer(
        zombie.position,
        playerPosition
      );

      // Check behavior state based on distance
      if (distanceToPlayer <= attackRange) {
        // ATTACK MODE - Close enough to attack
        executeZombieAttack(zombie, userData, pathToPlayer.direction);
      } else if (distanceToPlayer <= chaseRange) {
        // PREPARE ATTACK MODE - Close but not in attack range
        prepareZombieAttack(zombie, userData, pathToPlayer);
      } else {
        // CHASE MODE - Actively pursue player
        executeZombieChase(zombie, userData, pathToPlayer);
      }
    } else {
      // WANDERING MODE - Player too far away
      executeZombieWander(zombie, userData);
    }

    // Keep zombies within map bounds
    const maxDistance = 45;
    if (zombie.position.x > maxDistance) zombie.position.x = maxDistance;
    if (zombie.position.x < -maxDistance) zombie.position.x = -maxDistance;
    if (zombie.position.z > maxDistance) zombie.position.z = maxDistance;
    if (zombie.position.z < -maxDistance) zombie.position.z = -maxDistance;

    // Enhanced animations are now handled in the behavior functions
    // Just handle attack scaling here
    if (!userData.isDead) {
      if (userData.isAttacking) {
        // Set attack scale only once (don't multiply every frame)
        if (!userData.attackScaleSet) {
          userData.originalScale = zombie.scale.x;
          zombie.scale.setScalar(userData.originalScale * 1.15); // Slightly larger when attacking
          userData.attackScaleSet = true;
        }
      } else {
        // Reset scale when not attacking
        if (userData.attackScaleSet) {
          zombie.scale.setScalar(userData.originalScale || 1);
          userData.attackScaleSet = false;
        }
      }
    }
  });
}

// Basic pathfinding - calculate direct path to player
function calculatePathToPlayer(zombiePos, playerPos) {
  const dx = playerPos.x - zombiePos.x;
  const dz = playerPos.z - zombiePos.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  // Calculate direction
  const direction = Math.atan2(dx, dz);

  // Normalize movement vector
  const normalizedX = distance > 0 ? dx / distance : 0;
  const normalizedZ = distance > 0 ? dz / distance : 0;

  return {
    direction: direction,
    normalizedX: normalizedX,
    normalizedZ: normalizedZ,
    distance: distance,
  };
}

// Execute zombie attack behavior
function executeZombieAttack(zombie, userData, direction) {
  // Stop all movement during attack
  userData.isAttacking = true;

  // Execute attack if cooldown is ready
  if (!userData.hasAttacked && userData.attackCooldown <= 0) {
    userData.attackCooldown = 180; // 3 seconds at 60fps
    userData.hasAttacked = true;

    // Attack animation - lunge forward
    const lungeDistance = 0.8;
    zombie.position.x += Math.sin(direction) * lungeDistance;
    zombie.position.z += Math.cos(direction) * lungeDistance;

    // Create attack effect
    createZombieAttackEffect(zombie.position);

    // Play attack sound
    playZombieAttackSound();

    console.log("Zombie executing attack!");
  }

  // Face the player during attack
  zombie.rotation.y = direction;

  // Reset attack flag when cooldown ends
  if (userData.attackCooldown <= 60) {
    // Last 1 second of cooldown
    userData.hasAttacked = false;
    userData.isAttacking = false;
  }
}

// Prepare for attack - slow down and focus on player
function prepareZombieAttack(zombie, userData, pathToPlayer) {
  userData.isAttacking = false;

  // Move slowly toward player while preparing
  const prepareSpeed = userData.walkSpeed * 0.6; // Slower approach
  const moveDistance = prepareSpeed * 0.016;

  zombie.position.x += pathToPlayer.normalizedX * moveDistance;
  zombie.position.z += pathToPlayer.normalizedZ * moveDistance;

  // Face the player
  zombie.rotation.y = pathToPlayer.direction;

  // Add anticipation animation (more aggressive bobbing)
  const time = Date.now() * 0.008;
  zombie.position.y = Math.sin(time) * 0.25;
}

// Execute aggressive chase behavior
function executeZombieChase(zombie, userData, pathToPlayer) {
  userData.isAttacking = false;

  // Fast aggressive movement toward player
  const chaseSpeed = userData.walkSpeed * 1.5; // Faster when chasing
  const moveDistance = chaseSpeed * 0.016;

  // Move directly toward player using pathfinding
  zombie.position.x += pathToPlayer.normalizedX * moveDistance;
  zombie.position.z += pathToPlayer.normalizedZ * moveDistance;

  // Face movement direction
  zombie.rotation.y = pathToPlayer.direction;

  // Add running animation (faster bobbing)
  const time = Date.now() * 0.006;
  zombie.position.y = Math.sin(time) * 0.3;
}

// Execute wandering behavior when player is far
function executeZombieWander(zombie, userData) {
  userData.isAttacking = false;
  userData.wanderTimer++;

  // Change direction occasionally
  if (userData.wanderTimer > 180 + Math.random() * 120) {
    // More frequent direction changes
    userData.wanderDirection += (Math.random() - 0.5) * 1.0; // Larger direction changes
    userData.wanderTimer = 0;
  }

  // Slow wandering movement
  const wanderSpeed = userData.walkSpeed * 0.3; // Very slow when wandering
  const moveDistance = wanderSpeed * 0.016;

  zombie.position.x += Math.sin(userData.wanderDirection) * moveDistance;
  zombie.position.z += Math.cos(userData.wanderDirection) * moveDistance;

  // Face movement direction
  zombie.rotation.y = userData.wanderDirection;

  // Normal idle animation
  const time = Date.now() * 0.002;
  zombie.position.y = Math.sin(time) * 0.15;
}

// Update gun position to always stay at bottom center of screen
function updateGunPosition() {
  if (!controls.isLocked) return;

  const activeWeapon = currentWeapon === "rifle" ? gun : machineGun;
  if (!activeWeapon) return;

  // Update recoil animation
  updateGunRecoil();

  // Get camera position and direction
  const cameraPosition = controls.getObject().position.clone();
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Calculate gun position relative to camera with recoil offset
  const gunOffset = new THREE.Vector3(
    gunBasePosition.x,
    gunBasePosition.y,
    gunBasePosition.z + gunRecoilOffset // Apply recoil to Z position
  );

  // Apply camera rotation to the offset
  gunOffset.applyQuaternion(camera.quaternion);

  // Position active weapon relative to camera
  activeWeapon.position.copy(cameraPosition).add(gunOffset);
  activeWeapon.rotation.copy(camera.rotation);
  activeWeapon.rotation.x += 0.1; // Slight upward tilt
}

// Update gun recoil animation
function updateGunRecoil() {
  // Apply spring physics for recoil
  const springStrength = 0.2;
  const damping = 0.85;

  // Spring force pulls gun back to original position
  const springForce = -gunRecoilOffset * springStrength;

  // Update velocity and position
  gunRecoilVelocity += springForce;
  gunRecoilVelocity *= damping; // Apply damping
  gunRecoilOffset += gunRecoilVelocity;

  // Stop tiny movements to prevent jitter
  if (
    Math.abs(gunRecoilOffset) < 0.001 &&
    Math.abs(gunRecoilVelocity) < 0.001
  ) {
    gunRecoilOffset = 0;
    gunRecoilVelocity = 0;
  }
}

// Check if player is aiming at a zombie for crosshair targeting
function updateCrosshairTargeting() {
  if (!controls || !controls.isLocked || gameState !== "playing") {
    isAimingAtZombie = false;
    updateCrosshairAppearance();
    return;
  }

  // Get camera position and direction
  const cameraPosition = controls.getObject().position;
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Set up raycaster from camera position in camera direction
  raycaster.set(cameraPosition, cameraDirection);

  // Create array of zombie objects for raycasting
  const zombieObjects = [];
  zombies.forEach((zombie) => {
    if (
      zombie &&
      zombie.userData &&
      !zombie.userData.isDead &&
      !zombie.userData.isFalling
    ) {
      // Add all mesh children of the zombie group to the raycast targets
      zombie.traverse((child) => {
        if (child.isMesh) {
          zombieObjects.push(child);
        }
      });
    }
  });

  // Perform raycast
  const intersects = raycaster.intersectObjects(zombieObjects);

  // Check if we're aiming at a zombie within reasonable range
  const targetingRange = 50; // Maximum targeting range
  const wasAimingAtZombie = isAimingAtZombie;

  isAimingAtZombie =
    intersects.length > 0 && intersects[0].distance <= targetingRange;

  // Update crosshair appearance if targeting state changed
  if (isAimingAtZombie !== wasAimingAtZombie) {
    updateCrosshairAppearance();
  }
}

// Update crosshair visual appearance based on targeting state
function updateCrosshairAppearance() {
  const crosshair = document.getElementById("crosshair");
  if (!crosshair) return;

  if (isAimingAtZombie) {
    crosshair.classList.add("target-lock");
  } else {
    crosshair.classList.remove("target-lock");
  }
}

// Initialize mini radar system
function initRadar() {
  radarCanvas = document.getElementById("radarCanvas");
  if (!radarCanvas) {
    console.warn("Radar canvas not found");
    return;
  }

  radarContext = radarCanvas.getContext("2d");
  console.log("Mini radar initialized");
}

// Update and draw the mini radar
function updateRadar() {
  if (!radarContext || !controls || gameState !== "playing") return;

  // Clear the canvas
  radarContext.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  // Get player position
  const playerPos = controls.getObject().position;
  const centerX = RADAR_SIZE / 2;
  const centerY = RADAR_SIZE / 2;

  // Draw radar grid
  drawRadarGrid();

  // Draw zombies as dots
  drawZombiesOnRadar(playerPos, centerX, centerY);

  // Draw player as center dot
  drawPlayerOnRadar(centerX, centerY);

  // Draw range circles
  drawRadarRangeCircles();
}

// Draw radar background grid
function drawRadarGrid() {
  radarContext.strokeStyle = "rgba(0, 255, 0, 0.2)";
  radarContext.lineWidth = 1;

  // Draw crosshairs
  radarContext.beginPath();
  radarContext.moveTo(RADAR_SIZE / 2, 0);
  radarContext.lineTo(RADAR_SIZE / 2, RADAR_SIZE);
  radarContext.moveTo(0, RADAR_SIZE / 2);
  radarContext.lineTo(RADAR_SIZE, RADAR_SIZE / 2);
  radarContext.stroke();
}

// Draw range circles on radar
function drawRadarRangeCircles() {
  radarContext.strokeStyle = "rgba(0, 255, 0, 0.15)";
  radarContext.lineWidth = 1;

  const centerX = RADAR_SIZE / 2;
  const centerY = RADAR_SIZE / 2;

  // Draw range circles at 25%, 50%, 75% of max range
  for (let i = 1; i <= 3; i++) {
    const radius = (RADAR_SIZE / 2) * (i / 4);
    radarContext.beginPath();
    radarContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
    radarContext.stroke();
  }
}

// Draw player position on radar
function drawPlayerOnRadar(centerX, centerY) {
  // Draw player direction indicator
  if (camera) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    radarContext.strokeStyle = "rgba(0, 255, 255, 0.8)";
    radarContext.lineWidth = 2;
    radarContext.beginPath();
    radarContext.moveTo(centerX, centerY);
    radarContext.lineTo(centerX + direction.x * 15, centerY + direction.z * 15);
    radarContext.stroke();
  }

  // Draw player dot
  radarContext.fillStyle = "rgba(0, 255, 255, 1)";
  radarContext.beginPath();
  radarContext.arc(centerX, centerY, 3, 0, Math.PI * 2);
  radarContext.fill();

  // Draw player outline
  radarContext.strokeStyle = "rgba(255, 255, 255, 0.8)";
  radarContext.lineWidth = 1;
  radarContext.beginPath();
  radarContext.arc(centerX, centerY, 4, 0, Math.PI * 2);
  radarContext.stroke();
}

// Draw zombies on radar
function drawZombiesOnRadar(playerPos, centerX, centerY) {
  zombies.forEach((zombie) => {
    if (
      !zombie ||
      !zombie.userData ||
      zombie.userData.isDead ||
      zombie.userData.isFalling
    ) {
      return;
    }

    // Calculate relative position
    const dx = zombie.position.x - playerPos.x;
    const dz = zombie.position.z - playerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Only show zombies within radar range
    if (distance > RADAR_RANGE) return;

    // Convert world coordinates to radar coordinates
    const scale = RADAR_SIZE / 2 / RADAR_RANGE;
    const radarX = centerX + dx * scale;
    const radarY = centerY + dz * scale;

    // Skip if outside radar circle
    const radarDistance = Math.sqrt(
      (radarX - centerX) ** 2 + (radarY - centerY) ** 2
    );
    if (radarDistance > RADAR_SIZE / 2) return;

    // Determine zombie color based on type and behavior
    let zombieColor = "rgba(255, 0, 0, 0.8)"; // Default red
    let zombieSize = 2;

    if (zombie.userData.zombieType) {
      switch (zombie.userData.zombieType) {
        case "FAST":
          zombieColor = "rgba(255, 165, 0, 0.8)"; // Orange for fast zombies
          zombieSize = 1.5;
          break;
        case "TANK":
          zombieColor = "rgba(255, 0, 255, 0.8)"; // Magenta for tank zombies
          zombieSize = 3;
          break;
        case "BOSS":
          zombieColor = "rgba(255, 255, 0, 0.8)"; // Yellow for boss zombies
          zombieSize = 4;
          break;
        default:
          zombieColor = "rgba(255, 0, 0, 0.8)"; // Red for normal zombies
          zombieSize = 2;
      }
    }

    // Make zombies more visible if they're attacking
    if (distance < 10) {
      zombieSize += 1;
      zombieColor = zombieColor.replace("0.8", "1.0");
    }

    // Draw zombie dot
    radarContext.fillStyle = zombieColor;
    radarContext.beginPath();
    radarContext.arc(radarX, radarY, zombieSize, 0, Math.PI * 2);
    radarContext.fill();

    // Add pulsing effect for very close zombies
    if (distance < 5) {
      const pulseAlpha = 0.3 + 0.3 * Math.sin(Date.now() * 0.01);
      radarContext.fillStyle = zombieColor.replace(
        "0.8",
        pulseAlpha.toString()
      );
      radarContext.beginPath();
      radarContext.arc(radarX, radarY, zombieSize + 2, 0, Math.PI * 2);
      radarContext.fill();
    }
  });
}

// Initialize FPS controls
function initControls() {
  // Create pointer lock controls
  controls = new THREE.PointerLockControls(camera, document.body);

  // Add event listeners for pointer lock
  const blocker = document.getElementById("blocker");
  const instructions = document.getElementById("instructions");

  instructions.addEventListener("click", function () {
    controls.lock();
  });

  controls.addEventListener("lock", function () {
    if (gameState === "playing") {
      instructions.style.display = "none";
      blocker.style.display = "none";
    }
  });

  controls.addEventListener("unlock", function () {
    if (gameState === "playing") {
      blocker.style.display = "block";
      instructions.style.display = "";
    }
  });

  scene.add(controls.getObject());

  // Don't attach gun to camera - we'll position it separately
  // The gun will be positioned as a fixed UI element

  // Add keyboard event listeners
  const onKeyDown = function (event) {
    // Handle ESC key for pause
    if (event.code === "Escape") {
      if (gameState === "playing") {
        pauseGame();
      }
      return;
    }

    // Only handle movement keys when game is active
    if (gameState !== "playing") return;

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;
      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;
      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    // Only handle movement keys when game is active
    if (gameState !== "playing") return;

    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;
      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;
      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Add shooting controls
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("contextmenu", onContextMenu); // Prevent right-click menu
}

// Create a simple gun model that appears at bottom of screen
function createGun() {
  console.log("Creating gun model...");

  gun = new THREE.Group();

  // Main gun body (rectangular block)
  const bodyGeometry = new THREE.BoxGeometry(2.0, 0.6, 0.4);
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(0, 0, 0);
  gun.add(body);

  // Gun barrel (cylinder extending forward)
  const barrelGeometry = new THREE.CylinderGeometry(0.08, 0.12, 1.0, 8);
  const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
  barrel.rotation.z = Math.PI / 2; // Rotate to point forward
  barrel.position.set(1.2, 0.1, 0);
  gun.add(barrel);

  // Gun handle/grip
  const handleGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
  const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(-0.4, -0.6, 0);
  gun.add(handle);

  // Gun stock (back part)
  const stockGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.3);
  const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 }); // Brown wood color
  const stock = new THREE.Mesh(stockGeometry, stockMaterial);
  stock.position.set(-1.0, 0, 0);
  gun.add(stock);

  // Front sight
  const sightGeometry = new THREE.BoxGeometry(0.04, 0.2, 0.04);
  const sightMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
  const sight = new THREE.Mesh(sightGeometry, sightMaterial);
  sight.position.set(1.8, 0.4, 0);
  gun.add(sight);

  // Trigger
  const triggerGeometry = new THREE.BoxGeometry(0.06, 0.16, 0.04);
  const triggerMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
  trigger.position.set(-0.2, -0.2, 0);
  gun.add(trigger);

  // Position gun at bottom center of screen (like user is holding it)
  gun.position.set(gunBasePosition.x, gunBasePosition.y, gunBasePosition.z);
  gun.rotation.set(0.1, 0, 0); // Slight upward angle
  gun.scale.setScalar(0.8);

  // Create muzzle flash light (initially off)
  muzzleFlashLight = new THREE.PointLight(0xffaa00, 0, 10); // Orange light
  muzzleFlashLight.position.set(1.8, 0.1, 0); // At barrel tip
  gun.add(muzzleFlashLight); // Attach to gun so it moves with recoil

  // Add gun directly to scene (not camera)
  scene.add(gun);

  console.log("Gun model created and added to scene");
}

// Create machine gun model with different styling
function createMachineGun() {
  console.log("Creating machine gun model...");

  machineGun = new THREE.Group();

  // Main gun body - larger and more robust
  const bodyGeometry = new THREE.BoxGeometry(2.5, 0.8, 0.6);
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a }); // Darker
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.set(0, 0, 0);
  machineGun.add(body);

  // Heavy barrel - thicker and longer
  const barrelGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1.5, 12);
  const barrelMaterial = new THREE.MeshBasicMaterial({ color: 0x0f0f0f }); // Almost black
  const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(1.5, 0.1, 0);
  machineGun.add(barrel);

  // Barrel cooling vents
  for (let i = 0; i < 6; i++) {
    const ventGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.02);
    const ventMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const vent = new THREE.Mesh(ventGeometry, ventMaterial);
    vent.position.set(1.2 + i * 0.1, 0.25, 0);
    machineGun.add(vent);
  }

  // Bipod legs
  const bipodGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.05);
  const bipodMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });

  const leftBipod = new THREE.Mesh(bipodGeometry, bipodMaterial);
  leftBipod.position.set(0.8, -0.8, -0.3);
  leftBipod.rotation.z = 0.3;
  machineGun.add(leftBipod);

  const rightBipod = new THREE.Mesh(bipodGeometry, bipodMaterial);
  rightBipod.position.set(0.8, -0.8, 0.3);
  rightBipod.rotation.z = -0.3;
  machineGun.add(rightBipod);

  // Ammunition belt/box
  const ammoBoxGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8);
  const ammoBoxMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4a00 }); // Olive drab
  const ammoBox = new THREE.Mesh(ammoBoxGeometry, ammoBoxMaterial);
  ammoBox.position.set(-0.8, 0.3, 0.4);
  machineGun.add(ammoBox);

  // Heavy stock - reinforced
  const stockGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.4);
  const stockMaterial = new THREE.MeshBasicMaterial({ color: 0x2d1b0e }); // Dark brown
  const stock = new THREE.Mesh(stockGeometry, stockMaterial);
  stock.position.set(-1.2, 0, 0);
  machineGun.add(stock);

  // Large front sight
  const sightGeometry = new THREE.BoxGeometry(0.06, 0.25, 0.06);
  const sightMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const sight = new THREE.Mesh(sightGeometry, sightMaterial);
  sight.position.set(2.2, 0.5, 0);
  machineGun.add(sight);

  // Heavy trigger assembly
  const triggerGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.06);
  const triggerMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
  const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
  trigger.position.set(-0.3, -0.3, 0);
  machineGun.add(trigger);

  // Muzzle brake/flash hider
  const muzzleBrakeGeometry = new THREE.CylinderGeometry(0.18, 0.16, 0.3, 8);
  const muzzleBrakeMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const muzzleBrake = new THREE.Mesh(muzzleBrakeGeometry, muzzleBrakeMaterial);
  muzzleBrake.rotation.z = Math.PI / 2;
  muzzleBrake.position.set(2.4, 0.1, 0);
  machineGun.add(muzzleBrake);

  // Position machine gun at same base position as rifle
  machineGun.position.set(
    gunBasePosition.x,
    gunBasePosition.y,
    gunBasePosition.z
  );
  machineGun.rotation.set(0.1, 0, 0);
  machineGun.scale.setScalar(0.7); // Slightly smaller scale to fit

  // Create separate muzzle flash light for machine gun
  const machineGunFlashLight = new THREE.PointLight(0xffaa00, 0, 10);
  machineGunFlashLight.position.set(2.4, 0.1, 0); // At muzzle brake
  machineGun.add(machineGunFlashLight);
  machineGun.userData.muzzleFlashLight = machineGunFlashLight;

  // Enable shadows
  machineGun.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Add to scene but hide initially
  machineGun.visible = false;
  scene.add(machineGun);

  console.log("Machine gun model created and added to scene");
}

// Handle mouse down events
function onMouseDown(event) {
  // Only handle if game is playing, pointer is locked, and game is not over
  if (gameState !== "playing" || !controls.isLocked || isGameOver) return;

  // Prevent default behavior
  event.preventDefault();

  if (event.button === 0) {
    // Left click - shoot
    mouseHeld = true;
    shoot();
  } else if (event.button === 2) {
    // Right click - switch weapon
    switchWeapon();
  }
}

// Handle mouse up events
function onMouseUp(event) {
  if (event.button === 0) {
    // Left click released - stop auto fire
    mouseHeld = false;
    isAutoFiring = false;

    // Stop machine gun sound immediately when mouse is released
    if (
      currentWeapon === "machinegun" &&
      sounds.machinegun &&
      sounds.machinegun.isPlaying
    ) {
      sounds.machinegun.stop();
      console.log("Machine gun sound stopped");
    }
  }
}

// Prevent right-click context menu
function onContextMenu(event) {
  event.preventDefault();
}

// Switch between weapons
function switchWeapon() {
  if (currentWeapon === "rifle") {
    currentWeapon = "machinegun";
    gun.visible = false;
    machineGun.visible = true;
    muzzleFlashLight = machineGun.userData.muzzleFlashLight;
  } else {
    currentWeapon = "rifle";
    gun.visible = true;
    machineGun.visible = false;
    muzzleFlashLight = gun.children.find((child) => child.isLight);
  }

  // Update UI
  updateWeaponDisplay();

  console.log(`Switched to ${WEAPONS[currentWeapon].name}`);
}

// Main shooting function
function shoot() {
  const currentTime = Date.now();
  const weapon = WEAPONS[currentWeapon];

  // Check if weapon has ammo
  if (weapon.currentAmmo <= 0) {
    console.log(`${weapon.name} is out of ammo!`);
    // Stop auto-firing if out of ammo
    isAutoFiring = false;
    mouseHeld = false;
    return;
  }

  if (weapon.fireRate === 0) {
    // Single shot weapon (rifle)
    if (!mouseHeld) return; // Only fire once per click for single shot
    createBullet();
    weapon.currentAmmo--; // Consume ammo
    mouseHeld = false; // Prevent rapid clicking
  } else {
    // Auto-fire weapon (machine gun)
    const timeBetweenShots = 60000 / weapon.fireRate; // Convert RPM to milliseconds

    if (currentTime - lastShotTime >= timeBetweenShots) {
      createBullet();
      weapon.currentAmmo--; // Consume ammo
      lastShotTime = currentTime;

      if (mouseHeld && weapon.currentAmmo > 0) {
        isAutoFiring = true;
      } else {
        isAutoFiring = false;
      }
    }
  }

  // Update weapon display to show new ammo count
  updateWeaponDisplay();
}

// Create and fire a bullet
function createBullet() {
  const bulletGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const bulletMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    emissive: 0xffaa00,
    emissiveIntensity: 0.5,
  });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  // Get camera position and direction
  const cameraPosition = controls.getObject().position.clone();
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Position bullet slightly in front of camera
  bullet.position.copy(cameraPosition);
  bullet.position.add(cameraDirection.clone().multiplyScalar(0.5));

  // Store bullet properties
  bullet.userData = {
    direction: cameraDirection.clone(),
    speed: BULLET_SPEED,
    creationTime: Date.now(),
  };

  bullets.push(bullet);
  scene.add(bullet);

  // Add muzzle flash effect
  createMuzzleFlash();

  // Create muzzle flash light
  createMuzzleFlashLight();

  // Trigger gun recoil
  triggerGunRecoil();

  // Play gunfire sound
  playGunfireSound();

  console.log("Bullet fired!");
}

// Create muzzle flash effect
function createMuzzleFlash() {
  const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    emissive: 0xffaa00,
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.8,
  });
  const flash = new THREE.Mesh(flashGeometry, flashMaterial);

  // Position at gun barrel
  const cameraPosition = controls.getObject().position.clone();
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  flash.position.copy(cameraPosition);
  flash.position.add(cameraDirection.clone().multiplyScalar(0.3));

  scene.add(flash);

  // Remove flash after short duration
  setTimeout(() => {
    scene.remove(flash);
  }, 100);
}

// Create muzzle flash light effect
function createMuzzleFlashLight() {
  if (!muzzleFlashLight) return;

  // Turn on the light with full intensity
  muzzleFlashLight.intensity = 3.0;
  muzzleFlashLight.color.setHex(0xffaa00); // Bright orange

  // Animate the light fading out
  let intensity = 3.0;
  const fadeInterval = setInterval(() => {
    intensity -= 0.3;
    if (intensity <= 0) {
      muzzleFlashLight.intensity = 0;
      clearInterval(fadeInterval);
    } else {
      muzzleFlashLight.intensity = intensity;
      // Slightly randomize color for flicker effect
      const flicker = 0.9 + Math.random() * 0.1;
      muzzleFlashLight.color.setRGB(1.0 * flicker, 0.67 * flicker, 0.0);
    }
  }, 16); // ~60fps
}

// Trigger gun recoil animation
function triggerGunRecoil() {
  // Add backward velocity for recoil based on current weapon
  const weapon = WEAPONS[currentWeapon];
  gunRecoilVelocity += weapon.recoil;
}

// Update bullets
function updateBullets() {
  bullets.forEach((bullet, index) => {
    if (!bullet.userData) return;

    const currentTime = Date.now();
    const userData = bullet.userData;

    // Remove bullets that are too old
    if (currentTime - userData.creationTime > BULLET_LIFETIME) {
      scene.remove(bullet);
      bullets.splice(index, 1);
      return;
    }

    // Move bullet forward
    const moveDistance = userData.speed * 0.016; // 60fps
    bullet.position.add(
      userData.direction.clone().multiplyScalar(moveDistance)
    );

    // Check collision with zombies
    if (checkBulletZombieCollision(bullet)) {
      // Remove the bullet on hit
      scene.remove(bullet);
      bullets.splice(index, 1);
      return;
    }

    // Remove bullets that are too far from origin
    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      bullets.splice(index, 1);
    }
  });
}

// Check collision between bullet and zombies
function checkBulletZombieCollision(bullet) {
  for (let i = 0; i < zombies.length; i++) {
    const zombie = zombies[i];
    if (!zombie) continue;

    // Calculate distance between bullet and zombie
    const distance = bullet.position.distanceTo(zombie.position);

    // If bullet is close enough to zombie (collision)
    if (distance < 1.5) {
      // Collision radius
      console.log("Zombie hit!");
      hitZombie(zombie, i);
      return true; // Collision detected
    }
  }
  return false; // No collision
}

// Handle zombie being hit
function hitZombie(zombie, zombieIndex) {
  // Create hit effect
  createHitEffect(zombie.position);

  // Reduce zombie health
  if (zombie.userData && zombie.userData.health !== undefined) {
    zombie.userData.health--;

    const zombieType = zombie.userData.zombieType || "NORMAL";
    const typeData = ZOMBIE_TYPES[zombieType];

    console.log(
      `${typeData.emoji} ${typeData.name} hit! Health: ${zombie.userData.health}/${zombie.userData.maxHealth}`
    );

    // Check if zombie is dead
    if (zombie.userData.health <= 0) {
      // Make zombie fall or remove it
      if (Math.random() < 0.5) {
        // 50% chance zombie falls down
        makeZombieFall(zombie);
      } else {
        // 50% chance zombie disappears
        removeZombie(zombie, zombieIndex);
      }
    } else {
      // Zombie is wounded but still alive - create smaller hit effect
      createWoundedEffect(zombie.position);
    }
  } else {
    // Fallback for zombies without health system
    if (Math.random() < 0.5) {
      makeZombieFall(zombie);
    } else {
      removeZombie(zombie, zombieIndex);
    }
  }
}

// Create effect for wounded (but not dead) zombies
function createWoundedEffect(position) {
  // Create smaller red effect for wounded zombies
  const particles = [];

  for (let i = 0; i < 3; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa4400,
      transparent: true,
      opacity: 0.6,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position at hit location
    particle.position.copy(position);
    particle.position.y += Math.random() * 0.3;

    // Random velocity
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        Math.random() * 1,
        (Math.random() - 0.5) * 1
      ),
      life: 0.8,
    };

    particles.push(particle);
    scene.add(particle);
  }

  // Animate and remove particles
  const animateParticles = () => {
    particles.forEach((particle, index) => {
      if (!particle.userData) return;

      // Move particle
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(0.015)
      );
      particle.userData.velocity.y -= 0.03; // Gravity

      // Fade out
      particle.userData.life -= 0.025;
      particle.material.opacity = particle.userData.life;

      // Remove when faded
      if (particle.userData.life <= 0) {
        scene.remove(particle);
        particles.splice(index, 1);
      }
    });

    if (particles.length > 0) {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
}

// Create visual effect when zombie is hit
function createHitEffect(position) {
  // Create red explosion effect
  const particles = [];

  for (let i = 0; i < 10; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position at hit location
    particle.position.copy(position);
    particle.position.y += Math.random() * 0.5;

    // Random velocity
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      life: 1.0,
    };

    particles.push(particle);
    scene.add(particle);
  }

  // Animate and remove particles
  const animateParticles = () => {
    particles.forEach((particle, index) => {
      if (!particle.userData) return;

      // Move particle
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(0.02)
      );
      particle.userData.velocity.y -= 0.05; // Gravity

      // Fade out
      particle.userData.life -= 0.02;
      particle.material.opacity = particle.userData.life;

      // Remove when faded
      if (particle.userData.life <= 0) {
        scene.remove(particle);
        particles.splice(index, 1);
      }
    });

    if (particles.length > 0) {
      requestAnimationFrame(animateParticles);
    }
  };

  animateParticles();
}

// Make zombie fall down
function makeZombieFall(zombie) {
  if (!zombie.userData) return;

  zombie.userData.isFalling = true;
  zombie.userData.fallSpeed = 0;
  zombie.userData.originalRotation = zombie.rotation.x;

  console.log("Zombie is falling!");
}

// Remove zombie completely
function removeZombie(zombie, zombieIndex) {
  scene.remove(zombie);
  zombies.splice(zombieIndex, 1);
  zombieKills++;
  updateKillCount();
  console.log(
    "Zombie removed! Zombies remaining:",
    zombies.length,
    "Kills:",
    zombieKills
  );
}

// Update kill count display
function updateKillCount() {
  const infoDiv = document.querySelector(".info");
  let killCountDiv = document.getElementById("killCount");

  if (!killCountDiv) {
    killCountDiv = document.createElement("div");
    killCountDiv.id = "killCount";
    infoDiv.appendChild(killCountDiv);
  }

  killCountDiv.textContent = `💀 Kills: ${zombieKills}`;
}

// Update ammo pack count display
function updateAmmoPackCount() {
  const infoDiv = document.querySelector(".info");
  let ammoPackCountDiv = document.getElementById("ammoPackCount");

  if (!ammoPackCountDiv) {
    ammoPackCountDiv = document.createElement("div");
    ammoPackCountDiv.id = "ammoPackCount";
    infoDiv.appendChild(ammoPackCountDiv);
  }

  ammoPackCountDiv.textContent = `🔋 Ammo Packs: ${ammoPacks.length}/${MAX_AMMO_PACKS} | Collected: ${ammoPacksCollected}`;
}

// Update health pack count display
function updateHealthPackCount() {
  const infoDiv = document.querySelector(".info");
  let healthPackCountDiv = document.getElementById("healthPackCount");

  if (!healthPackCountDiv) {
    healthPackCountDiv = document.createElement("div");
    healthPackCountDiv.id = "healthPackCount";
    infoDiv.appendChild(healthPackCountDiv);
  }

  healthPackCountDiv.textContent = `💊 Health Packs: ${healthPacks.length}/${MAX_HEALTH_PACKS} | Collected: ${healthPacksCollected}`;
}

// Update weapon display
function updateWeaponDisplay() {
  const infoDiv = document.querySelector(".info");
  let weaponDiv = document.getElementById("weaponInfo");

  if (!weaponDiv) {
    weaponDiv = document.createElement("div");
    weaponDiv.id = "weaponInfo";
    infoDiv.appendChild(weaponDiv);
  }

  const weapon = WEAPONS[currentWeapon];
  const fireRateText =
    weapon.fireRate === 0 ? "Single Shot" : `${weapon.fireRate} RPM`;

  // Show ammo count, but don't show for rifle (effectively unlimited)
  const ammoText =
    weapon.maxAmmo < 500 ? ` | 🔋 ${weapon.currentAmmo}/${weapon.maxAmmo}` : "";

  weaponDiv.textContent = `${weapon.emoji} ${weapon.name} | ${fireRateText}${ammoText}`;

  // Change color if ammo is low
  if (weapon.currentAmmo <= 30 && weapon.maxAmmo < 500) {
    weaponDiv.style.color = "#ff4444"; // Red for low ammo
  } else if (weapon.currentAmmo <= 60 && weapon.maxAmmo < 500) {
    weaponDiv.style.color = "#ffaa00"; // Orange for medium ammo
  } else {
    weaponDiv.style.color = ""; // Default color
  }
}

// Update health bar display
function updateHealthBar() {
  const healthFill = document.getElementById("healthFill");
  const healthText = document.getElementById("healthText");

  if (healthFill && healthText) {
    const healthPercentage = (playerHealth / maxHealth) * 100;
    healthFill.style.width = healthPercentage + "%";
    healthText.textContent = `Health: ${playerHealth}/${maxHealth}`;

    // Change health bar color based on health level
    if (healthPercentage <= 25) {
      healthFill.style.background = "#ff0000"; // Red
    } else if (healthPercentage <= 50) {
      healthFill.style.background =
        "linear-gradient(90deg, #ff0000 0%, #ffff00 100%)"; // Red to yellow
    } else {
      healthFill.style.background =
        "linear-gradient(90deg, #ff0000 0%, #ffff00 50%, #00ff00 100%)"; // Full gradient
    }
  }
}

// Check collision between player and zombies
function checkPlayerZombieCollision() {
  if (isGameOver) return;

  const currentTime = Date.now();

  // Skip if still invulnerable from last damage
  if (currentTime - lastDamageTime < damageInvulnerabilityTime) return;

  const playerPosition = controls.getObject().position;

  zombies.forEach((zombie, index) => {
    if (
      !zombie ||
      !zombie.userData ||
      zombie.userData.isDead ||
      zombie.userData.isFalling
    )
      return;

    // Calculate horizontal distance (ignore Y difference)
    const dx = playerPosition.x - zombie.position.x;
    const dz = playerPosition.z - zombie.position.z;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);

    // If zombie is close enough to damage player
    if (horizontalDistance < 3.0) {
      const attackDamage = zombie.userData.attackDamage || 10;
      takeDamage(attackDamage);
      lastDamageTime = currentTime;

      // Create damage effect
      createDamageEffect();

      const zombieType = zombie.userData.zombieType || "NORMAL";
      const typeData = ZOMBIE_TYPES[zombieType];
      console.log(
        `${typeData.emoji} ${typeData.name} dealt ${attackDamage} damage!`
      );

      return; // Only take damage from one zombie per frame
    }
  });
}

// Player takes damage
function takeDamage(amount) {
  if (isGameOver) return;

  playerHealth = Math.max(0, playerHealth - amount);
  updateHealthBar();

  if (playerHealth <= 0) {
    gameOver();
  }
}

// Create visual damage effect
function createDamageEffect() {
  // Flash red screen effect
  const flashDiv = document.createElement("div");
  flashDiv.style.position = "fixed";
  flashDiv.style.top = "0";
  flashDiv.style.left = "0";
  flashDiv.style.width = "100%";
  flashDiv.style.height = "100%";
  flashDiv.style.background = "rgba(255, 0, 0, 0.3)";
  flashDiv.style.pointerEvents = "none";
  flashDiv.style.zIndex = "999";
  document.body.appendChild(flashDiv);

  // Remove flash after short duration
  setTimeout(() => {
    if (flashDiv.parentNode) {
      flashDiv.parentNode.removeChild(flashDiv);
    }
  }, 200);
}

// Create zombie attack effect
function createZombieAttackEffect(position) {
  // Create orange/red swipe effect
  const attackGeometry = new THREE.ConeGeometry(0.5, 1.0, 6);
  const attackMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.7,
  });
  const attackEffect = new THREE.Mesh(attackGeometry, attackMaterial);

  // Position at zombie attack location
  attackEffect.position.copy(position);
  attackEffect.position.y += 1.0; // Raise it up
  attackEffect.rotation.x = Math.PI / 2; // Rotate to be horizontal
  attackEffect.rotation.z = Math.random() * Math.PI * 2; // Random rotation

  scene.add(attackEffect);

  // Animate the attack effect
  let scale = 0.1;
  let opacity = 0.7;

  const animateAttack = () => {
    scale += 0.1;
    opacity -= 0.05;

    attackEffect.scale.setScalar(scale);
    attackEffect.material.opacity = opacity;
    attackEffect.rotation.z += 0.2;

    if (opacity > 0) {
      requestAnimationFrame(animateAttack);
    } else {
      scene.remove(attackEffect);
    }
  };

  animateAttack();

  // Create claw marks particles
  for (let i = 0; i < 5; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0xaa0000,
      transparent: true,
      opacity: 0.8,
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);

    // Position near attack location
    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * 2;
    particle.position.y += 0.5 + Math.random();
    particle.position.z += (Math.random() - 0.5) * 2;

    // Random velocity
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 1.5
      ),
      life: 1.0,
    };

    scene.add(particle);

    // Animate particle
    const animateParticle = () => {
      if (!particle.userData) return;

      // Move particle
      particle.position.add(
        particle.userData.velocity.clone().multiplyScalar(0.03)
      );
      particle.userData.velocity.y -= 0.08; // Gravity

      // Fade out
      particle.userData.life -= 0.03;
      particle.material.opacity = particle.userData.life;

      // Remove when faded
      if (particle.userData.life <= 0) {
        scene.remove(particle);
      } else {
        requestAnimationFrame(animateParticle);
      }
    };

    setTimeout(() => animateParticle(), i * 50); // Stagger particle animations
  }
}

// Note: gameOver() and restartGame() functions are now defined above in the menu system section

// Initialize all UI elements
function initializeUI() {
  console.log("Initializing UI elements...");

  // Initialize health bar
  updateHealthBar();

  // Initialize kill count
  updateKillCount();

  // Initialize health pack count
  updateHealthPackCount();

  // Initialize ammo pack count
  updateAmmoPackCount();

  // Initialize wave display
  updateWaveDisplay();

  // Initialize weapon display
  updateWeaponDisplay();

  console.log("UI elements initialized");
}

// Update wave display
function updateWaveDisplay() {
  const infoDiv = document.querySelector(".info");
  let waveDiv = document.getElementById("waveInfo");

  if (!waveDiv) {
    waveDiv = document.createElement("div");
    waveDiv.id = "waveInfo";
    infoDiv.appendChild(waveDiv);
  }

  if (waveInProgress) {
    const livingZombies = zombies.filter(
      (zombie) =>
        zombie.userData && !zombie.userData.isDead && !zombie.userData.isFalling
    ).length;

    // Count zombies by type and state
    const playerPosition = controls.getObject().position;
    let huntingZombies = 0;
    let chasingZombies = 0;
    let attackingZombies = 0;
    let typeBreakdown = { NORMAL: 0, FAST: 0, TANK: 0, BOSS: 0 };

    zombies.forEach((zombie) => {
      if (
        !zombie ||
        !zombie.userData ||
        zombie.userData.isDead ||
        zombie.userData.isFalling
      )
        return;

      // Count by type
      const zombieType = zombie.userData.zombieType || "NORMAL";
      typeBreakdown[zombieType]++;

      const dx = playerPosition.x - zombie.position.x;
      const dz = playerPosition.z - zombie.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const detectRange = zombie.userData.detectRange || 60;
      const attackRange = zombie.userData.attackRange || 3.5;
      const chaseRange = zombie.userData.chaseRange || 8;

      if (distance < detectRange) {
        // Detection range
        if (distance <= attackRange) {
          // Attack range
          attackingZombies++;
        } else if (distance <= chaseRange) {
          // Chase range
          chasingZombies++;
        } else {
          huntingZombies++;
        }
      }
    });

    let status = `🌊 Wave ${currentWave} | Zombies: ${livingZombies}/${zombiesThisWave}`;

    // Add type breakdown for variety
    const typeInfo = [];
    Object.keys(typeBreakdown).forEach((type) => {
      if (typeBreakdown[type] > 0) {
        const typeData = ZOMBIE_TYPES[type];
        typeInfo.push(`${typeData.emoji}${typeBreakdown[type]}`);
      }
    });

    if (typeInfo.length > 0) {
      status += ` | ${typeInfo.join(" ")}`;
    }

    if (huntingZombies > 0) {
      status += ` | 👁️ Stalking: ${huntingZombies}`;
    }
    if (chasingZombies > 0) {
      status += ` | 🏃 Chasing: ${chasingZombies}`;
    }
    if (attackingZombies > 0) {
      status += ` | ⚔️ Attacking: ${attackingZombies}`;
    }

    waveDiv.textContent = status;
  } else {
    const timeLeft = Math.ceil(
      (timeBetweenWaves - (Date.now() % timeBetweenWaves)) / 1000
    );
    waveDiv.textContent = `🌊 Wave ${currentWave} starting...`;
  }
}

// Add event listeners for other controls
function addEventListeners() {
  // Window resize event
  window.addEventListener("resize", onWindowResize, false);
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Only run game logic if initialized and playing
  if (!gameInitialized) {
    return;
  }

  const time = performance.now();

  // Only handle movement when game is playing
  if (gameState === "playing" && controls.isLocked === true) {
    const delta = (time - prevTime) / 1000;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    // Keep player within game boundaries
    const playerPos = controls.getObject().position;
    const boundary = 45; // Half of the 100x100 ground size minus some padding

    // Clamp X position
    if (playerPos.x > boundary) {
      playerPos.x = boundary;
    } else if (playerPos.x < -boundary) {
      playerPos.x = -boundary;
    }

    // Clamp Z position
    if (playerPos.z > boundary) {
      playerPos.z = boundary;
    } else if (playerPos.z < -boundary) {
      playerPos.z = -boundary;
    }

    // Keep camera above ground
    controls.getObject().position.y = Math.max(
      2,
      controls.getObject().position.y
    );
  }

  prevTime = time;

  // Only run game systems when playing
  if (gameState === "playing" && !isGameOver) {
    // Update zombie behavior
    updateZombies();

    // Check if wave is complete
    checkWaveComplete();

    // Check player-zombie collisions
    checkPlayerZombieCollision();

    // Update health pack system
    updateHealthPackSpawning();
    updateHealthPacks();
    checkHealthPackCollision();

    // Update ammo pack system
    updateAmmoPackSpawning();
    updateAmmoPacks();
    checkAmmoPackCollision();

    // Update wave display
    updateWaveDisplay();

    // Update bullets
    updateBullets();

    // Handle auto-fire for machine gun
    if (isAutoFiring && mouseHeld) {
      shoot();
    }

    // Update gun position to stay at bottom of screen
    updateGunPosition();

    // Update crosshair targeting
    updateCrosshairTargeting();

    // Update mini radar
    updateRadar();
  }

  // Always render animated objects for visual interest
  if (scene && scene.children) {
    scene.children.forEach((child, index) => {
      if (child.geometry && child.geometry.type === "BoxGeometry") {
        child.rotation.x += 0.01;
        child.rotation.y += 0.01;
      }
      if (child.geometry && child.geometry.type === "SphereGeometry") {
        child.position.y = 1.5 + Math.sin(Date.now() * 0.001 + index) * 0.5;
      }
    });
  }

  // Always render the scene if it exists
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Menu System Functions
function showMainMenu() {
  gameState = "mainMenu";
  hideAllMenus();
  document.getElementById("mainMenu").classList.add("active");
  document.getElementById("gameUI").style.display = "none";

  // Exit pointer lock if active
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }

  console.log("Showing main menu");
}

function showInstructions() {
  gameState = "instructions";
  hideAllMenus();
  document.getElementById("instructionsMenu").classList.add("active");
  console.log("Showing instructions");
}

function startGame() {
  gameState = "playing";
  hideAllMenus();
  document.getElementById("gameUI").style.display = "block";

  // Enter fullscreen mode
  enterFullscreen();

  // Initialize game if not already done
  if (!gameInitialized) {
    init();
    gameInitialized = true;
  } else {
    // Reset and restart if already initialized
    resetGameState();
    startWaveSystem();
  }

  console.log("Starting game");
}

// Fullscreen functionality
function enterFullscreen() {
  const element = document.documentElement;

  if (element.requestFullscreen) {
    element.requestFullscreen().catch((err) => {
      console.log("Error attempting to enable fullscreen:", err);
    });
  } else if (element.mozRequestFullScreen) {
    // Firefox
    element.mozRequestFullScreen();
  } else if (element.webkitRequestFullscreen) {
    // Chrome, Safari and Opera
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    // IE/Edge
    element.msRequestFullscreen();
  }
}

function pauseGame() {
  if (gameState !== "playing") return;

  gameState = "paused";
  hideAllMenus();
  document.getElementById("pauseMenu").classList.add("active");

  // Exit pointer lock
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }

  console.log("Game paused");
}

function resumeGame() {
  if (gameState !== "paused") return;

  gameState = "playing";
  hideAllMenus();
  document.getElementById("gameUI").style.display = "block";

  console.log("Game resumed");
}

function quitToMainMenu() {
  // Stop all game timers and reset state
  if (zombieSpawnTimer) {
    clearTimeout(zombieSpawnTimer);
    zombieSpawnTimer = null;
  }
  if (nextWaveTimer) {
    clearTimeout(nextWaveTimer);
    nextWaveTimer = null;
  }

  // Reset all game variables
  resetGameState();

  // Show main menu
  showMainMenu();

  console.log("Quit to main menu");
}

function hideAllMenus() {
  const menus = document.querySelectorAll(".menu-screen");
  menus.forEach((menu) => menu.classList.remove("active"));
}

// Enhanced game over function
function gameOver() {
  isGameOver = true;
  gameState = "gameOver";
  console.log("Game Over!");

  // Stop all timers
  if (zombieSpawnTimer) {
    clearTimeout(zombieSpawnTimer);
    zombieSpawnTimer = null;
  }
  if (nextWaveTimer) {
    clearTimeout(nextWaveTimer);
    nextWaveTimer = null;
  }

  // Update final stats
  document.getElementById("finalWave").textContent = currentWave - 1;
  document.getElementById("finalKills").textContent = zombieKills;
  document.getElementById("finalHealthPacks").textContent =
    healthPacksCollected;
  document.getElementById("finalHealth").textContent = playerHealth;

  // Show game over screen
  hideAllMenus();
  document.getElementById("gameOverScreen").classList.add("active");
  document.getElementById("gameUI").style.display = "none";

  // Exit pointer lock
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

// Enhanced restart function
function restartGame() {
  console.log("Restarting game by reloading the page...");

  // Reload the entire page for a completely fresh start
  window.location.reload();
}

// Reset game state function
function resetGameState() {
  // Reset all game variables
  playerHealth = maxHealth;
  isGameOver = false;
  currentWave = 1;
  zombieKills = 0;
  zombiesThisWave = 0;
  zombiesSpawnedThisWave = 0;
  waveInProgress = false;
  lastDamageTime = 0;

  // Clear all zombies
  zombies.forEach((zombie) => scene.remove(zombie));
  zombies = [];

  // Reset zombie type counts
  zombieTypeCounts = {
    NORMAL: 0,
    FAST: 0,
    TANK: 0,
    BOSS: 0,
  };

  // Clear all bullets
  bullets.forEach((bullet) => scene.remove(bullet));
  bullets = [];

  // Clear all health packs
  healthPacks.forEach((healthPack) => scene.remove(healthPack));
  healthPacks = [];
  healthPacksCollected = 0;
  lastHealthPackSpawn = 0;

  // Clear all ammo packs
  ammoPacks.forEach((ammoPack) => scene.remove(ammoPack));
  ammoPacks = [];
  ammoPacksCollected = 0;
  lastAmmoPackSpawn = 0;

  // Reset player position
  if (controls) {
    controls.getObject().position.set(0, 2, 0);
  }

  // Reset weapon system
  currentWeapon = "rifle";
  isAutoFiring = false;
  mouseHeld = false;
  lastShotTime = 0;
  gunRecoilOffset = 0;
  gunRecoilVelocity = 0;

  // Reset weapon ammo
  WEAPONS.rifle.currentAmmo = WEAPONS.rifle.maxAmmo;
  WEAPONS.machinegun.currentAmmo = WEAPONS.machinegun.maxAmmo;

  // Reset crosshair targeting
  isAimingAtZombie = false;
  updateCrosshairAppearance();

  // Reset weapon visibility
  if (gun) gun.visible = true;
  if (machineGun) machineGun.visible = false;

  // Reset muzzle flash
  if (gun && gun.children.find((child) => child.isLight)) {
    muzzleFlashLight = gun.children.find((child) => child.isLight);
    muzzleFlashLight.intensity = 0;
  }

  // Re-initialize all UI elements
  if (gameInitialized) {
    initializeUI();
  }
}

// Initialize the scene when the page loads
window.addEventListener("load", () => {
  console.log("Page loaded, showing main menu");
  // Start animation loop immediately for any visual effects
  animate();
  // Don't initialize the game immediately, wait for user to click start
});

// Master volume control function
function updateMasterVolume(value) {
  const volume = value / 100;
  musicVolume = volume;
  effectsVolume = volume;
  console.log("Master volume:", volume);

  // Update background music volume if loaded
  if (backgroundMusic && backgroundMusic.setVolume) {
    backgroundMusic.setVolume(musicVolume);
  }

  // Update all sound effect volumes
  updateSoundVolumes();
}

// Make functions globally accessible
window.startGame = startGame;
window.showMainMenu = showMainMenu;
window.showInstructions = showInstructions;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.quitToMainMenu = quitToMainMenu;
window.restartGame = restartGame;
window.updateMasterVolume = updateMasterVolume;
