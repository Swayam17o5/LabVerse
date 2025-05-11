// Constants and colors
const ELEMENTARY_CHARGE = 1.602e-19; // C
const SPEED_OF_LIGHT = 3e8; // m/s
const PLANCK_CONSTANT = 6.626e-34; // J⋅s

const COLORS = {
    primary: 0x9B2928,
    secondary: 0x3498db,
    success: 0x2ecc71,
    warning: 0xf1c40f,
    white: 0xffffff,
    lightGray: 0xf8f9fa,
    darkGray: 0x2c3e50,
    metallic: 0x95a5a6
};

// LED properties with realistic colors
const leds = {
    red: { wavelength: 650e-9, color: 0x9B2928, threshold: 1.9, emissiveIntensity: 2.0 },
    yellow: { wavelength: 590e-9, color: 0xffff00, threshold: 2.1, emissiveIntensity: 1.8 },
    green: { wavelength: 530e-9, color: 0x00ff00, threshold: 2.3, emissiveIntensity: 1.5 },
    blue: { wavelength: 470e-9, color: 0x0000ff, threshold: 2.5, emissiveIntensity: 1.2 }
};

// Animation parameters
const ANIMATION = {
    electronSpeed: 0.01,        // Slower for better visibility
    glowIntensity: 0.5,
    particleCount: 200,         // Increased number of electrons
    pulseFrequency: 0.05,
    rotationSpeed: 0.005,
    floatAmplitude: 0.1,
    floatFrequency: 0.02,
    electronGlowIntensity: 0.8,
    electronTrailLength: 0.2,
    electronSpacing: 0.05       // Space between electrons
};

// Simulation state
let currentLED = 'red';
let voltage = 0;
let isRunning = false;
let current = 0;
let time = 0;
let electrons = [];
let glowEffect;

// Three.js variables
let scene, camera, renderer, controls;
let circuit = {
    battery: null,
    led: null,
    wires: [],
    voltmeter: null,
    ammeter: null
};

// Add electron animation parameters
const ELECTRON_COUNT = 200;
const ELECTRON_SPEED_BASE = 0.02;
let electronSpeed = ELECTRON_SPEED_BASE;

// Create circuit path for electron animation
function createCircuitPath() {
    const path = new THREE.CurvePath();
    
    // Battery positive to voltmeter (top wire with more detail)
    path.add(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.3, 1.25, 0),    // Battery positive terminal
        new THREE.Vector3(-6.3, 1.5, 0),     // Up from terminal
        new THREE.Vector3(-6.3, 2.0, 0),     // Continue up
        new THREE.Vector3(-6.3, 2.5, 0),     // Further up
        new THREE.Vector3(-6.3, 3.0, 0),     // More up
        new THREE.Vector3(-6.3, 3.5, 0),     // Final height
        new THREE.Vector3(-5.5, 3.5, 0),     // Start horizontal
        new THREE.Vector3(-4.5, 3.5, 0),     // Continue horizontal
        new THREE.Vector3(-3.5, 3.5, 0),     // More horizontal
        new THREE.Vector3(-2.5, 3.5, 0),     // Approach voltmeter
        new THREE.Vector3(-2.0, 3.5, 0),     // Near voltmeter
        new THREE.Vector3(-1.5, 3.5, 0)      // Voltmeter left terminal
    ], false, 'catmullrom', 0.3));

    // Through voltmeter with detailed path
    path.add(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.5, 3.5, 0),     // Voltmeter left terminal
        new THREE.Vector3(-1.0, 3.5, 0),     // Inside voltmeter left
        new THREE.Vector3(-0.5, 3.5, 0),     // Voltmeter center left
        new THREE.Vector3(0.0, 3.5, 0),      // Voltmeter center
        new THREE.Vector3(0.5, 3.5, 0),      // Voltmeter center right
        new THREE.Vector3(1.0, 3.5, 0),      // Inside voltmeter right
        new THREE.Vector3(1.5, 3.5, 0)       // Voltmeter right terminal
    ], false, 'catmullrom', 0.3));

    // Voltmeter to LED positive leg
    path.add(new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.5, 3.5, 0),      // From voltmeter right
        new THREE.Vector3(2.0, 3.5, 0),      // Start horizontal
        new THREE.Vector3(2.5, 3.5, 0),      // Continue horizontal
        new THREE.Vector3(3.0, 3.5, 0),      // End horizontal
        new THREE.Vector3(3.0, 3.2, 0),      // Start down
        new THREE.Vector3(3.0, 2.8, 0),      // Continue down
        new THREE.Vector3(3.0, 2.5, 0),      // Further down
        new THREE.Vector3(2.5, 2.5, 0),      // Turn towards LED
        new THREE.Vector3(2.0, 2.5, 0),      // Approach LED
        new THREE.Vector3(1.5, 2.5, 0),      // Near LED
        new THREE.Vector3(1.0, 2.5, 0),      // Closer to LED
        new THREE.Vector3(0.5, 2.5, 0),      // Almost at LED
        new THREE.Vector3(-0.4, 1.7, 0)      // LED positive leg - straight connection
    ], false, 'catmullrom', 0.3));

    // LED negative leg to ammeter
    path.add(new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.8, 1.7, 0),     // From LED negative leg - straight connection
        new THREE.Vector3(-0.8, -0.5, 0),    // Straight down
        new THREE.Vector3(0.5, -0.5, 0),     // Start towards ammeter
        new THREE.Vector3(1.0, -0.5, 0),     // Continue towards ammeter
        new THREE.Vector3(1.5, -0.5, 0),     // Approach ammeter
        new THREE.Vector3(2.0, -0.5, 0),     // Near ammeter
        new THREE.Vector3(2.5, -0.5, 0),     // Almost at ammeter
        new THREE.Vector3(3.0, -0.5, 0)      // Ammeter top terminal
    ], false, 'catmullrom', 0.3));

    // Through ammeter with detailed path
    path.add(new THREE.CatmullRomCurve3([
        new THREE.Vector3(3.0, -0.5, 0),     // Ammeter top terminal
        new THREE.Vector3(3.0, -0.7, 0),     // Upper ammeter
        new THREE.Vector3(3.0, -0.9, 0),     // Upper middle ammeter
        new THREE.Vector3(3.0, -1.1, 0),     // Middle ammeter
        new THREE.Vector3(3.0, -1.3, 0),     // Lower middle ammeter
        new THREE.Vector3(3.0, -1.5, 0)      // Ammeter bottom terminal
    ], false, 'catmullrom', 0.3));

    // Ammeter to battery negative (bottom wire with more detail)
    path.add(new THREE.CatmullRomCurve3([
        new THREE.Vector3(3.0, -1.5, 0),     // From ammeter bottom
        new THREE.Vector3(2.5, -1.5, 0),     // Start horizontal
        new THREE.Vector3(2.0, -1.5, 0),     // Continue horizontal
        new THREE.Vector3(1.5, -1.5, 0),     // More horizontal
        new THREE.Vector3(1.0, -1.5, 0),     // Continue more
        new THREE.Vector3(0.5, -1.5, 0),     // Further horizontal
        new THREE.Vector3(0.0, -1.5, 0),     // Middle point
        new THREE.Vector3(-0.5, -1.5, 0),    // Continue left
        new THREE.Vector3(-1.0, -1.5, 0),    // More left
        new THREE.Vector3(-2.0, -1.5, 0),    // Further left
        new THREE.Vector3(-3.0, -1.5, 0),    // Continue more left
        new THREE.Vector3(-4.0, -1.5, 0),    // Approaching battery
        new THREE.Vector3(-5.0, -1.5, 0),    // Near battery
        new THREE.Vector3(-6.0, -1.5, 0),    // Almost at battery
        new THREE.Vector3(-6.3, -1.5, 0),    // At battery level
        new THREE.Vector3(-6.3, -1.25, 0),   // Battery negative terminal
        new THREE.Vector3(-6.3, -1.0, 0),    // Start up along battery
        new THREE.Vector3(-6.3, -0.5, 0),    // Continue up
        new THREE.Vector3(-6.3, 0.0, 0),     // Middle battery
        new THREE.Vector3(-6.3, 0.5, 0),     // Upper middle battery
        new THREE.Vector3(-6.3, 1.0, 0),     // Near top battery
        new THREE.Vector3(-6.3, 1.25, 0)     // Back to battery positive terminal
    ], false, 'catmullrom', 0.3));
    
    return path;
}

