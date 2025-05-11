// Global variables
let scene, camera, renderer, controls;
let burette, flask, solution, stand, clamp, stirrer;
let droplets = [];
let isPouring = false;
let stirringSpeed = 0;
let currentVolume = 0;
let experimentRunning = false;
let solutionLevel = 0;
let resultDisplay = null;

// Experiment specific variables
let caco3Added = false;
let indicatorAdded = false;
let agno3_concentration = 0.025; // Fixed 0.025N AgNO3
let sample_volume = 10; // Fixed 10ml water sample
let chloride_eq_weight = 35.5; // Equivalent weight of chloride

// Constants
const DROP_RATE = 0.05;
const MAX_VOLUME = 50;
const STIR_SPEEDS = [0, 60, 120, 180]; // RPM options
const MAX_SOLUTION_LEVEL = 4.5;

// Initialize observation table
const observationTable = document.getElementById('observationTable').getElementsByTagName('tbody')[0];

let observations = [];
let currentObservation = {
    pilot: { initial: 0, final: 0, difference: 0 },
    reading1: { initial: 0, final: 0, difference: 0 },
    reading2: { initial: 0, final: 0, difference: 0 },
    reading3: { initial: 0, final: 0, difference: 0 },
    constant: 0
};

let crucible, coalSample, oven, thermometer, desiccator, analyticalBalance;
let isHeating = false;
let heatingProgress = 0;
let currentTemp = 25;
let currentWeight = 0;
let particleSystem;
let experimentStep = 0; // Track experiment progress

// Initialize Three.js scene
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Improved camera settings
    const aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(40, aspectRatio, 0.1, 1000);
    camera.position.set(0, 20, 25);
    camera.lookAt(0, 5, 0);

    // Enhanced renderer settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });
    
    // Set renderer size to match experiment canvas
    const container = document.getElementById('chemSimulator');
    const width = container.clientWidth;
    const height = container.clientHeight || width * 0.75; // 4:3 aspect ratio if height not specified
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Enhanced controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 15;
    controls.maxDistance = 40;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI - 0.1;
    controls.target.set(0, 5, 0);
    controls.update();
    
    setupLighting();
    createEquipment();
    createGrid();
    createParticleSystem();
    animate();
}

function setupLighting() {
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    
    const ovenLight = new THREE.PointLight(0xff8844, 1, 10);
    ovenLight.position.set(0, 3, 0);
    scene.add(ovenLight);
}

function createStand() {
    stand = new THREE.Group();

    // Base with darker color
    const baseGeometry = new THREE.BoxGeometry(10, 1, 8);
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a,
        shininess: 30
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.receiveShadow = true;
    scene.add(base);

    // Rod with darker color
    const rodGeometry = new THREE.CylinderGeometry(0.3, 0.3, 20, 16);
    const rodMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2a2a2a,
        shininess: 40
    });
    const rod = new THREE.Mesh(rodGeometry, rodMaterial);
    rod.position.set(-4, 10, 0);
    rod.castShadow = true;
    scene.add(rod);

    // Simple clamp for burette
    const clampGeometry = new THREE.BoxGeometry(4, 0.5, 0.5);
    const clampMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a,
        shininess: 30
    });
    clamp = new THREE.Mesh(clampGeometry, clampMaterial);
    clamp.position.set(-2, 15, 0);
    scene.add(clamp);

    const standLabel = createTextMesh("Retort Stand", 0.3);
    standLabel.position.set(-4, 21, 0);
    scene.add(standLabel);
}

function createBurette() {
    burette = new THREE.Group();

    // Main tube
    const tubeGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
    const tubeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x999999,
        transparent: true,
        opacity: 0.8,
        shininess: 100
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.castShadow = true;
    burette.add(tube);

    // Tip
    const tipGeometry = new THREE.CylinderGeometry(0.1, 0.2, 1.5, 16);
    const tipMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x999999,
        shininess: 50
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.y = -5.75;
    burette.add(tip);

    // Scale markings
    const markerGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
    const markerMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    
    // Only add major markings every 5 units
    for(let i = 0; i <= 10; i += 5) {
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(0.5, i - 4.5, 0);
        burette.add(marker);

        const value = i * 5;
        const label = createTextMesh(value.toString(), 0.2);
        label.position.set(0.8, i - 4.5, 0);
        burette.add(label);
    }

    const label = createTextMesh("AgNO₃", 0.3);
    label.position.set(0, 5.5, 0);
    burette.add(label);

    burette.position.set(0, 15, 0);
    scene.add(burette);
}

