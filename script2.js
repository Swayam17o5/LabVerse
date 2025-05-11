// Constants for colors and materials
const COLORS = {
    primary: 0x9B2928,
    secondary: 0x3498db,
    metallic: 0xA0A0A0,  // Slightly darker metallic
    white: 0xFFFFFF,
    black: 0x000000,
    red: 0xFF0000,
    blue: 0x0000FF,
    diode: 0x1a252f,    // Darker diode color
    wire: 0x7f8c8d,
    resistor: 0x654321, // Darker brown for resistor
    terminal: 0xB8860B, // Darker gold for terminals
    ground: 0x4A4A4A    // Dark gray for ground symbol
};

// Diode properties
const DIODE = {
    barrierVoltage: 0.7,
    reverseLeakage: 0.001,
    forwardResistance: 10,
    reverseBreakdown: 8.0
};

// Scene variables
let scene, camera, renderer, controls;
let circuit = {
    battery: null,
    diode: null,
    voltmeter: null,
    ammeter: null,
    resistors: [],
    wires: []
};

// Circuit state
let voltage = 0;
let current = 0;
let isRunning = false;
let isBiasForward = true;

// Add these variables at the top with other declarations
let forwardObservations = [];
let reverseObservations = [];

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Setup container
    const container = document.getElementById('simulator-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create camera with closer initial position
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 8, 12); // Adjusted for better initial view
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
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
    createGrid();

    // Setup controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Start animation
    animate();
}

// Create battery with detailed terminals
function createBattery() {
    const batteryGroup = new THREE.Group();
    
    // Battery body
    const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: COLORS.metallic,
        shininess: 100,
        specular: 0x444444
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    batteryGroup.add(body);

    // Battery terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 32);
    const terminalMaterial = new THREE.MeshPhongMaterial({
        color: COLORS.terminal,
        shininess: 100,
        specular: 0xffffff
    });

    // Positive terminal
    const posTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    posTerminal.position.y = 1.1;
    batteryGroup.add(posTerminal);

    // Positive symbol
    const plusGroup = new THREE.Group();
    const plusMaterial = new THREE.MeshPhongMaterial({ color: COLORS.black });
    
    const vLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.4, 0.05),
        plusMaterial
    );
    const hLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.05),
        plusMaterial
    );
    plusGroup.add(vLine, hLine);
    plusGroup.position.set(0, 1.2, 0.3);
    batteryGroup.add(plusGroup);

    // Negative terminal
    const negTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    negTerminal.position.y = -1.1;
    batteryGroup.add(negTerminal);

    // Negative symbol
    const minusLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.2, 0.05),
        plusMaterial
    );
    minusLine.position.set(0, -1.2, 0.3);
    batteryGroup.add(minusLine);

    return batteryGroup;
}

// Create detailed diode
function createDiode() {
    const diodeGroup = new THREE.Group();
    
    // Diode body
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: COLORS.diode,
        shininess: 80,
        specular: 0x444444
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    diodeGroup.add(body);

    // Cathode band
    const bandGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 32);
    const bandMaterial = new THREE.MeshPhongMaterial({
        color: COLORS.metallic,
        shininess: 60
    });
    const band = new THREE.Mesh(bandGeometry, bandMaterial);
    band.position.y = 0.5;
    diodeGroup.add(band);

    // Terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
    const terminalMaterial = new THREE.MeshPhongMaterial({
        color: COLORS.terminal,
        shininess: 100,
        specular: 0xffffff
    });

    const anode = new THREE.Mesh(terminalGeometry, terminalMaterial);
    anode.position.y = 0.9;
    diodeGroup.add(anode);

    const cathode = new THREE.Mesh(terminalGeometry, terminalMaterial);
    cathode.position.y = -0.9;
    diodeGroup.add(cathode);

    return diodeGroup;
}