// Electron animation parameters
const ELECTRON_PARAMS = {
    size: 0.06,                    // Reduced size for thinner appearance
    trailLength: 15,              // Shorter trail
    count: 120,                   // Adjusted count
    baseSpeed: 0.0003,            // Keep same speed
    glowIntensity: 2.5,           // Adjusted glow
    trailOpacity: 0.7,            // Slightly reduced trail opacity
    spacing: 1 / 120,             // Adjusted spacing
    heightOffset: 0.15            // Reduced height offset
};

function createElectron() {
    // Create electron core with reduced size
    const geometry = new THREE.SphereGeometry(ELECTRON_PARAMS.size, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: ELECTRON_PARAMS.glowIntensity,
        transparent: true,
        opacity: 0.8
    });
    const electron = new THREE.Mesh(geometry, material);
    
    // Thinner glow effect
    const glowGeometry = new THREE.SphereGeometry(ELECTRON_PARAMS.size * 1.8, 16, 16);
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: ELECTRON_PARAMS.glowIntensity * 0.6,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    electron.add(glow);

    // Thinner trail
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(ELECTRON_PARAMS.trailLength * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: ELECTRON_PARAMS.trailOpacity,
        blending: THREE.AdditiveBlending,
        linewidth: 1
    });

    const trail = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trail);
    electron.trail = trail;
    
    return electron;
}

function initElectrons() {
    // Clear existing electrons
    electrons.forEach(e => {
        scene.remove(e);
        scene.remove(e.trail);
    });
    electrons = [];

    const circuitPath = createCircuitPath();

    // Create electrons with improved spacing
    for (let i = 0; i < ELECTRON_PARAMS.count; i++) {
        const electron = createElectron();
        const progress = i * ELECTRON_PARAMS.spacing;
        const position = circuitPath.getPoint(progress);
        electron.position.copy(position);
        electron.userData = {
            progress: progress,
            trailPoints: Array(ELECTRON_PARAMS.trailLength).fill().map(() => position.clone())
        };
        scene.add(electron);
        electrons.push(electron);
    }
}