function createFlask() {
    flask = new THREE.Group();

    // Create conical body shape
    const points = [];
    points.push(new THREE.Vector2(0, 0));
    points.push(new THREE.Vector2(2.5, 0));
    points.push(new THREE.Vector2(2.5, 0.2));
    points.push(new THREE.Vector2(2.4, 0.5));
    points.push(new THREE.Vector2(1.0, 4.5));
    points.push(new THREE.Vector2(0.8, 4.7));
    points.push(new THREE.Vector2(0.8, 5.2));
    points.push(new THREE.Vector2(1.0, 5.3));
    points.push(new THREE.Vector2(0.8, 5.4));
    points.push(new THREE.Vector2(0, 5.4));

    const bodyGeometry = new THREE.LatheGeometry(points, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.6,
        shininess: 90,
        specular: 0xffffff
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    flask.add(body);

    // Solution
    const solutionPoints = [];
    solutionPoints.push(new THREE.Vector2(0, 0));
    solutionPoints.push(new THREE.Vector2(2.3, 0));
    solutionPoints.push(new THREE.Vector2(2.3, 0.2));
    solutionPoints.push(new THREE.Vector2(2.2, 0.5));
    solutionPoints.push(new THREE.Vector2(1.8, 1.0));
    solutionPoints.push(new THREE.Vector2(0.9, 4.0));
    solutionPoints.push(new THREE.Vector2(0, 4.0));

    const solutionGeometry = new THREE.LatheGeometry(solutionPoints, 32);
    const solutionMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffcc, // Light yellow for NaCl/sample solution
        transparent: true,
        opacity: 0.8,
        shininess: 70
    });
    solution = new THREE.Mesh(solutionGeometry, solutionMaterial);
    solution.position.y = -2;
    solution.scale.y = 0.01;
    solution.castShadow = true;
    flask.add(solution);

    flask.position.set(0, 1.0, 0);
    scene.add(flask);

    const flaskLabel = createTextMesh("Conical Flask", 0.3);
    flaskLabel.position.set(0, -0.5, 3);
    scene.add(flaskLabel);
}

function createStirrer() {
    stirrer = new THREE.Group();

    // Base
    const baseGeometry = new THREE.BoxGeometry(5, 0.8, 3.5);
    const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x111111,
        shininess: 30
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.receiveShadow = true;
    stirrer.add(base);

    // Control panel
    const panelGeometry = new THREE.BoxGeometry(1.8, 0.2, 0.8);
    const panelMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 50
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(-1.2, 0.5, -1);
    stirrer.add(panel);

    // Knob
    const knobGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.25, 16);
    const knobMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 50
    });
    const knob = new THREE.Mesh(knobGeometry, knobMaterial);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(-1.2, 0.6, -1);
    stirrer.add(knob);

    stirrer.position.set(0, 0.4, 0);
    scene.add(stirrer);
}

function createGrid() {
    const gridHelper = new THREE.GridHelper(80, 80, 0x888888, 0xcccccc);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
}

function createTextMesh(text, size) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    context.fillStyle = 'black';
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(text, canvas.width/2, canvas.height/2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    const geometry = new THREE.PlaneGeometry(size * 4, size * 2);
    return new THREE.Mesh(geometry, material);
}

function updateSolutionLevel() {
    if (!solution) return;

    const progress = currentVolume / MAX_VOLUME;
    const minScale = 0.01;
    const maxScale = 1.0;
    const newScale = minScale + (progress * (maxScale - minScale));
    
    // Smooth transition for solution level
    solution.scale.y = newScale;
    solution.position.y = -2 + (progress * 2);

    // Update color based on experiment stage
    if (indicatorAdded && currentVolume > 0) {
        const colorProgress = currentVolume / MAX_VOLUME;
        if (colorProgress > 0.8) {
            // Near endpoint - transition to reddish-brown
            solution.material.color.setHex(0x8B4513);
        }
    }
}