// Create detailed resistor
function createResistor(isVariable = false) {
    const resistorGroup = new THREE.Group();
    
    if (isVariable) {
        // Variable resistor (potentiometer) body
        const bodyGeometry = new THREE.BoxGeometry(0.8, 2, 0.4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: COLORS.resistor,
            shininess: 50
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        resistorGroup.add(body);

        // Control knob
        const knobGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 32);
        const knobMaterial = new THREE.MeshPhongMaterial({
            color: COLORS.metallic,
            shininess: 100
        });
        const knob = new THREE.Mesh(knobGeometry, knobMaterial);
        knob.rotation.x = Math.PI / 2;
        knob.position.z = 0.3;
        resistorGroup.add(knob);

        // Add arrow symbol for variable resistance
        const arrowMaterial = new THREE.MeshBasicMaterial({ color: COLORS.black });
        const arrowBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.05, 0.05),
            arrowMaterial
        );
        const arrowHead1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.05, 0.05),
            arrowMaterial
        );
        const arrowHead2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.05, 0.05),
            arrowMaterial
        );
        
        arrowBody.position.set(0, 0, 0.25);
        arrowHead1.position.set(0.2, 0, 0.25);
        arrowHead2.position.set(-0.2, 0, 0.25);
        arrowHead1.rotation.z = Math.PI / 4;
        arrowHead2.rotation.z = -Math.PI / 4;
        
        resistorGroup.add(arrowBody, arrowHead1, arrowHead2);

    } else {
        // Fixed resistor with improved zigzag symbol
        const bodyGeometry = new THREE.BoxGeometry(2.5, 0.4, 0.4);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: COLORS.resistor,
            shininess: 50
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        resistorGroup.add(body);

        // Add improved zigzag symbol
        const zigzagMaterial = new THREE.MeshBasicMaterial({ color: COLORS.black });
        const zigzagPoints = [];
        const zigzagWidth = 2;
        const zigzagHeight = 0.15;
        const segments = 8; // Increased segments for smoother zigzag

        for (let i = 0; i <= segments; i++) {
            const x = (i / segments - 0.5) * zigzagWidth;
            const y = ((i % 2) * 2 - 1) * zigzagHeight;
            zigzagPoints.push(new THREE.Vector3(x, y, 0));
        }

        const zigzagGeometry = new THREE.BufferGeometry().setFromPoints(zigzagPoints);
        const zigzag = new THREE.Line(zigzagGeometry, zigzagMaterial);
        zigzag.position.z = 0.21;
        resistorGroup.add(zigzag);

        // Add improved terminals
        const terminalGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16);
        const terminalMaterial = new THREE.MeshPhongMaterial({
            color: COLORS.terminal,
            shininess: 100
        });

        const leftTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
        leftTerminal.position.x = -1.3;
        leftTerminal.rotation.z = Math.PI / 2;
        resistorGroup.add(leftTerminal);

        const rightTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
        rightTerminal.position.x = 1.3;
        rightTerminal.rotation.z = Math.PI / 2;
        resistorGroup.add(rightTerminal);
    }

    return resistorGroup;
}

// Create detailed meter
function createMeter(isVoltmeter = true) {
    const meterGroup = new THREE.Group();
    
    // Meter body with improved dimensions
    const bodyGeometry = new THREE.BoxGeometry(1.8, 1.8, 0.5);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: COLORS.black,
        shininess: 30
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    meterGroup.add(body);

    // Display screen with improved size
    const screenGeometry = new THREE.PlaneGeometry(1.4, 0.8);
    const screenMaterial = new THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x000000,
        emissiveIntensity: 1
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.26;
    meterGroup.add(screen);

    // Create reading display with higher resolution
    const readingCanvas = document.createElement('canvas');
    const readingContext = readingCanvas.getContext('2d');
    readingCanvas.width = 512;
    readingCanvas.height = 256;

    // Initial display setup
    const readingTexture = new THREE.CanvasTexture(readingCanvas);
    readingTexture.minFilter = THREE.LinearFilter;
    readingTexture.magFilter = THREE.LinearFilter;
    const readingMaterial = new THREE.MeshBasicMaterial({
        map: readingTexture,
        transparent: true
    });
    const readingPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.75),
        readingMaterial
    );
    readingPlane.position.z = 0.27;
    meterGroup.add(readingPlane);

    // Store canvas and context for updates
    meterGroup.userData = {
        readingCanvas,
        readingContext,
        readingTexture,
        isVoltmeter
    };

    // Add improved terminals
    const terminalGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16);
    const terminalMaterial = new THREE.MeshPhongMaterial({
        color: COLORS.terminal,
        shininess: 100
    });

    const posTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    posTerminal.position.set(0.6, -0.8, 0);
    posTerminal.rotation.x = Math.PI / 2;
    meterGroup.add(posTerminal);

    const negTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    negTerminal.position.set(-0.6, -0.8, 0);
    negTerminal.rotation.x = Math.PI / 2;
    meterGroup.add(negTerminal);

    // Add improved label
    const labelGeometry = new THREE.PlaneGeometry(1.2, 0.3);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = '#FFFFFF';
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(isVoltmeter ? 'V' : 'A', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(0, 0.7, 0.26);
    meterGroup.add(label);

    return meterGroup;
}