function updateElectrons() {
    if (!isRunning || voltage <= 0) {
        electrons.forEach(electron => {
            electron.visible = false;
            electron.trail.visible = false;
        });
        return;
    }

    const circuitPath = createCircuitPath();
    const speed = voltage * ELECTRON_PARAMS.baseSpeed;

    electrons.forEach(electron => {
        electron.visible = true;
        electron.trail.visible = true;

        // Update progress with voltage-dependent speed
        electron.userData.progress = (electron.userData.progress + speed * (voltage / 3)) % 1;
        
        // Get new position with interpolation and height offset
        const newPos = circuitPath.getPoint(electron.userData.progress);
        // Add height offset to make electrons visible above the wire
        newPos.z += ELECTRON_PARAMS.heightOffset;
        electron.position.copy(newPos);

        // Update glow intensity based on voltage
        const intensityFactor = Math.min(voltage / 3, 1) * 2.5; // Increased intensity
        electron.material.emissiveIntensity = ELECTRON_PARAMS.glowIntensity * intensityFactor;
        electron.children[0].material.emissiveIntensity = ELECTRON_PARAMS.glowIntensity * 0.7 * intensityFactor;
        
        // Update trail with enhanced visibility
        electron.userData.trailPoints.shift();
        const trailPos = newPos.clone();
        electron.userData.trailPoints.push(trailPos);
        
        const positions = electron.trail.geometry.attributes.position.array;
        electron.userData.trailPoints.forEach((point, index) => {
            positions[index * 3] = point.x;
            positions[index * 3 + 1] = point.y;
            positions[index * 3 + 2] = point.z;
        });
        electron.trail.geometry.attributes.position.needsUpdate = true;
        
        // Make trail fade based on position in array
        const trailIntensity = ELECTRON_PARAMS.trailOpacity * intensityFactor;
        electron.trail.material.opacity = trailIntensity;
    });
}

// Create floating animation
function createFloatingAnimation(object, offsetY = 0) {
    const initialY = object.position.y;
    return {
        update: (time) => {
            object.position.y = initialY + Math.sin(time * ANIMATION.floatFrequency + offsetY) * ANIMATION.floatAmplitude;
        }
    };
}

// Create pulse animation
function createPulseAnimation(object, baseScale = 1) {
    return {
        update: (time) => {
            const scale = baseScale + Math.sin(time * ANIMATION.pulseFrequency) * 0.05;
            object.scale.set(scale, scale, scale);
        }
    };
}

// Create rotation animation
function createRotationAnimation(object, axis = 'y') {
    return {
        update: () => {
            object.rotation[axis] += ANIMATION.rotationSpeed;
        }
    };
}

let animations = [];

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Setup container with proper sizing
    const container = document.getElementById('simulator-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create camera with adjusted position for left view
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(-4, 8, 12); // Shifted left by changing x from 0 to -4
    camera.lookAt(-2, 0, 0); // Adjusted lookAt point to match new camera position

    // Create renderer with proper sizing
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ensure canvas fills container exactly
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    // Add point lights for better component visibility
    const pointLight1 = new THREE.PointLight(0xffffff, 0.5);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5);
    pointLight2.position.set(-5, 5, -5);
    scene.add(pointLight2);

    // Create circuit components
    createCircuit();
    createComponentLabels();
    createBackgroundElements();

    // Setup controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.target.set(-2, 0, 0); // Match camera lookAt point
    controls.update();
    
    // Initialize electrons
    initElectrons();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

// Create component labels
function createComponentLabels() {
    // Remove any existing labels
    scene.children.forEach(child => {
        if (child.isSprite) {
            scene.remove(child);
        }
    });

    // Create labels with proper positioning
    const batteryLabel = createDetailedLabel('Battery (6V)', 2);
    batteryLabel.position.set(-7, 1.5, 0);
    scene.add(batteryLabel);

    const ledLabel = createDetailedLabel('LED', 1.5);
    ledLabel.position.set(-1.6, 2.5, 0);
    scene.add(ledLabel);

    const voltmeterLabel = createDetailedLabel('Voltmeter', 1.5);
    voltmeterLabel.position.set(0, 4.5, 0);
    scene.add(voltmeterLabel);

    const ammeterLabel = createDetailedLabel('Ammeter', 1.5);
    ammeterLabel.position.set(3, -2.5, 0);
    scene.add(ammeterLabel);
}

// Update label positions based on camera
function updateLabelPositions() {
    const labels = document.querySelectorAll('.component-label');
    labels.forEach(label => {
        const position = label.userData;
        const vector = position.clone();
        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        // Only show label if it's in front of the camera
        if (vector.z < 1) {
            label.style.display = 'block';
            label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        } else {
            label.style.display = 'none';
        }
    });
}

function createDetailedLabel(text, size = 1) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;  // Increased from 256
    canvas.height = 128;  // Increased from 64
    
    // Draw background
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    context.strokeStyle = '#9B2928';
    context.lineWidth = 4;  // Increased from 2
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Draw text with larger font
    context.font = 'bold 48px Arial';  // Increased from 24px
    context.fillStyle = '#2c3e50';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size * 1.5, size * 0.4, 1);  // Increased scale factors
    
    return sprite;
}

// Create glow effect
function createGlowEffect() {
    const spriteMaterial = new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABYSURBVChTY2RgYPgPxAwMjAwgAiLACMIgAUaQBAiDJEACYAAWgACQHAiAJEEApgDGBwGwBAgfxAYLgABIEMwGCYAwXAGIDRMAARQFIAxSAGMjKwBxGBkZAalqCwz9tPkKAAAAAElFTkSuQmCC'),
        color: leds[currentLED].color,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    glowEffect = new THREE.Sprite(spriteMaterial);
    glowEffect.scale.set(2, 2, 1);
    glowEffect.position.copy(circuit.led.position);
    glowEffect.material.opacity = 0;
    scene.add(glowEffect);
}