function addDroplet() {
    const dropletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const dropletMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc, // Silver color for AgNO3
        transparent: true,
        opacity: 0.9
    });
    const droplet = new THREE.Mesh(dropletGeometry, dropletMaterial);
    droplet.position.copy(burette.position);
    droplet.position.y -= 7;
    droplet.userData.velocity = 0;
    droplet.userData.startTime = Date.now();
    droplets.push(droplet);
    scene.add(droplet);
}

function updateDroplets() {
    for(let i = droplets.length - 1; i >= 0; i--) {
        const droplet = droplets[i];
        droplet.userData.velocity -= 0.01;
        droplet.position.y += droplet.userData.velocity;

        const progress = currentVolume / MAX_VOLUME;
        const baseHeight = 1.0;
        const maxHeight = 5.0;
        const solutionHeight = baseHeight + (progress * (maxHeight - baseHeight));

        if(droplet.position.y < solutionHeight) {
            scene.remove(droplet);
            droplets.splice(i, 1);
            createRippleEffect(solutionHeight);
            updateSolutionLevel();
        }
    }
}

function createRippleEffect(solutionHeight) {
    const rippleGeometry = new THREE.RingGeometry(0.1, 0.3, 32);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripple.position.y = solutionHeight;
    ripple.rotation.x = -Math.PI / 2;
    scene.add(ripple);

    const startTime = Date.now();
    function animateRipple() {
        const elapsed = (Date.now() - startTime) / 1000;
        if(elapsed > 1) {
            scene.remove(ripple);
            ripple.geometry.dispose();
            ripple.material.dispose();
            return;
        }
        
        ripple.scale.x = ripple.scale.y = 1 + elapsed;
        ripple.material.opacity = 0.5 * (1 - elapsed);
        
        requestAnimationFrame(animateRipple);
    }
    animateRipple();
}

function updateStirrer() {
    if(stirringSpeed > 0) {
        stirrer.rotation.y += (stirringSpeed / 60) * Math.PI / 30;
    }
}

function onWindowResize() {
    const container = document.getElementById('chemSimulator');
    const width = container.clientWidth;
    const height = container.clientHeight || width * 0.75;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
}

function animate() {
    requestAnimationFrame(animate);

    // Update stirrer rotation
    if (stirringSpeed > 0) {
        stirrer.rotation.y += (stirringSpeed / 1000) * Math.PI;
    }

    // Update droplets
    if (droplets.length > 0) {
        updateDroplets();
    }

    // Update solution swirl effect when stirring
    if (stirringSpeed > 0 && solution) {
        const time = Date.now() * 0.001;
        const swirl = Math.sin(time * (stirringSpeed / 60)) * 0.1;
        solution.rotation.y = swirl;
    }

    if (isHeating && coalSample) {
        coalSample.material.emissive.setHex(0x330000);
        crucible.material.emissive.setHex(0x330000);
    }

    controls.update();
    renderer.render(scene, camera);
}

function resetExperiment() {
    isPouring = false;
    currentVolume = 0;
    stirringSpeed = 0;
    experimentRunning = false;
    caco3Added = false;
    indicatorAdded = false;
    
    // Reset solution appearance
    if (solution) {
        solution.material.color.setHex(0xffffcc);
        solution.material.opacity = 0.6;
        solution.scale.y = 0.01;
        solution.position.y = -2;
    }
    
    // Clear table
    const rows = observationTable.getElementsByTagName('tr');
    for (let row of rows) {
        row.cells[1].textContent = '';
        row.cells[2].textContent = '';
        row.cells[3].textContent = '';
    }
    
    // Reset controls
    document.getElementById('buretteReading').value = '0';
    document.getElementById('stirringSpeed').value = '0';
    document.getElementById('buretteValue').textContent = '0.00 mL';
    document.getElementById('start-experiment').innerHTML = '<i class="fas fa-play"></i> Start Moisture in Coal Sample';
    
    // Clear result
    document.getElementById('result-display').textContent = '';
    
    // Clear droplets
    droplets.forEach(droplet => scene.remove(droplet));
    droplets = [];

    isHeating = false;
    heatingProgress = 0;
    currentTemp = 25;
    currentWeight = 0;
    
    if (coalSample) {
        scene.remove(coalSample);
        coalSample = null;
    }
    
    crucible.material.emissive.setHex(0x000000);
    document.getElementById('tempValue').textContent = '25°C';
    document.getElementById('ovenTemp').value = 105;
    document.getElementById('dryingTime').value = 60;
}