// Create ground symbol
function createGround() {
    const groundGroup = new THREE.Group();
    
    const material = new THREE.MeshPhongMaterial({
        color: COLORS.ground,
        shininess: 50
    });

    // Create three lines of decreasing width
    for (let i = 0; i < 3; i++) {
        const width = 0.8 - (i * 0.2);
        const geometry = new THREE.BoxGeometry(width, 0.1, 0.1);
        const line = new THREE.Mesh(geometry, material);
        line.position.y = -i * 0.2;
        groundGroup.add(line);
    }

    return groundGroup;
}

// Create circuit components
function createCircuit() {
    // Create and position battery - moved further left
    const battery = createBattery();
    battery.position.set(-6, 0, 0); // Moved from -4 to -6
    battery.rotation.z = Math.PI / 2;
    circuit.battery = battery;
    scene.add(battery);

    // Create resistors with improved positioning
    const potentiometer = createResistor(true);
    potentiometer.position.set(-6, 1, 0); // Moved from -4 to -6
    circuit.resistors.push(potentiometer);
    scene.add(potentiometer);

    // Update series resistor position with more space
    const seriesResistor = createResistor(false);
    seriesResistor.position.set(-3, 2, 0); // Adjusted position
    seriesResistor.rotation.z = 0;
    circuit.resistors.push(seriesResistor);
    scene.add(seriesResistor);

    // Create diode
    const diode = createDiode();
    diode.position.set(2, 0, 0);
    diode.rotation.z = Math.PI / 2;
    circuit.diode = diode;
    scene.add(diode);

    // Create meters with improved positioning
    const voltmeter = createMeter(true);
    voltmeter.position.set(4, 0, 0);
    circuit.voltmeter = voltmeter;
    scene.add(voltmeter);

    const ammeter = createMeter(false);
    ammeter.position.set(1, 2, 0); // Moved right for better spacing
    circuit.ammeter = ammeter;
    scene.add(ammeter);

    // Create ground symbol
    const ground = createGround();
    ground.position.set(4, -1.5, 0);
    scene.add(ground);

    // Create wires with improved paths
    createWires();

    // Create electrons after circuit is set up
    createElectrons();
}