// Update LED glow effect
function updateGlowEffect() {
    if (!glowEffect) return;
    
    const timeOffset = Date.now() * 0.001;
    const secondaryGlow = glowEffect.userData.secondaryGlow;
    
    if (isRunning && voltage >= leds[currentLED].threshold) {
        const baseIntensity = (voltage - leds[currentLED].threshold) * ANIMATION.glowIntensity;
        const pulseIntensity = Math.sin(timeOffset * 2) * 0.1;
        const finalIntensity = Math.min(baseIntensity + pulseIntensity, 1);
        
        // Update LED color based on selected LED
        const ledColor = new THREE.Color(leds[currentLED].color);
        
        // Update main glow
        glowEffect.material.color.copy(ledColor);
        glowEffect.material.opacity = finalIntensity;
        const scale = 1 + finalIntensity * 0.5;
        glowEffect.scale.set(scale, scale, scale * 0.5);
        
        // Update secondary glow with same color
        secondaryGlow.material.color.copy(ledColor);
        secondaryGlow.material.opacity = finalIntensity * 0.5;
        const secondaryScale = 1.2 + finalIntensity * 0.7;
        secondaryGlow.scale.set(secondaryScale, secondaryScale, secondaryScale * 0.6);
        
        // Update LED material with selected color
        circuit.led.children.forEach(child => {
            if (child instanceof THREE.Mesh) {
                if (child.material.emissive) {
                    child.material.color.copy(ledColor);
                    child.material.emissive.copy(ledColor);
                    child.material.emissiveIntensity = finalIntensity * leds[currentLED].emissiveIntensity;
                }
            }
        });
    } else {
        // Smooth fade out
        glowEffect.material.opacity *= 0.95;
        glowEffect.scale.setScalar(1);
        
        secondaryGlow.material.opacity *= 0.95;
        secondaryGlow.scale.setScalar(1.2);
        
        // Fade out LED emission
        circuit.led.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material.emissive) {
                child.material.emissiveIntensity *= 0.95;
            }
        });
    }
}