function recordObservation() {
    if (!experimentRunning || !indicatorAdded) {
        alert('Please add CaCO3 and indicator before taking readings!');
        return;
    }

    const rows = observationTable.getElementsByTagName('tr');
    for (let row of rows) {
        const initialCell = row.cells[1];
        const finalCell = row.cells[2];
        const diffCell = row.cells[3];
        
        if (!initialCell.textContent) {
            initialCell.textContent = currentVolume.toFixed(2);
            break;
        } else if (!finalCell.textContent && initialCell.textContent) {
            finalCell.textContent = currentVolume.toFixed(2);
            const difference = (currentVolume - parseFloat(initialCell.textContent)).toFixed(2);
            diffCell.textContent = difference;
            break;
        }
    }
}

function calculateResults() {
    const rows = observationTable.getElementsByTagName('tr');
    let sum = 0;
    let count = 0;

    // Skip pilot reading (first row) and calculate average of constant readings
    for (let i = 1; i < rows.length; i++) {
        const diff = parseFloat(rows[i].cells[3].textContent);
        if (!isNaN(diff)) {
            sum += diff;
            count++;
        }
    }

    if (count === 0) {
        document.getElementById('result-display').textContent = 'Please take readings first';
        return;
    }

    const averageBuretteReading = sum / count;
    
    // Calculate chloride content using the formula from manual:
    // Chloride (ppm) = (B.R × 0.025 × 35.5 × 1000) / 10
    const chlorideContent = (averageBuretteReading * agno3_concentration * chloride_eq_weight * 1000) / sample_volume;
    
    document.getElementById('result-display').innerHTML = 
        `Average Burette Reading: ${averageBuretteReading.toFixed(2)} mL<br>` +
        `Chloride Content: ${chlorideContent.toFixed(2)} ppm`;
}

function createEquipment() {
    // Create oven
    createOven();
    
    // Create crucible
    createCrucible();
    
    // Create thermometer
    createThermometer();
}

function createOven() {
    oven = new THREE.Group();

    // Main oven body
    const bodyGeometry = new THREE.BoxGeometry(8, 6, 6);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666,
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    oven.add(body);

    // Oven door
    const doorGeometry = new THREE.BoxGeometry(7.8, 5.8, 0.2);
    const doorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.2
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0, 3);
    oven.add(door);

    // Temperature display
    const displayGeometry = new THREE.PlaneGeometry(2, 0.8);
    const displayMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const display = new THREE.Mesh(displayGeometry, displayMaterial);
    display.position.set(2.5, 2, 3.1);
    oven.add(display);

    // Control knobs
    const knobGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16);
    const knobMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
    
    const tempKnob = new THREE.Mesh(knobGeometry, knobMaterial);
    tempKnob.position.set(2.5, 1, 3.1);
    oven.add(tempKnob);

    const timerKnob = new THREE.Mesh(knobGeometry, knobMaterial);
    timerKnob.position.set(3.5, 1, 3.1);
    oven.add(timerKnob);

    oven.position.set(0, 3, 0);
    scene.add(oven);
}

function createCrucible() {
    crucible = new THREE.Group();

    // Main body with detailed shape
    const points = [];
    for(let i = 0; i < 10; i++) {
        const y = i * 0.15;
        const r = 0.8 - (i * 0.02);
        points.push(new THREE.Vector2(r, y));
    }
    
    const crucibleGeometry = new THREE.LatheGeometry(points, 32);
    const crucibleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xdddddd,
        metalness: 0.5,
        roughness: 0.3
    });
    const body = new THREE.Mesh(crucibleGeometry, crucibleMaterial);
    crucible.add(body);

    // Rim detail
    const rimGeometry = new THREE.TorusGeometry(0.8, 0.05, 16, 32);
    const rim = new THREE.Mesh(rimGeometry, crucibleMaterial);
    rim.position.y = 1.5;
    crucible.add(rim);

    crucible.position.set(0, 4.5, 0);
    scene.add(crucible);
}