// Update createWires function with improved wire paths
function createWires() {
    const wireMaterial = new THREE.MeshPhongMaterial({ 
        color: COLORS.wire,
        shininess: 30
    });

    const wireRadius = 0.05;
    
    // Define wire paths with improved connections
    const wirePaths = isBiasForward ? [
        // Battery positive to potentiometer
        [
            new THREE.Vector3(-6, 1.1, 0),
            new THREE.Vector3(-6, 1.5, 0),
            new THREE.Vector3(-6, 2, 0)
        ],
        // Potentiometer to series resistor with improved connection
        [
            new THREE.Vector3(-6, 2.2, 0),
            new THREE.Vector3(-4.5, 2.2, 0),
            new THREE.Vector3(-4, 2, 0),
            new THREE.Vector3(-3.5, 2, 0)
        ],
        // Series resistor to ammeter with improved connection
        [
            new THREE.Vector3(-2.5, 2, 0),
            new THREE.Vector3(-1, 2, 0),
            new THREE.Vector3(0, 2, 0),
            new THREE.Vector3(1, 2, 0)
        ],
        // Ammeter to diode with new curved path matching red line
        [
            new THREE.Vector3(1, 1.2, 0),
            new THREE.Vector3(1.2, 0.9, 0),     // Start curve higher
            new THREE.Vector3(1.6, 0.6, 0),     // Middle curve point adjusted
            new THREE.Vector3(1.9, 0.3, 0),     // Additional curve point
            new THREE.Vector3(2, 0, 0)          // Connect to diode
        ],
        // Diode to voltmeter with improved connection
        [
            new THREE.Vector3(2.5, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(3.5, 0, 0)
        ],
        // Ground connections with improved path
        [
            new THREE.Vector3(4, -0.8, 0),
            new THREE.Vector3(4, -1.2, 0),
            new THREE.Vector3(4, -1.5, 0),
            new THREE.Vector3(0, -1.5, 0),
            new THREE.Vector3(-3, -1.5, 0),
            new THREE.Vector3(-6, -1.5, 0),
            new THREE.Vector3(-6, -1.1, 0)
        ]
    ] : [
        // Battery negative to potentiometer
        [
            new THREE.Vector3(-6, -1.1, 0),
            new THREE.Vector3(-6, -0.5, 0),
            new THREE.Vector3(-6, 0, 0),
            new THREE.Vector3(-6, 0.5, 0),
            new THREE.Vector3(-6, 1, 0)
        ],
        // Potentiometer to series resistor
        [
            new THREE.Vector3(-6, 2.2, 0),
            new THREE.Vector3(-4.5, 2.2, 0),
            new THREE.Vector3(-4, 2, 0),
            new THREE.Vector3(-3.5, 2, 0)
        ],
        // Series resistor to ammeter
        [
            new THREE.Vector3(-2.5, 2, 0),
            new THREE.Vector3(-1, 2, 0),
            new THREE.Vector3(0, 2, 0),
            new THREE.Vector3(1, 2, 0)
        ],
        // Ammeter to diode with new curved path matching red line in image
        [
            new THREE.Vector3(1, 1.2, 0),
            new THREE.Vector3(1.2, 0.9, 0),     // Start curve higher
            new THREE.Vector3(1.6, 0.6, 0),     // Middle curve point adjusted
            new THREE.Vector3(1.9, 0.3, 0),     // Additional curve point
            new THREE.Vector3(2, 0, 0),         // Connect to diode
            
            // Diode to voltmeter
            new THREE.Vector3(2.5, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(3.5, 0, 0)
        ],
        // Voltmeter to battery positive (ground path)
        [
            new THREE.Vector3(4, -0.8, 0),
            new THREE.Vector3(4, -1.2, 0),
            new THREE.Vector3(4, -1.5, 0),
            new THREE.Vector3(0, -1.5, 0),
            new THREE.Vector3(-3, -1.5, 0),
            new THREE.Vector3(-6, -1.5, 0),
            new THREE.Vector3(-6, -1.1, 0)
        ]
    ];

    // Create wire segments with improved curve handling
    wirePaths.forEach(path => {
        for (let i = 1; i < path.length; i++) {
            const start = path[i - 1];
            const end = path[i];
            
            // Create curved path if there are control points
            if (path.length > 2 && i < path.length - 1) {
                const curve = new THREE.QuadraticBezierCurve3(
                    start,
                    path[i].clone().add(new THREE.Vector3(0, 0.1, 0)), // Reduced curve height
                    end
                );

                const points = curve.getPoints(40);
                const geometry = new THREE.TubeGeometry(
                    new THREE.CatmullRomCurve3(points),
                    40,
                    wireRadius,
                    16,
                    false
                );
                const wire = new THREE.Mesh(geometry, wireMaterial);
                circuit.wires.push(wire);
                scene.add(wire);
            } else {
                // Create straight wire segment
                const direction = end.clone().sub(start);
                const length = direction.length();
                const wireGeometry = new THREE.CylinderGeometry(
                    wireRadius,
                    wireRadius,
                    length,
                    16
                );
                const wire = new THREE.Mesh(wireGeometry, wireMaterial);

                wire.position.copy(start.clone().add(end).multiplyScalar(0.5));
                wire.quaternion.setFromUnitVectors(
                    new THREE.Vector3(0, 1, 0),
                    direction.normalize()
                );

                circuit.wires.push(wire);
                scene.add(wire);
            }
        }
    });
}

// Update electron paths and speed calculation
function updateElectronPaths() {
    const electronPaths = isBiasForward ? [
        [
            // Battery positive to potentiometer
            new THREE.Vector3(-6, 1.1, 0),
            new THREE.Vector3(-6, 1.5, 0),
            new THREE.Vector3(-6, 2, 0),
            
            // Potentiometer to series resistor
            new THREE.Vector3(-6, 2.2, 0),
            new THREE.Vector3(-4.5, 2.2, 0),
            new THREE.Vector3(-4, 2, 0),
            new THREE.Vector3(-3.5, 2, 0),
            
            // Series resistor to ammeter
            new THREE.Vector3(-2.5, 2, 0),
            new THREE.Vector3(-1, 2, 0),
            new THREE.Vector3(0, 2, 0),
            new THREE.Vector3(1, 2, 0),
            
            // Ammeter to diode with new curved path matching red line
            new THREE.Vector3(1, 1.2, 0),
            new THREE.Vector3(1.2, 0.9, 0),     // Start curve higher
            new THREE.Vector3(1.6, 0.6, 0),     // Middle curve point adjusted
            new THREE.Vector3(1.9, 0.3, 0),     // Additional curve point
            new THREE.Vector3(2, 0, 0),         // Connect to diode
            
            // Diode to voltmeter
            new THREE.Vector3(2.5, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(3.5, 0, 0),
            
            // Ground path
            new THREE.Vector3(4, -0.8, 0),
            new THREE.Vector3(4, -1.2, 0),
            new THREE.Vector3(4, -1.5, 0),
            new THREE.Vector3(0, -1.5, 0),
            new THREE.Vector3(-3, -1.5, 0),
            new THREE.Vector3(-6, -1.5, 0),
            new THREE.Vector3(-6, -1.1, 0)
        ]
    ] : [
        [
            // Battery negative to potentiometer
            new THREE.Vector3(-6, -1.1, 0),
            new THREE.Vector3(-6, -0.5, 0),
            new THREE.Vector3(-6, 0, 0),
            new THREE.Vector3(-6, 0.5, 0),
            new THREE.Vector3(-6, 1, 0),
            
            // Potentiometer to series resistor
            new THREE.Vector3(-6, 2.2, 0),
            new THREE.Vector3(-4.5, 2.2, 0),
            new THREE.Vector3(-4, 2, 0),
            new THREE.Vector3(-3.5, 2, 0),
            
            // Series resistor to ammeter
            new THREE.Vector3(-2.5, 2, 0),
            new THREE.Vector3(-1, 2, 0),
            new THREE.Vector3(0, 2, 0),
            new THREE.Vector3(1, 2, 0),
            
            // Ammeter to diode with new curved path matching red line in image
            new THREE.Vector3(1, 1.2, 0),
            new THREE.Vector3(1.2, 0.9, 0),     // Start curve higher
            new THREE.Vector3(1.6, 0.6, 0),     // Middle curve point adjusted
            new THREE.Vector3(1.9, 0.3, 0),     // Additional curve point
            new THREE.Vector3(2, 0, 0),         // Connect to diode
            
            // Diode to voltmeter
            new THREE.Vector3(2.5, 0, 0),
            new THREE.Vector3(3, 0, 0),
            new THREE.Vector3(3.5, 0, 0),
            
            // Voltmeter to battery positive (ground path)
            new THREE.Vector3(4, -0.8, 0),
            new THREE.Vector3(4, -1.2, 0),
            new THREE.Vector3(4, -1.5, 0),
            new THREE.Vector3(0, -1.5, 0),
            new THREE.Vector3(-3, -1.5, 0),
            new THREE.Vector3(-6, -1.5, 0),
            new THREE.Vector3(-6, -1.1, 0)
        ]
    ];

    // Update electron animation paths with improved speed calculation
    if (electrons.length > 0) {
        const path = electronPaths[0];
        electrons.forEach((electron, index) => {
            if (!isRunning) {
                electron.visible = false;
                return;
            }

            electron.visible = true;
            
            // Calculate base speed with enhanced voltage dependency
            let baseSpeed = 0.03; // Increased base speed
            let voltageFactor = Math.pow(Math.abs(voltage) / 10, 1.5); // More aggressive voltage scaling
            let currentFactor = Math.abs(current) * 1000 / 80; // Increased current influence
            
            // Calculate speed with improved voltage dependency
            let speed = baseSpeed * (voltageFactor + currentFactor);
            
            // Enhanced speed boost for both bias modes
            if (Math.abs(voltage) > 3) { // Lower threshold for speed boost
                if (isBiasForward) {
                    // Forward bias acceleration - more aggressive scaling
                    speed *= 1 + Math.pow((Math.abs(voltage) - 3) / 3, 1.8);
                } else {
                    // Reverse bias acceleration - more responsive
                    speed *= 1 + Math.pow((Math.abs(voltage) - 3) / 3, 1.8);
                }
            }
            
            // Adjusted speed limits for more dynamic range
            let maxSpeed = 0.25; // Increased maximum speed
            let minSpeed = isBiasForward ? 0.02 : 0.015; // Slightly higher minimum speeds
            
            speed = Math.min(Math.max(speed, minSpeed), maxSpeed);
            
            // Calculate electron position
            const timeOffset = (index / ELECTRON_COUNT + Date.now() * speed / 1000);
            const offset = timeOffset % 1;
            
            // Position electron along path with improved smoothness
            let totalLength = 0;
            for (let i = 1; i < path.length; i++) {
                totalLength += path[i].distanceTo(path[i - 1]);
            }

            let targetDistance = offset * totalLength;
            for (let i = 1; i < path.length; i++) {
                const segmentLength = path[i].distanceTo(path[i - 1]);
                if (targetDistance <= segmentLength) {
                    const t = targetDistance / segmentLength;
                    electron.position.lerpVectors(path[i - 1], path[i], t);
                    break;
                }
                targetDistance -= segmentLength;
            }
        });
    }
}

// Create component labels
function createComponentLabels() {
    const labels = [
        { text: 'Battery (12V)', position: [-8, 0, 0], size: 2 },
        { text: 'Diode', position: [2, -0.8, 0], size: 1.5 }, // Moved below diode
        { text: 'Voltmeter', position: [6.5, 0, 0], size: 1.5 }, // Moved further right
        { text: 'Ammeter', position: [1, 3.5, 0], size: 1.5 },
        { text: 'Resistor', position: [-3, 2.5, 0], size: 1.5 } // Changed from 'R' to 'Resistor'
    ];

    labels.forEach(label => {
        const sprite = createDetailedLabel(label.text, label.size);
        sprite.position.set(...label.position);
        scene.add(sprite);
    });
}

// Create detailed label
function createDetailedLabel(text, size = 1) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#9B2928';
    context.lineWidth = 4;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    context.font = 'bold 48px Arial';
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
    sprite.scale.set(size * 1.5, size * 0.4, 1);

    return sprite;
}

// Create grid for reference
function createGrid() {
    const gridHelper = new THREE.GridHelper(40, 40, 0x888888, 0x444444);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Add a ground plane for better shadow rendering
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Update measurements
function updateMeasurements() {
    if (!isRunning) return;

    // Calculate current based on voltage using the same conversion rate for both bias modes
    if (Math.abs(voltage) > DIODE.barrierVoltage) {
        // Use the same exponential model for both forward and reverse bias
        const excessVoltage = Math.abs(voltage) - DIODE.barrierVoltage;
        current = 0.001 * Math.exp(3 * excessVoltage);
        // Limit maximum current to 50mA
        current = Math.min(current, 0.05);
        // Apply direction based on bias mode
        current = isBiasForward ? current : -current;
    } else {
        current = isBiasForward ? 0 : -DIODE.reverseLeakage;
    }

    // Update HTML displays
    document.getElementById('voltmeter-display').textContent = `Voltage: ${voltage.toFixed(2)} V`;
    document.getElementById('ammeter-display').textContent = `Current: ${(current * 1000).toFixed(2)} mA`;

    // Update 3D meter displays
    updateMeterDisplay(circuit.voltmeter, voltage.toFixed(2) + ' V');
    updateMeterDisplay(circuit.ammeter, (current * 1000).toFixed(2) + ' mA');
}

// Function to update meter display with enhanced quality
function updateMeterDisplay(meter, value) {
    if (!meter || !meter.userData.readingContext) return;

    const { readingCanvas, readingContext, readingTexture } = meter.userData;
    const ctx = readingContext;

    // Clear canvas with a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, readingCanvas.height);
    gradient.addColorStop(0, '#001100');
    gradient.addColorStop(1, '#002200');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, readingCanvas.width, readingCanvas.height);

    // Draw text with shadow for better visibility
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 96px monospace'; // Larger font size
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00FF00';
    ctx.fillText(value, readingCanvas.width / 2, readingCanvas.height / 2);

    // Add subtle grid lines
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#004400';
    ctx.lineWidth = 1;
    const gridSize = 16;
    for (let i = 0; i < readingCanvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, readingCanvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < readingCanvas.height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(readingCanvas.width, i);
        ctx.stroke();
    }

    // Update texture
    readingTexture.needsUpdate = true;
}

// Update electron animation system
let electrons = [];
const ELECTRON_COUNT = 30;

function createElectrons() {
    const electronGeometry = new THREE.SphereGeometry(0.08, 12, 12);
    const electronMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.85  // Slightly increased opacity
    });

    // Clear existing electrons
    electrons.forEach(electron => scene.remove(electron));
    electrons = [];

    // Create new electrons
    for (let i = 0; i < ELECTRON_COUNT; i++) {
        const electron = new THREE.Mesh(electronGeometry, electronMaterial);
        electrons.push(electron);
        scene.add(electron);
        electron.visible = false;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (controls) controls.update();
    
    if (isRunning) {
        updateMeasurements();
        updateElectronPaths();
    }
    
    renderer.render(scene, camera);
}

// Add this function to toggle controls
function toggleControls(enabled) {
    document.getElementById('voltage').disabled = !enabled;
    document.getElementById('bias-mode').disabled = !enabled;
    
    // Update the visual appearance of disabled controls
    const controls = document.querySelectorAll('#voltage, #bias-mode');
    controls.forEach(control => {
        control.style.opacity = enabled ? '1' : '0.6';
        control.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });
}

// Update setupEventListeners function
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize, false);

    // Initially disable controls
    toggleControls(false);

    // Bias mode selection
    document.getElementById('bias-mode').addEventListener('change', (e) => {
        if (!isRunning) return; // Extra safety check
        
        isBiasForward = e.target.value === 'forward';
        voltage = 0;
        document.getElementById('voltage').value = '0';
        document.getElementById('voltage-value').textContent = '0.0 V';
        
        // Rotate diode based on bias mode
        if (circuit.diode) {
            // Remove old wires
            circuit.wires.forEach(wire => scene.remove(wire));
            circuit.wires = [];

            // Rotate diode
            if (isBiasForward) {
                circuit.diode.rotation.z = Math.PI / 2;  // Point right for forward bias
            } else {
                circuit.diode.rotation.z = -Math.PI / 2; // Point left for reverse bias
            }

            // Recreate wires with new connections
            createWires();
        }
        
        updateMeasurements();
    });

    // Voltage control
    document.getElementById('voltage').addEventListener('input', (e) => {
        if (!isRunning) {
            e.preventDefault();
            return;
        }
        voltage = parseFloat(e.target.value);
        document.getElementById('voltage-value').textContent = voltage.toFixed(1) + ' V';
        updateMeasurements();
    });

    // Start/Stop button
    document.getElementById('start-stop-button').addEventListener('click', () => {
        isRunning = !isRunning;
        const button = document.getElementById('start-stop-button');
        
        if (isRunning) {
            button.innerHTML = '<i class="fas fa-pause"></i> Pause';
            button.style.backgroundColor = '#e74c3c';
            toggleControls(true); // Enable controls when started
            updateMeasurements();
        } else {
            button.innerHTML = '<i class="fas fa-play"></i> Start';
            button.style.backgroundColor = '#9B2928';
            toggleControls(false); // Disable controls when stopped
        }
    });

    // Reset button
    document.getElementById('reset-button').addEventListener('click', () => {
        resetExperiment();
    });

    // Add observation button
    document.getElementById('add-observation').addEventListener('click', addObservation);

    // Add calculate button
    document.getElementById('calculate-result').addEventListener('click', calculateResults);
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('simulator-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Add observation to table
function addObservation() {
    if (!isRunning) {
        alert('Please start the experiment first!');
        return;
    }

    const observation = {
        voltage: voltage,
        current: current * 1000 // Convert to mA
    };

    if (isBiasForward) {
        forwardObservations.push(observation);
        updateTable('forward-data', forwardObservations);
    } else {
        reverseObservations.push(observation);
        updateTable('reverse-data', reverseObservations);
    }

    console.log('Forward observations:', forwardObservations.length);
    console.log('Reverse observations:', reverseObservations.length);
}

// Update table function
function updateTable(tableId, observations) {
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';
    observations.forEach((obs, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${obs.voltage.toFixed(2)}</td>
            <td>${obs.current.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Add this function to validate observations
function hasEnoughObservations() {
    console.log('Checking observations:', forwardObservations.length, reverseObservations.length);
    return forwardObservations && reverseObservations && 
           forwardObservations.length > 0 && 
           reverseObservations.length > 0;
}

// Add this function to calculate results
function calculateResults() {
    console.log('Calculating results...');
    console.log('Forward observations:', forwardObservations);
    console.log('Reverse observations:', reverseObservations);
    
    if (!hasEnoughObservations()) {
        alert("Please add both forward and reverse bias observations before calculating results.");
        return;
    }

    // Calculate barrier voltage (taking the voltage where current starts increasing significantly in forward bias)
    let barrierVoltage = 0;
    for (let i = 0; i < forwardObservations.length; i++) {
        if (forwardObservations[i].current > 100) { // threshold current of 0.1mA (100mA after conversion)
            barrierVoltage = forwardObservations[i].voltage;
            break;
        }
    }

    // If no significant current found, take the minimum voltage
    if (barrierVoltage === 0 && forwardObservations.length > 0) {
        barrierVoltage = forwardObservations[0].voltage;
    }

    // Calculate reverse current (average of reverse bias currents)
    let reverseCurrentSum = reverseObservations.reduce((sum, obs) => sum + Math.abs(obs.current), 0);
    let reverseCurrent = reverseObservations.length > 0 ? reverseCurrentSum / reverseObservations.length : 0;

    // Display results
    document.getElementById('barrier-voltage-result').textContent = barrierVoltage.toFixed(2) + ' volts';
    document.getElementById('reverse-current-result').textContent = reverseCurrent.toFixed(2) + ' mA';
}

// Update reset function to also disable controls
function resetExperiment() {
    isRunning = false;
    voltage = 0;
    document.getElementById('voltage').value = '0';
    document.getElementById('voltage-value').textContent = '0.0 V';
    document.getElementById('start-stop-button').innerHTML = '<i class="fas fa-play"></i> Start';
    document.getElementById('start-stop-button').style.backgroundColor = '#9B2928';
    
    toggleControls(false); // Disable controls on reset
    
    forwardObservations = [];
    reverseObservations = [];
    updateTable('forward-data', []);
    updateTable('reverse-data', []);
    document.getElementById('barrier-voltage-result').textContent = '___________ volts';
    document.getElementById('reverse-current-result').textContent = '___________ mA';
    
    updateMeasurements();
}

// Initialize when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
}); 