// Create circuit components with improved wire connections
function createCircuit() {
    // Create detailed battery with terminals and markings
    const batteryGroup = new THREE.Group();
    
    // Main battery body with texture
    const batteryGeometry = new THREE.CylinderGeometry(0.8, 0.8, 2.5, 32);
    const batteryTexture = createBatteryTexture();
    const batteryMaterial = new THREE.MeshPhysicalMaterial({ 
        color: COLORS.metallic,
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        map: batteryTexture
    });
    const batteryBody = new THREE.Mesh(batteryGeometry, batteryMaterial);
    batteryBody.rotation.x = Math.PI / 2;
    
    // Battery terminals with details - adjusted positions and sizes
    const terminalGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16);
    const terminalMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xC0C0C0,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1.0
    });
    
    // Positive terminal
    const posTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    posTerminal.position.set(-1.25, 0, 0);
    posTerminal.rotation.x = Math.PI / 2;
    
    // Add positive terminal marking
    const posMarking = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16),
        new THREE.MeshPhysicalMaterial({ color: 0xff0000 })
    );
    posMarking.position.set(-1.25, 0.23, 0);
    
    // Negative terminal
    const negTerminal = new THREE.Mesh(terminalGeometry.clone(), terminalMaterial);
    negTerminal.position.set(1.25, 0, 0);
    negTerminal.rotation.x = Math.PI / 2;
    
    // Add negative terminal marking
    const negMarking = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16),
        new THREE.MeshPhysicalMaterial({ color: 0x000000 })
    );
    negMarking.position.set(1.25, 0.23, 0);
    
    batteryGroup.add(batteryBody, posTerminal, negTerminal, posMarking, negMarking);
    batteryGroup.position.set(-6.3, 0, 0);
    batteryGroup.rotation.z = Math.PI / 2;
    batteryGroup.castShadow = true;
    batteryGroup.receiveShadow = true;
    circuit.battery = batteryGroup;
    scene.add(batteryGroup);

    // Create detailed LED with internal structure
    const ledGroup = new THREE.Group();
    
    // LED base with texture
    const ledBaseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.4, 32);
    const ledBaseColor = new THREE.Color(leds[currentLED].color);
    ledBaseColor.multiplyScalar(0.7);
    const ledBaseMaterial = new THREE.MeshPhysicalMaterial({
        color: ledBaseColor,
        metalness: 0.5,
        roughness: 0.5,
        clearcoat: 0.3
    });
    const ledBase = new THREE.Mesh(ledBaseGeometry, ledBaseMaterial);
    
    // LED internal structure (semiconductor layers)
    const internalGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 32);
    const pLayerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff9999,
        metalness: 0.3,
        roughness: 0.7
    });
    const nLayerMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x9999ff,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const pLayer = new THREE.Mesh(internalGeometry, pLayerMaterial);
    pLayer.position.y = 0.05;
    const nLayer = new THREE.Mesh(internalGeometry, nLayerMaterial);
    nLayer.position.y = -0.05;
    
    // LED dome with improved transparency
    const ledDomeGeometry = new THREE.SphereGeometry(0.4, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const ledMaterial = new THREE.MeshPhysicalMaterial({
        color: leds[currentLED].color,
        emissive: leds[currentLED].color,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        roughness: 0.2,
        metalness: 0.3,
        transmission: 0.5
    });
    const ledDome = new THREE.Mesh(ledDomeGeometry, ledMaterial);
    ledDome.position.y = 0.2;
    
    // LED legs with better detail and proper length
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        metalness: 0.8,
        roughness: 0.2
    });
    const leg1 = new THREE.Mesh(legGeometry, legMaterial);
    leg1.position.set(0.2, -0.4, 0);
    const leg2 = new THREE.Mesh(legGeometry, legMaterial);
    leg2.position.set(-0.2, -0.4, 0);
    
    // Add leg connectors with better positioning
    const connectorGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
    const connector1 = new THREE.Mesh(connectorGeometry, legMaterial);
    connector1.position.set(0.2, -0.2, 0);
    const connector2 = new THREE.Mesh(connectorGeometry, legMaterial);
    connector2.position.set(-0.2, -0.2, 0);
    
    ledGroup.add(ledBase, pLayer, nLayer, ledDome, leg1, leg2, connector1, connector2);
    ledGroup.position.set(-1.6, 1.2, 0); // Shifted LED left and down
    ledGroup.rotation.x = Math.PI; // Rotate 180 degrees around x-axis
    ledGroup.rotation.z = Math.PI / 2; // Rotate sideways
    circuit.led = ledGroup;
    scene.add(ledGroup);

    // Create detailed wires with proper connections
    const wireGroup = new THREE.Group();
    
    // Use the same path as electrons for wire creation
    const circuitPath = createCircuitPath();
    const points = [];
    
    // Sample points along the path for wire geometry
    for (let t = 0; t <= 1; t += 0.01) {
        points.push(circuitPath.getPoint(t));
    }
    
    // Create wire path using the same coordinates
    const wirePath = new THREE.CatmullRomCurve3(points);

    // Create insulation layer with improved material
    const insulationGeometry = new THREE.TubeGeometry(wirePath, 200, 0.15, 16, false);
    const insulationMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        metalness: 0.1,
        roughness: 0.9,
        clearcoat: 0.5
    });
    const insulation = new THREE.Mesh(insulationGeometry, insulationMaterial);
    
    // Create core wire with improved material
    const wireGeometry = new THREE.TubeGeometry(wirePath, 200, 0.1, 16, false);
    const wireMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.metallic,
        metalness: 0.9,
        roughness: 0.1
    });
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    
    wireGroup.add(insulation, wire);
    scene.add(wireGroup);

    // Create detailed meters with digital displays
    const meterGroup = new THREE.Group();
    
    // Create voltmeter and ammeter
    const voltmeterBody = createDetailedMeter('Voltmeter', 'V');
    voltmeterBody.position.set(0, 3, 0);
    meterGroup.add(voltmeterBody);
    circuit.voltmeter = voltmeterBody;
    
    // Position ammeter parallel to wire
    const ammeterBody = createDetailedMeter('Ammeter', 'A');
    ammeterBody.position.set(3, -0.5, 0.5); // Adjusted height above wire
    ammeterBody.scale.set(0.8, 0.8, 0.8); // Keep the same scale
    meterGroup.add(ammeterBody);
    circuit.ammeter = ammeterBody;

    // Add ammeter probe connectors with vertical orientation
    const probeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    const probeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xC0C0C0,
        metalness: 0.8,
        roughness: 0.2
    });

    // Positive probe (red)
    const posProbe = new THREE.Mesh(probeGeometry, probeMaterial);
    posProbe.position.set(3, -0.3, 0.25);
    const posProbeMarker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8),
        new THREE.MeshPhysicalMaterial({ color: 0xff0000 })
    );
    posProbeMarker.position.set(3, -0.3, 0.5);
    
    // Negative probe (black)
    const negProbe = new THREE.Mesh(probeGeometry, probeMaterial);
    negProbe.position.set(3, -0.7, 0.25);
    const negProbeMarker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8),
        new THREE.MeshPhysicalMaterial({ color: 0x000000 })
    );
    negProbeMarker.position.set(3, -0.7, 0.5);

    meterGroup.add(posProbe, posProbeMarker, negProbe, negProbeMarker);
    
    scene.add(meterGroup);

    // Create electron particles with enhanced effects
    initElectrons();
    createEnhancedGlowEffect();
}

// Create battery texture
function createBatteryTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;
    
    // Fill background
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add battery markings
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6V DC', canvas.width/2, canvas.height/2);
    
    // Add warning text
    ctx.font = '30px Arial';
    ctx.fillText('WARNING: DO NOT OPEN', canvas.width/2, canvas.height/4);
    
    // Add stripes
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 5;
    for(let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Create detailed meter
function createDetailedMeter(name, unit) {
    const meterGroup = new THREE.Group();
    
    // Create meter body
    const bodyGeometry = new THREE.BoxGeometry(2, 1.2, 0.5);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        metalness: 0.7,
        roughness: 0.3,
        clearcoat: 1.0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    
    // Create display screen
    const screenGeometry = new THREE.PlaneGeometry(1.6, 0.8);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    
    const screenMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.251;
    
    // Store canvas context and texture in userData for updates
    screen.userData = {
        canvas: canvas,
        context: context,
        texture: texture,
        name: name,
        unit: unit
    };
    
    // Create decorative elements
    const trimGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
    const trimMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x666666,
        metalness: 0.8,
        roughness: 0.2
    });
    const topTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    topTrim.position.y = 0.65;
    const bottomTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    bottomTrim.position.y = -0.65;
    
    meterGroup.add(body, screen, topTrim, bottomTrim);
    return meterGroup;
}