function createThermometer() {
    thermometer = new THREE.Group();

    // Glass tube
    const tubeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4, 16);
    const glassMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6
    });
    const tube = new THREE.Mesh(tubeGeometry, glassMaterial);
    thermometer.add(tube);

    // Mercury bulb
    const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const mercuryMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const bulb = new THREE.Mesh(bulbGeometry, mercuryMaterial);
    bulb.position.y = -2;
    thermometer.add(bulb);

    // Mercury column
    this.updateMercuryColumn(25); // Start at room temperature

    thermometer.position.set(3, 5, 0);
    scene.add(thermometer);
}

function updateMercuryColumn(temperature) {
    // Remove old mercury column if it exists
    const oldColumn = thermometer.getObjectByName('mercuryColumn');
    if (oldColumn) thermometer.remove(oldColumn);

    // Calculate height based on temperature
    const minTemp = 0;
    const maxTemp = 200;
    const minHeight = 0;
    const maxHeight = 3.5;
    
    const height = ((temperature - minTemp) / (maxTemp - minTemp)) * (maxHeight - minHeight) + minHeight;
    
    const columnGeometry = new THREE.CylinderGeometry(0.05, 0.05, height, 16);
    const mercuryMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const mercuryColumn = new THREE.Mesh(columnGeometry, mercuryMaterial);
    mercuryColumn.position.y = -2 + (height / 2);
    mercuryColumn.name = 'mercuryColumn';
    thermometer.add(mercuryColumn);
}

function createParticleSystem() {
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for(let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 1] = Math.random() * 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

        velocities[i * 3] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 1] = Math.random() * 0.02;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const particleMaterial = new THREE.PointsMaterial({
        color: 0x666666,
        size: 0.05,
        transparent: true,
        opacity: 0.5
    });

    particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.visible = false;
    scene.add(particleSystem);
}

function updateParticles() {
    if (!particleSystem || !particleSystem.visible) return;

    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.geometry.attributes.velocity.array;

    for(let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        // Reset particles that go too high
        if(positions[i + 1] > 2) {
            positions[i + 1] = 0;
        }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function addCoalSample() {
    if (coalSample) scene.remove(coalSample);
    
    // Create detailed coal sample with irregular surface
    const sampleGeometry = new THREE.DodecahedronGeometry(0.5, 1);
    const sampleMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1
    });
    coalSample = new THREE.Mesh(sampleGeometry, sampleMaterial);
    coalSample.position.copy(crucible.position);
    coalSample.position.y -= 0.3;
    scene.add(coalSample);

    // Update analytical balance display
    currentWeight = 1 + Math.random() * 0.1; // Random weight around 1g
    updateBalanceDisplay(currentWeight);
}

function startHeating() {
    if (!coalSample) {
        alert('Please add coal sample first!');
        return;
    }

    isHeating = true;
    heatingProgress = 0;
    currentTemp = 25;
    
    const targetTemp = parseInt(document.getElementById('ovenTemp').value);
    const duration = parseInt(document.getElementById('dryingTime').value) * 1000;
    
    // Show moisture particles
    particleSystem.visible = true;
    
    const heatInterval = setInterval(() => {
        if (heatingProgress >= 100) {
            isHeating = false;
            particleSystem.visible = false;
            clearInterval(heatInterval);
            
            // Update final weight
            currentWeight *= 0.95; // Simulate 5% moisture loss
            updateBalanceDisplay(currentWeight);
            return;
        }

        heatingProgress += 0.1;
        currentTemp = 25 + (targetTemp - 25) * (heatingProgress / 100);
        
        // Update displays
        document.getElementById('tempValue').textContent = Math.round(currentTemp) + '°C';
        updateMercuryColumn(currentTemp);
        
        // Visual feedback
        if (coalSample) {
            coalSample.material.emissive.setHex(0x330000);
            crucible.material.emissive.setHex(0x330000);
        }
    }, duration / 1000);
}

function updateBalanceDisplay(weight) {
    // Create canvas for digital display
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '32px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(weight.toFixed(4) + ' g', 240, 40);
    
    // Update balance display texture
    const texture = new THREE.CanvasTexture(canvas);
    const displayMaterial = new THREE.MeshBasicMaterial({ map: texture });
    
    // Find and update display panel
    const display = oven.children.find(child => child.position.z === 3);
    if (display) display.material = displayMaterial;
}