// Update digital display with enhanced visuals
function updateDigitalDisplay(meter, value) {
    const display = meter.children[1]; // The screen is the second child
    const { canvas, context, texture, name, unit } = display.userData;
    
    // Clear canvas with dark background
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw LCD-style background
    context.fillStyle = '#0a1a0a';
    context.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Add LCD segments effect
    context.fillStyle = '#0f3f0f';
    for(let i = 15; i < canvas.height - 15; i += 2) {
        context.fillRect(15, i, canvas.width - 30, 1);
    }
    
    // Draw meter name with enhanced visibility
    context.font = 'bold 24px "Courier New"';
    context.fillStyle = '#00ff00';
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.shadowColor = '#00ff00';
    context.shadowBlur = 15;
    context.fillText(name, 20, 15);
    
    // Format the value based on the meter type
    let displayValue;
    if (name === 'Voltmeter') {
        displayValue = value.toFixed(2) + ' ' + unit;
        // Update HTML display
        document.getElementById('voltmeter-display').textContent = `Voltage: ${value.toFixed(2)} V`;
    } else {
        // For Ammeter, convert to mA and ensure positive value
        const currentInMA = Math.abs(value * 1000);
        displayValue = currentInMA.toFixed(2) + ' m' + unit;
        // Update HTML display
        document.getElementById('ammeter-display').textContent = `Current: ${currentInMA.toFixed(2)} mA`;
    }
    
    // Draw value with enhanced LCD-style font
    context.font = 'bold 48px "Courier New"';
    context.fillStyle = '#00ff00';
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.shadowColor = '#00ff00';
    context.shadowBlur = 20;
    context.fillText(displayValue, canvas.width - 20, canvas.height/2 + 10);
    
    // Add bright glow for active display
    context.fillStyle = 'rgba(0, 255, 0, 0.15)';
    context.fillRect(15, 15, canvas.width - 30, canvas.height - 30);
    
    // Add reflection effect
    const reflectionGradient = context.createLinearGradient(0, 15, 0, 45);
    reflectionGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    reflectionGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = reflectionGradient;
    context.fillRect(15, 15, canvas.width - 30, 30);
    
    // Force texture update
    texture.needsUpdate = true;
}

// Create enhanced electron glow effect
function createEnhancedGlowEffect() {
    // Main glow sphere
    const glowGeometry = new THREE.SphereGeometry(0.6, 32, 32);
    const glowMaterial = new THREE.MeshPhysicalMaterial({
        color: leds[currentLED].color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    
    glowEffect = new THREE.Mesh(glowGeometry, glowMaterial);
    glowEffect.position.copy(circuit.led.position);
    glowEffect.position.z += 0.2; // Offset to front of LED
    glowEffect.scale.set(1, 1, 0.5);
    
    // Add secondary glow for enhanced effect
    const secondaryGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32),
        new THREE.MeshPhysicalMaterial({
            color: leds[currentLED].color,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        })
    );
    secondaryGlow.position.copy(circuit.led.position);
    secondaryGlow.position.z += 0.2; // Offset to front of LED
    secondaryGlow.scale.set(1.2, 1.2, 0.6);
    
    scene.add(glowEffect, secondaryGlow);
    glowEffect.userData.secondaryGlow = secondaryGlow;
}

// Update the animation loop to include label position updates
function animate() {
    try {
        requestAnimationFrame(animate);
        
        if (controls) {
            controls.update();
        }

        // Update all animations
        animations.forEach(animation => animation.update(Date.now()));

        // Update LED emission
        if (isRunning && voltage >= leds[currentLED].threshold) {
            const targetIntensity = (voltage - leds[currentLED].threshold) * leds[currentLED].emissiveIntensity;
            circuit.led.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.emissiveIntensity += (targetIntensity - child.material.emissiveIntensity) * 0.1;
                }
            });
        } else {
            circuit.led.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.emissiveIntensity *= 0.9;
                }
            });
        }

        // Update electrons
        updateElectrons();
        updateGlowEffect();
        
        // Update label positions
        updateLabelPositions();

        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Animation error:', error);
    }
}

// Update measurements with enhanced display
function updateMeasurements() {
    if (isRunning) {
        // Calculate current based on voltage and LED threshold
        const threshold = leds[currentLED].threshold;
        if (voltage >= threshold) {
            // Exponential current increase after threshold with smoother transition
            current = Math.exp((voltage - threshold) * 1.5) * 0.1;
            current = Math.min(current, 10); // Limit to 10mA
        } else {
            current = 0;
        }

        // Update display values with animation
        const voltageDisplay = document.getElementById('voltage-value');
        const currentVoltage = parseFloat(voltageDisplay.textContent);
        const voltageStep = (voltage - currentVoltage) * 0.1;
        voltageDisplay.textContent = (currentVoltage + voltageStep).toFixed(1) + ' V';
        
        // Update 3D meter displays with enhanced visuals
        if (circuit.voltmeter && circuit.ammeter) {
            updateDigitalDisplay(circuit.voltmeter, voltage);
            updateDigitalDisplay(circuit.ammeter, current);
        }
        
        // Update HTML displays with animation
        const voltmeterDisplay = document.getElementById('voltmeter-display');
        const ammeterDisplay = document.getElementById('ammeter-display');
        
        voltmeterDisplay.textContent = `Voltage: ${voltage.toFixed(2)} V`;
        ammeterDisplay.textContent = `Current: ${(current * 1000).toFixed(2)} mA`;
        
        // Add visual feedback for changes
        voltmeterDisplay.style.textShadow = '0 0 5px #00ff00';
        ammeterDisplay.style.textShadow = '0 0 5px #00ff00';
        
        setTimeout(() => {
            voltmeterDisplay.style.textShadow = 'none';
            ammeterDisplay.style.textShadow = 'none';
        }, 200);
    } else {
        // Show zero readings when not running
        if (circuit.voltmeter && circuit.ammeter) {
            updateDigitalDisplay(circuit.voltmeter, 0);
            updateDigitalDisplay(circuit.ammeter, 0);
        }
    }
}

// Handle window resize with proper aspect ratio
function onWindowResize() {
    const container = document.getElementById('simulator-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1);
    
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
}

// Function to update control states
function updateControlStates(enabled) {
    const ledSelect = document.getElementById('led-select');
    const voltageSlider = document.getElementById('voltage');
    const addObservationBtn = document.getElementById('add-observation');
    const controlGroups = document.querySelectorAll('.control-group');

    ledSelect.disabled = !enabled;
    voltageSlider.disabled = !enabled;
    
    controlGroups.forEach(group => {
        if (enabled) {
            group.classList.remove('disabled');
        } else {
            group.classList.add('disabled');
        }
    });

    if (enabled) {
        addObservationBtn.classList.remove('disabled');
    } else {
        addObservationBtn.classList.add('disabled');
    }
}

// Setup event listeners
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);

    // Initially disable controls
    updateControlStates(false);

    // LED selection
    document.getElementById('led-select').addEventListener('change', (e) => {
        if (!isRunning) return;
        currentLED = e.target.value;
        if (circuit.led) {
            // Update LED and glow colors immediately
            const ledColor = new THREE.Color(leds[currentLED].color);
            
            // Update LED materials
            circuit.led.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.color.copy(ledColor);
                    if (child.material.emissive) {
                        child.material.emissive.copy(ledColor);
                    }
                }
            });
            
            // Update glow effects
            if (glowEffect) {
                glowEffect.material.color.copy(ledColor);
                glowEffect.userData.secondaryGlow.material.color.copy(ledColor);
            }
        }
        updateCurrent();
    });

    // Update slider gradient
    function updateSliderGradient(slider) {
        const value = (slider.value - slider.min) / (slider.max - slider.min) * 100;
        slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${value}%, #e0e0e0 ${value}%, #e0e0e0 100%)`;
    }

    // Voltage slider
    document.getElementById('voltage').addEventListener('input', (e) => {
        if (!isRunning) return;
        voltage = parseFloat(e.target.value);
        updateCurrent();
    });

    document.getElementById('voltage').addEventListener('mousedown', () => {
        document.getElementById('voltage').style.cursor = 'grabbing';
    });

    document.getElementById('voltage').addEventListener('mouseup', () => {
        document.getElementById('voltage').style.cursor = 'grab';
    });

    document.getElementById('voltage').addEventListener('mouseleave', () => {
        document.getElementById('voltage').style.cursor = 'grab';
    });

    // Start/Stop button
    document.getElementById('start-stop-button').addEventListener('click', () => {
        isRunning = !isRunning;
        const button = document.getElementById('start-stop-button');
        
        if (isRunning) {
            button.innerHTML = '<i class="fas fa-pause"></i> Pause Experiment';
            button.style.backgroundColor = '#e74c3c';
            updateControlStates(true);
        } else {
            button.innerHTML = '<i class="fas fa-play"></i> Start Experiment';
            button.style.backgroundColor = '#3498db';
            current = 0;
            updateMeasurements();
            updateControlStates(false);
        }
    });

    // Reset button
    document.getElementById('reset-button').addEventListener('click', () => {
        isRunning = false;
    voltage = 0;
        current = 0;
        document.getElementById('voltage').value = '0';
        document.getElementById('voltmeter-display').textContent = 'Voltage: 0.00 V';
        document.getElementById('ammeter-display').textContent = 'Current: 0.00 mA';
        document.getElementById('start-stop-button').innerHTML = '<i class="fas fa-play"></i> Start Experiment';
        document.getElementById('start-stop-button').style.backgroundColor = '#9B2928'; // Keep it red
        document.getElementById('observation-data').innerHTML = '';
        updateBarrierVoltageTable();
        updateControlStates(false);
    });

    // Add observation button
    document.getElementById('add-observation').addEventListener('click', (e) => {
        if (!isRunning) {
            e.preventDefault();
            return;
        }
        addObservation();
    });

    // Calculate Planck's constant button
    document.getElementById('calculate-planck').addEventListener('click', calculatePlanckConstant);
}

// Add new observation
function addObservation() {
    if (!isRunning) {
        alert('Please start the experiment first!');
        return;
    }

    const tbody = document.getElementById('observation-data');
    
    // Get current counts for each LED color
    const ledCounts = {
        'red': 0,
        'yellow': 0,
        'green': 0,
        'blue': 0
    };
    
    // Count existing observations for each LED
    const rows = tbody.getElementsByTagName('tr');
    for (const row of rows) {
        const cells = row.getElementsByTagName('td');
        if (cells[1].textContent) ledCounts.red++;
        if (cells[3].textContent) ledCounts.yellow++;
        if (cells[5].textContent) ledCounts.green++;
        if (cells[7].textContent) ledCounts.blue++;
    }
    
    // Get the count for current LED
    const currentCount = ledCounts[currentLED];
    
    if (currentCount >= 12) {
        alert(`Maximum number of observations reached for ${currentLED} LED!`);
        return;
    }

    // Create new row if needed or find existing row
    let tr;
    if (currentCount < rows.length) {
        tr = rows[currentCount];
    } else {
        tr = document.createElement('tr');
        tbody.appendChild(tr);
        // Fill with empty cells
        for (let i = 0; i < 9; i++) {
            const td = document.createElement('td');
            if (i === 0) td.textContent = `${currentCount + 1}.`;
            tr.appendChild(td);
        }
    }

    // Update cells for current LED
    const cells = tr.getElementsByTagName('td');
    const ledIndex = {
        'red': 1,
        'yellow': 3,
        'green': 5,
        'blue': 7
    }[currentLED];
    
    if (ledIndex !== undefined) {
        cells[0].textContent = `${currentCount + 1}.`; // Update row number
        cells[ledIndex].textContent = voltage.toFixed(2);
        cells[ledIndex + 1].textContent = (current * 1000).toFixed(2); // Show current in mA
    }
    
    updateBarrierVoltageTable();
}