function startExperiment() {
    if (experimentRunning) {
        pauseExperiment();
        return;
    }
    
    const startButton = document.getElementById('start-experiment');
    
    switch(experimentStep) {
        case 0: // Initial state
            startButton.innerHTML = '<i class="fas fa-pause"></i> Pause Experiment';
            experimentRunning = true;
            experimentStep = 1;
            updateInstructions("Add coal sample to the crucible");
            break;
            
        case 1: // Sample added
            if (!coalSample) {
                alert("Please add coal sample first!");
                return;
            }
            startButton.innerHTML = '<i class="fas fa-pause"></i> Pause Heating';
            startHeating();
            experimentStep = 2;
            break;
            
        case 2: // Heating in progress
            if (!isHeating) {
                alert("Heating process completed. Please take weight measurement.");
                experimentStep = 3;
            }
            break;
            
        case 3: // Ready for measurement
            if (currentWeight > 0) {
                recordMeasurement();
                experimentStep = 4;
            }
            break;
            
        case 4: // Experiment complete
            calculateResults();
            resetExperiment();
            break;
    }
}

function pauseExperiment() {
    experimentRunning = false;
    if (isHeating) {
        isHeating = false;
        document.getElementById('start-experiment').innerHTML = '<i class="fas fa-play"></i> Resume Heating';
    }
}

function updateInstructions(message) {
    const instructionsElement = document.createElement('div');
    instructionsElement.className = 'instruction-message';
    instructionsElement.textContent = message;
    
    const container = document.getElementById('chemSimulator');
    const existingMessage = container.querySelector('.instruction-message');
    if (existingMessage) {
        container.removeChild(existingMessage);
    }
    container.appendChild(instructionsElement);
}

function recordMeasurement() {
    const table = document.getElementById('observationTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    
    const readingCell = newRow.insertCell(0);
    const w1Cell = newRow.insertCell(1);
    const w2Cell = newRow.insertCell(2);
    const w3Cell = newRow.insertCell(3);
    
    readingCell.textContent = table.rows.length;
    w1Cell.textContent = (currentWeight * 0.2).toFixed(4); // Empty crucible weight
    w2Cell.textContent = currentWeight.toFixed(4); // Weight with sample
    w3Cell.textContent = (currentWeight * 0.95).toFixed(4); // Weight after drying
}

// Enhanced event listeners
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Start/Pause experiment
    document.getElementById('start-experiment').addEventListener('click', startExperiment);
    
    // Add sample button
    document.getElementById('add-sample').addEventListener('click', () => {
        if (experimentStep === 1 || experimentStep === 0) {
            addCoalSample();
            updateInstructions("Sample added. Start heating process.");
        } else {
            alert("Cannot add sample at this stage!");
        }
    });
    
    // Start heating button
    document.getElementById('start-heating').addEventListener('click', () => {
        if (experimentStep === 1 && coalSample) {
            startHeating();
            experimentStep = 2;
            updateInstructions("Heating in progress...");
        } else {
            alert("Please add sample first!");
        }
    });

    // Take weight button
    document.getElementById('take-reading').addEventListener('click', () => {
        if (experimentStep === 3) {
            recordMeasurement();
            updateInstructions("Measurement recorded. Continue with next sample or calculate results.");
        } else {
            alert("Complete heating process before taking measurements!");
        }
    });

    // Reset experiment button
    document.getElementById('reset-experiment').addEventListener('click', () => {
        resetExperiment();
        updateInstructions("Experiment reset. Start new experiment.");
    });
    
    // Temperature control
    document.getElementById('ovenTemp').addEventListener('input', (e) => {
        const temp = parseInt(e.target.value);
        document.getElementById('tempValue').textContent = temp + '°C';
        if (!isHeating) updateMercuryColumn(temp);
    });
    
    // Time control
    document.getElementById('dryingTime').addEventListener('input', (e) => {
        document.getElementById('timeValue').textContent = e.target.value + ' min';
    });

    // Calculate results button
    document.getElementById('calculate-result').addEventListener('click', calculateResults);
}); 

window.addEventListener('resize', onWindowResize);

// ... (keep rest of the existing code) ... 