// Update barrier voltage table
function updateBarrierVoltageTable() {
    const barrierTable = document.getElementById('barrier-voltage');
    const rows = barrierTable.getElementsByTagName('tr');
    
    // Calculate average barrier voltage for each LED color
    const ledData = {
        'red': { wavelength: 6950e-10, values: [] },
        'yellow': { wavelength: 5900e-10, values: [] },
        'green': { wavelength: 5700e-10, values: [] },
        'blue': { wavelength: 4700e-10, values: [] }
    };

    // Collect all voltage readings
    const observationRows = document.getElementById('observation-data').getElementsByTagName('tr');
    for (const row of observationRows) {
        const cells = row.getElementsByTagName('td');
        if (cells[1].textContent && parseFloat(cells[1].textContent) > 0) {
            ledData.red.values.push(parseFloat(cells[1].textContent));
        }
        if (cells[3].textContent && parseFloat(cells[3].textContent) > 0) {
            ledData.yellow.values.push(parseFloat(cells[3].textContent));
        }
        if (cells[5].textContent && parseFloat(cells[5].textContent) > 0) {
            ledData.green.values.push(parseFloat(cells[5].textContent));
        }
        if (cells[7].textContent && parseFloat(cells[7].textContent) > 0) {
            ledData.blue.values.push(parseFloat(cells[7].textContent));
        }
    }

    // Update barrier voltage table with calculated values
    let rowIndex = 1;
    for (const [color, data] of Object.entries(ledData)) {
        if (data.values.length > 0) {
            const barrierVoltage = Math.min(...data.values); // Use minimum voltage as barrier voltage
            const wavelengthInMeters = data.wavelength;
            const inverseWavelength = 1 / wavelengthInMeters;
            
            const row = rows[rowIndex];
            const cells = row.getElementsByTagName('td');
            cells[3].textContent = wavelengthInMeters.toExponential(3);
            cells[4].textContent = barrierVoltage.toFixed(2);
            cells[5].textContent = inverseWavelength.toExponential(3);
        }
        rowIndex++;
    }
}

// Calculate Planck's constant
function calculatePlanckConstant() {
    const barrierTable = document.getElementById('barrier-voltage');
    const rows = barrierTable.getElementsByTagName('tr');
    let validPoints = 0;
    let sumH = 0;

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        const barrierVoltage = parseFloat(cells[4].textContent);
        
        // Convert wavelength from Angstroms to meters
        const wavelengthAngstrom = parseFloat(cells[2].textContent);
        const wavelength = wavelengthAngstrom * 1e-10; // Convert Å to meters
        
        if (!isNaN(barrierVoltage) && !isNaN(wavelength) && barrierVoltage > 0) {
            const h = (ELEMENTARY_CHARGE * barrierVoltage * wavelength) / SPEED_OF_LIGHT;
            sumH += h;
            validPoints++;
        }
    }

    if (validPoints < 2) {
    document.getElementById('planck-result').innerHTML = `
            <div class="error-message">
                <p>Please add observations for at least two different LEDs.</p>
                
            </div>`;
        return;
    }

    const averageH = sumH / validPoints;
    
    document.getElementById('planck-result').innerHTML = `
        <div class="final-results">
            <p><strong>Calculated Planck's Constant:</strong> h = ${averageH.toExponential(3)} J⋅s</p>
        </div>`;
}

// Update current calculation
function updateCurrent() {
    const led = leds[currentLED];
    if (voltage > led.threshold) {
        // Improved exponential model for LED current
        const excessVoltage = voltage - led.threshold;
        current = 0.001 * Math.exp(3 * excessVoltage);
        // Limit maximum current to 50mA
        current = Math.min(current, 0.05);
    } else {
        current = 0;
    }
    
    // Update displays immediately
    if (circuit.voltmeter && circuit.ammeter) {
        updateDigitalDisplay(circuit.voltmeter, voltage);
        updateDigitalDisplay(circuit.ammeter, current);
    }
}

// Add this function after createCircuit()
function createBackgroundElements() {
    // Create a grid with improved visibility
    const gridSize = 40;
    const gridDivisions = 40;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x444444, 0x666666); // Darker colors for better contrast
    gridHelper.position.y = -2; // Raised position
    gridHelper.material.opacity = 0.8; // More opaque
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Add a subtle ground plane with gradient
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf0f0f0,
        metalness: 0.1,
        roughness: 0.8,
        clearcoat: 0.1,
        clearcoatRoughness: 0.4,
        transparent: true,
        opacity: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.01; // Raised to match grid
    ground.receiveShadow = true;
    scene.add(ground);
}

// Initialize the simulator
window.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
    updateControlStates(false); // Initially disable controls
    
    // Set initial slider gradient
    const slider = document.getElementById('voltage');
    updateSliderGradient(slider);
});