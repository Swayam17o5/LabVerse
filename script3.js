// Abel's Flash Point Apparatus Simulator
// Global variables
let scene, camera, renderer, controls;
let waterBath, oilCup, thermometer, stirrer, testFlame, mercury;
let waterMesh, oilMesh, burnerMesh, stirBar;
let stand, clampCup, clampThermo, lid, flamePort, flameHolder, flameLamp, funnel, spout, oilHandleL, oilHandleR, fillLine, stirKnob, burnerFlame, digitalThermo, digitalThermoTexture;
let isWaterBathFilled = false;
let isOilAdded = false;
let isHeating = false;
let isStirring = false;
let isFlameApplied = false;
let isCooling = false;
let experimentStarted = false;
let currentTemperature = 25; // Start at 25°C
let heatingInterval = null;
let coolingInterval = null;
let observationRows = [];
let flashObservedTemp = null;
let flashCeasedTemp = null;
let flashPoint = null;
let flashEffectTimeout = null;
let waterLevel = 0; // 0 to 1
let oilLevel = 0; // 0 to 1
let heatingGlow = 0; // 0 to 1
let flameHolderAngle = 0; // For swinging animation
let apparatusGroup;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('chemSimulator').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const spotLight = new THREE.SpotLight(0xffffff, 0.8);
    spotLight.position.set(10, 30, 10);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 5, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 15;
    controls.maxDistance = 60;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI - 0.1;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.update();

    // Add grid helper
    const gridHelper = new THREE.GridHelper(60, 60, 0x888888, 0x444444);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    createApparatus();
    window.addEventListener('resize', onWindowResize, false);
}

function createApparatus() {
    apparatusGroup = new THREE.Group();

    // Improved Stand (base, rod, clamp, top cap)
    // Stand base plate
    const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), baseMat);
    basePlate.position.set(-5, 0.15, 0);
    basePlate.castShadow = basePlate.receiveShadow = true;
    apparatusGroup.add(basePlate);

    // Main vertical rod (slightly tapered)
    const standMat = new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 1, roughness: 0.25 });
    const standRod = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 14, 64), standMat);
    standRod.position.set(-5, 7.15, 0);
    standRod.castShadow = standRod.receiveShadow = true;
    apparatusGroup.add(standRod);

    // Top cap/finial
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), standMat);
    topCap.position.set(-5, 14.3, 0);
    topCap.castShadow = topCap.receiveShadow = true;
    apparatusGroup.add(topCap);

    // Horizontal bar (for clamp)
    const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 64), standMat);
    hBar.position.set(-0.5, 13.5, 0);
    hBar.rotation.z = Math.PI / 2;
    hBar.castShadow = hBar.receiveShadow = true;
    apparatusGroup.add(hBar);

    // Water bath (copper vessel)
    const bathMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x3e2723, // Changed to darker brown color
        metalness: 0.5,
        roughness: 0.6,
        clearcoat: 0.2,
        clearcoatRoughness: 0.1,
        opacity: 1.0,
        side: THREE.DoubleSide // This makes both sides of the geometry visible
    });

    // Create complete cylindrical water bath
    waterBath = new THREE.Group();

    // Main cylinder with open top
    const bathCylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4, 6, 64, 1, true), // Changed to true for open-ended cylinder
        bathMaterial
    );
    bathCylinder.position.set(0, 3, 0);
    bathCylinder.castShadow = bathCylinder.receiveShadow = true;
    waterBath.add(bathCylinder);

    // Add bottom
    const bathBottom = new THREE.Mesh(
        new THREE.CircleGeometry(4, 64),
        bathMaterial
    );
    bathBottom.rotation.x = -Math.PI / 2;
    bathBottom.position.set(0, 0, 0);
    waterBath.add(bathBottom);

    // Add rim at the top
    const bathRim = new THREE.Mesh(
        new THREE.TorusGeometry(4, 0.2, 16, 64),
        new THREE.MeshPhysicalMaterial({ 
            color: 0x4a3731,
            metalness: 0.6,
            roughness: 0.4
        })
    );
    bathRim.position.set(0, 6, 0);
    bathRim.rotation.x = Math.PI / 2;
    waterBath.add(bathRim);

    // Add inner rim for better appearance
    const innerRim = new THREE.Mesh(
        new THREE.TorusGeometry(3.9, 0.1, 16, 64),
        bathMaterial
    );
    innerRim.position.set(0, 5.9, 0);
    innerRim.rotation.x = Math.PI / 2;
    waterBath.add(innerRim);

    apparatusGroup.add(waterBath);

    // Water mesh (animated) - Adjusted to be more visible
    const waterMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0x4fc3f7, 
        metalness: 0.3,
        roughness: 0.2, 
        transparent: true,
        opacity: 0.85,
        transmission: 0.1  // Reduced transmission for better visibility
    });

    // Create water mesh that will fill the entire bath
    waterMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(3.9, 3.9, 6, 64),
        waterMaterial
    );
    waterMesh.position.set(0, waterBath.position.y, 0); // Align with water bath base
    waterMesh.scale.y = 0.01; // Start with minimal height
    waterMesh.visible = false;
    apparatusGroup.add(waterMesh);

    // Add water surface effect with improved visibility
    const waterSurfaceMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x4fc3f7,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.9
    });


    // Water bath spout (outlet)
    spout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 32), new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.3 }));
    spout.position.set(3.8, 1.5, 0);
    spout.rotation.z = Math.PI / 2.5;
    spout.castShadow = spout.receiveShadow = true;
    apparatusGroup.add(spout);

    // Oil cup (double-walled)
    const cupOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 4, 64),
        new THREE.MeshPhysicalMaterial({ 
            color: 0xcccccc, 
            metalness: 0.7, 
            roughness: 0.3, 
            clearcoat: 0.2,
            opacity: 1.0
        })
    );
    cupOuter.position.set(0, 4, 0);
    cupOuter.castShadow = cupOuter.receiveShadow = true;
    apparatusGroup.add(cupOuter);

    // Add bottom to oil cup
    const cupBottom = new THREE.Mesh(
        new THREE.CircleGeometry(2, 64),
        cupOuter.material
    );
    cupBottom.rotation.x = -Math.PI / 2;
    cupBottom.position.set(0, -2, 0);
    cupOuter.add(cupBottom);

    const cupInner = new THREE.Mesh(
        new THREE.CylinderGeometry(1.8, 1.8, 3.95, 64, 1, true), // Changed to true for open top
        new THREE.MeshPhysicalMaterial({ 
            color: 0xeeeeee, 
            metalness: 0.5, 
            roughness: 0.2, 
            opacity: 1.0,
            side: THREE.DoubleSide // Make both sides visible
        })
    );
    cupInner.position.set(0, 4.025, 0);
    cupInner.castShadow = cupInner.receiveShadow = true;
    apparatusGroup.add(cupInner);

    // Add bottom to inner cup
    const innerBottom = new THREE.Mesh(
        new THREE.CircleGeometry(1.8, 64),
        cupInner.material
    );
    innerBottom.rotation.x = -Math.PI / 2;
    innerBottom.position.set(0, -1.975, 0);
    cupInner.add(innerBottom);

    // Add rim to inner cup
    const cupInnerRim = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.05, 16, 64),
        cupInner.material
    );
    cupInnerRim.position.set(0, 2, 0);
    cupInnerRim.rotation.x = Math.PI / 2;
    cupInner.add(cupInnerRim);

    // Oil meniscus (flat disk, slightly glossy)
    const meniscusGeo = new THREE.CircleGeometry(1.78, 128);
    const meniscusMat = new THREE.MeshPhysicalMaterial({ color: 0xf4d03f, transparent: true, opacity: 0.7, metalness: 0.1, roughness: 0.15, clearcoat: 0.3 });
    const oilMeniscus = new THREE.Mesh(meniscusGeo, meniscusMat);
    oilMeniscus.position.set(0, 6.02, 0);
    oilMeniscus.rotation.x = -Math.PI / 2;
    oilMeniscus.castShadow = oilMeniscus.receiveShadow = true;
    apparatusGroup.add(oilMeniscus);

    // Oil mesh (animated)
    const oilMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xf4d03f, 
        metalness: 0.1, 
        roughness: 0.2, 
        transparent: true,
        opacity: 0.9,
        transmission: 0.1
    });

    // Create oil mesh that will fill only the inner cup
    oilMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 1.75, 3.8, 64),
        oilMaterial
    );
    oilMesh.position.set(0, 4, 0);
    oilMesh.scale.y = 0.01;
    oilMesh.visible = false;
    apparatusGroup.add(oilMesh);

    // Oil surface effect
    const oilSurfaceMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xf4d03f,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
    });

    // Lid (hollow, with wall thickness)
    const lidOuter = new THREE.Mesh(
        new THREE.CylinderGeometry(2.15, 2.15, 0.25, 128),
        new THREE.MeshPhysicalMaterial({ 
            color: 0xcccccc, 
            metalness: 0.7, 
            roughness: 0.2,
            opacity: 1.0  // Make it fully opaque
        })
    );
    lidOuter.position.set(0, 6.15, 0);
    lidOuter.castShadow = lidOuter.receiveShadow = true;
    apparatusGroup.add(lidOuter);

    // Add top to lid
    const lidTop = new THREE.Mesh(
        new THREE.CircleGeometry(2.15, 128),
        lidOuter.material
    );
    lidTop.rotation.x = -Math.PI / 2;
    lidTop.position.y = 0.125;
    lidOuter.add(lidTop);

    const lidInner = new THREE.Mesh(
        new THREE.CylinderGeometry(1.7, 1.7, 0.23, 128),
        new THREE.MeshPhysicalMaterial({ 
            color: 0xeeeeee, 
            metalness: 0.5, 
            roughness: 0.2,
            opacity: 1.0  // Make it fully opaque
        })
    );
    lidInner.position.set(0, 6.15, 0);
    lidInner.castShadow = lidInner.receiveShadow = true;
    apparatusGroup.add(lidInner);
    // Lid rim (bevel)
    const lidRim = new THREE.Mesh(new THREE.TorusGeometry(2.13, 0.05, 32, 128), lidOuter.material);
    lidRim.position.set(0, 6.28, 0);
    lidRim.rotation.x = Math.PI / 2;
    apparatusGroup.add(lidRim);

    // Flame port: real hole in lid (remove a cylinder from the lid)
    const flamePortHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.3, 64),
        new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.2 })
    );
    flamePortHole.position.set(1.2, 6.25, 0);
    apparatusGroup.add(flamePortHole);
    const flamePortRim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 16, 64), lidOuter.material);
    flamePortRim.position.set(1.2, 6.4, 0);
    flamePortRim.rotation.x = Math.PI / 2;
    apparatusGroup.add(flamePortRim);


    // Stirrer: passes through lid with bushing/cap
    const stirMaterial = new THREE.MeshPhysicalMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.2 });
    stirrer = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 32), stirMaterial);
    stirrer.position.set(-0.5, 7.7, 0);
    stirrer.castShadow = stirrer.receiveShadow = true;
    apparatusGroup.add(stirrer);
    // Stirrer bushing/cap

    // Stirring knob
    stirKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 64), stirMaterial);
    stirKnob.position.set(-0.5, 9.5, 0);
    apparatusGroup.add(stirKnob);

    // Oil cup handles
    oilHandleL = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 32, 64, Math.PI), cupOuter.material);
    oilHandleL.position.set(-2, 5.5, 0);
    oilHandleL.rotation.z = Math.PI / 2;
    apparatusGroup.add(oilHandleL);
    oilHandleR = oilHandleL.clone();
    oilHandleR.position.set(2, 5.5, 0);
    apparatusGroup.add(oilHandleR);

    // Test flame holder (swings in/out)


    // Test flame (initially hidden)
    const flameMaterial = new THREE.MeshPhysicalMaterial({ color: 0xffa500, emissive: 0xffa500, transparent: true, opacity: 0.8 });
    testFlame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 32), flameMaterial);
    testFlame.position.set(2.2, 7, 0);
    testFlame.visible = false;
    apparatusGroup.add(testFlame);

    // Digital thermometer display (canvas texture)
    digitalThermoTexture = new THREE.CanvasTexture(makeThermoCanvas(currentTemperature));

    // Display housing (rounded box)
    const displayHousingMat = new THREE.MeshPhysicalMaterial({ color: 0x222831, metalness: 0.3, roughness: 0.4 });
    const displayHousing = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 1.1, 0.4, 8, 8, 8),
        displayHousingMat
    );
    displayHousing.position.set(3.5, 12.5, -0.25);
    displayHousing.castShadow = displayHousing.receiveShadow = true;
    apparatusGroup.add(displayHousing);

    // Display bezel/frame
    const bezelMat = new THREE.MeshPhysicalMaterial({ color: 0x444b54, metalness: 0.5, roughness: 0.2 });
    const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.8, 0.05, 4, 4, 2),
        bezelMat
    );
    bezel.position.set(3.5, 12.5, 0.01);
    apparatusGroup.add(bezel);

    // Digital display screen
    digitalThermo = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 0.6),
        new THREE.MeshBasicMaterial({ map: digitalThermoTexture, transparent: true })
    );
    digitalThermo.position.set(3.5, 12.5, 0.04);
    apparatusGroup.add(digitalThermo);

    // Display support foot
    const footMat = new THREE.MeshPhysicalMaterial({ color: 0x444b54, metalness: 0.5, roughness: 0.3 });
    const displayFoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.5, 24),
        footMat
    );
    displayFoot.position.set(3.5, 13.2, -0.1);
    displayFoot.castShadow = displayFoot.receiveShadow = true;
    apparatusGroup.add(displayFoot);

    // Add matchstick group
    const matchstickGroup = new THREE.Group();
    // Matchstick wood part
    const matchstickMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xd4b895,
        roughness: 0.8,
        metalness: 0.1
    });
    const matchstickGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
    const matchstick = new THREE.Mesh(matchstickGeometry, matchstickMaterial);
    
    // Matchstick head (red tip)
    const matchHeadMaterial = new THREE.MeshPhysicalMaterial({ 
        color: 0xff0000,
        roughness: 0.5,
        metalness: 0.2
    });
    const matchHeadGeometry = new THREE.SphereGeometry(0.07, 16, 16);
    const matchHead = new THREE.Mesh(matchHeadGeometry, matchHeadMaterial);
    matchHead.position.y = 0.8;
    
    // Match flame
    const flameGeometry = new THREE.ConeGeometry(0.1, 0.3, 16);
    const matchFlameMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff6600,
        emissive: 0xff6600,
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0.8
    });
    const matchFlame = new THREE.Mesh(flameGeometry, matchFlameMaterial);
    matchFlame.position.y = 1.0;

    // Add all parts to matchstick group
    matchstickGroup.add(matchstick);
    matchstickGroup.add(matchHead);
    matchstickGroup.add(matchFlame);
    matchstickGroup.visible = false;
    matchstickGroup.name = 'matchstickGroup';
    apparatusGroup.add(matchstickGroup);

    // Center the group at (0,0,0)
    apparatusGroup.position.set(0, 0, 0);
    scene.add(apparatusGroup);

    // Add a 3D metallic funnel at the edge of the inside (oil cup) container
    const funnelMat = new THREE.MeshPhysicalMaterial({ color: 0xcccccc, metalness: 0.85, roughness: 0.18 });
    // Main cone part (closed, not open-ended)
    const funnelCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 1.65, 20, 1, false), // taller cone
        funnelMat
    );
    // Place so the tip of the cone is at the edge of the oil cup (x ≈ 2)
    const oilCupEdgeX = 2.0;
    const coneHeight = 1.65;
    const coneBaseY = 7.28;
    const coneTipY = coneBaseY - coneHeight;
    // Shift the cone slightly up
    funnelCone.position.set(oilCupEdgeX - 1.82, coneBaseY - coneHeight/2 + 0.55 + 1.3, 2); // moved further up
    funnelCone.rotation.x = Math.PI; // Rotate 180 degrees so pointed part is down
    funnelCone.rotation.z = Math.PI / 8; // Tilt by ~22.5 degrees
    funnelCone.castShadow = funnelCone.receiveShadow = true;
    apparatusGroup.add(funnelCone);
    // Add the stem: calculate the tip position after rotation
    const stemHeight = 0.30;
    // Calculate the tip offset due to tilt (z-rotation)
    const tiltAngle = Math.PI / 8;
    const dx = - (coneHeight / 2) * Math.sin(tiltAngle);
    const dy = - (coneHeight / 2) * Math.cos(tiltAngle);
    // The tip position in world coordinates
    const tipX = (oilCupEdgeX - 1.75) + dx;
    const tipY = (coneBaseY - coneHeight/2 + 0.22) + dy;
    const tipZ = 2; // No z-tilt, so stays the same
    const funnelStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, stemHeight, 16),
        funnelMat
    );
    // Position the stem so its top touches the cone's tip, and its bottom touches the oil cup edge
    funnelStem.position.set(tipX, tipY - stemHeight/2 + 0.35 + 1.5, tipZ);
    funnelStem.castShadow = funnelStem.receiveShadow = true;
    apparatusGroup.add(funnelStem);

    // Rotate the matchstick group so the head is down and tail is up, and also 180 degrees around y-axis
 
    matchstickGroup.rotation.y = Math.PI; // 180 degrees around y-axis
    matchstickGroup.rotation.x = Math.PI ; // 180 degrees around x-axis

    // Add burner below the water bath (as the base)
    const burnerBaseMat = new THREE.MeshPhysicalMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 });
    const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 32), burnerBaseMat);
    burnerBase.position.set(0, 0, 0); // Now at y=0 (base)
    burnerBase.castShadow = burnerBase.receiveShadow = true;
    apparatusGroup.add(burnerBase);

    // Burner flame group (realistic)
    burnerFlame = new THREE.Group();
    burnerFlame.visible = false;
    // Blue inner core
    const innerFlameMat = new THREE.MeshPhysicalMaterial({ color: 0x2196f3, emissive: 0x2196f3, transparent: true, opacity: 1.0 });
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 32), innerFlameMat);
    innerFlame.position.y = 0.6;
    burnerFlame.add(innerFlame);
    // Yellow/orange outer flame
    const outerFlameMat = new THREE.MeshPhysicalMaterial({ color: 0xffa726, emissive: 0xffa726, transparent: true, opacity: 1.0 });
    const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.3, 32), outerFlameMat);
    outerFlame.position.y = 1.0;
    burnerFlame.add(outerFlame);
    // Faint blue ring at base
    const baseRingMat = new THREE.MeshBasicMaterial({ color: 0x42a5f5, transparent: true, opacity: 1.0 });
    const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 32, 64), baseRingMat);
    baseRing.position.y = 0.01;
    baseRing.rotation.x = Math.PI / 2;
    burnerFlame.add(baseRing);
    // Position the flame group just above the burner base
    burnerFlame.position.set(0, 0.25, 0);
    apparatusGroup.add(burnerFlame);

    // Remove the old flat glow ring logic
    // Add a large, semi-transparent, upward-facing cone for the outer rising flame
    const risingFlameMat = new THREE.MeshPhysicalMaterial({ color: 0xffa726, emissive: 0xffa726, transparent: true, opacity: 0.35 });
    const risingFlame = new THREE.Mesh(new THREE.ConeGeometry(4.5, 1.2, 64, 1, true), risingFlameMat); // Shorter height
    risingFlame.position.y = 0.6; // Snug under the container
    risingFlame.rotation.x = Math.PI; // Rotate 180 degrees on x-axis
    risingFlame.visible = false;
    burnerFlame.add(risingFlame);

    // Shift the entire water bath and contents up by 1.2 units
    waterBath.position.y += 1.2;
    if (waterMesh) waterMesh.position.y += 1.2;
    // Shift oil cup and related parts
    cupOuter.position.y += 1.2;
    cupInner.position.y += 1.2;
    oilMeniscus.position.y += 1.2;
    oilMesh.position.y += 1.2;
    lidOuter.position.y += 1.2;
    lidInner.position.y += 1.2;
    lidRim.position.y += 1.2;
    flamePortHole.position.y += 1.2;
    flamePortRim.position.y += 1.2;
    stirrer.position.y += 1.2;
    stirKnob.position.y += 1.2;
    oilHandleL.position.y += 1.2;
    oilHandleR.position.y += 1.2;
    spout.position.y += 1.2;
}

function makeThermoCanvas(temp) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // If experiment hasn't started, show black screen
    if (!experimentStarted) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 64);
        return canvas;
    }
    
    // When experiment is running, show temperature
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#0f0';
    ctx.font = 'bold 52px monospace'; // Increased font size from 44px to 52px
    ctx.fillText(temp + '°C', 20, 48); // Adjusted x position for larger text
    return canvas;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Update controls in animation loop
    controls.update();
    
    // Water fill animation
    if (waterMesh.visible && waterLevel < 1) {
        waterLevel = Math.min(1, waterLevel + 0.01); // Slower fill rate
        waterMesh.scale.y = waterLevel;
        waterMesh.position.y = waterBath.position.y + 3 * waterLevel; // Always inside bath

        // Add surface reflection effect when water is filling
        if (!waterMesh.surface && waterLevel > 0.1) {
            const surfaceGeo = new THREE.CircleGeometry(3.85, 64);
            const surface = new THREE.Mesh(surfaceGeo, waterSurfaceMaterial);
            surface.rotation.x = -Math.PI / 2;
            surface.position.y = waterBath.position.y + 3 + (waterLevel * 3);
            waterMesh.surface = surface;
            apparatusGroup.add(surface);
        }

        // Update surface position if it exists
        if (waterMesh.surface) {
            waterMesh.surface.position.y = waterBath.position.y + 3 + (waterLevel * 3);
            waterMesh.surface.position.y += Math.sin(Date.now() * 0.002) * 0.02;
        }
    }
    // Enhanced oil fill animation
    if (oilMesh.visible && oilLevel < 1) {
        oilLevel = Math.min(1, oilLevel + 0.01); // Slower fill rate
        oilMesh.scale.y = oilLevel;
        oilMesh.position.y = 2.2 + (oilLevel * 1.9); // Animate from bottom to fill height

        // Add oil surface effect when filling
        if (!oilMesh.surface && oilLevel > 0.1) {
            const surfaceGeo = new THREE.CircleGeometry(1.75, 64);
            const surface = new THREE.Mesh(surfaceGeo, oilSurfaceMaterial);
            surface.rotation.x = -Math.PI / 2;
            surface.position.y = oilMesh.position.y + (oilMesh.scale.y * 1.9);
            oilMesh.surface = surface;
            apparatusGroup.add(surface);
        }

        // Update oil surface position
        if (oilMesh.surface) {
            oilMesh.surface.position.y = 2.2 + (oilLevel * 3.8);
            // Add subtle movement to oil surface
            oilMesh.surface.position.y += Math.sin(Date.now() * 0.001) * 0.01;
        }
    }
    // Enhanced burner animation: visible flame and glow
    if (isHeating && heatingGlow < 1) {
        heatingGlow = Math.min(1, heatingGlow + 0.03);
        burnerFlame.visible = true;
        // Animate flame flicker for all flame parts
        const t = Date.now() * 0.005;
        // Outer flame flicker
        const outer = burnerFlame.children[1];
        if (outer) {
            outer.scale.x = 1 + 0.22 * Math.sin(t * 2) + 0.12 * Math.sin(t * 5);
            outer.scale.z = 1 + 0.22 * Math.cos(t * 2) + 0.12 * Math.cos(t * 5);
            outer.scale.y = 1 + 0.38 * Math.abs(Math.sin(t * 2.5));
            outer.material.opacity = 1.0 * heatingGlow;
        }
        // Inner flame flicker
        const inner = burnerFlame.children[0];
        if (inner) {
            inner.scale.x = 1 + 0.18 * Math.sin(t * 3.2);
            inner.scale.z = 1 + 0.18 * Math.cos(t * 2.7);
            inner.scale.y = 1 + 0.38 * Math.abs(Math.sin(t * 2.1));
            inner.material.opacity = 1.0 * heatingGlow;
        }
        // Base ring subtle pulse
        const ring = burnerFlame.children[2];
        if (ring) {
            ring.scale.setScalar(1 + 0.22 * Math.abs(Math.sin(t * 1.7)));
            ring.material.opacity = 1.0 * heatingGlow;
        }
        // Animate the rising outer flame (last child of burnerFlame)
        const rising = burnerFlame.children[3];
        if (rising) {
            rising.visible = isHeating || heatingGlow > 0.01;
            const t2 = Date.now() * 0.004;
            rising.scale.x = 1 + 0.18 * Math.sin(t2 * 2.1);
            rising.scale.z = 1 + 0.18 * Math.cos(t2 * 2.3);
            rising.scale.y = 1 + 0.12 * Math.abs(Math.sin(t2 * 1.7));
            rising.material.opacity = 0.35 * heatingGlow;
        }
    } else if (!isHeating && heatingGlow > 0) {
        heatingGlow = Math.max(0, heatingGlow - 0.03);
        burnerFlame.visible = heatingGlow > 0.01;
        // Fade out all flame parts
        for (let i = 0; i < burnerFlame.children.length; i++) {
            if (burnerFlame.children[i].material) {
                burnerFlame.children[i].material.opacity *= 0.95;
            }
        }
        // Animate the rising outer flame (last child of burnerFlame)
        const rising = burnerFlame.children[3];
        if (rising) {
            rising.visible = isHeating || heatingGlow > 0.01;
            const t2 = Date.now() * 0.004;
            rising.scale.x = 1 + 0.18 * Math.sin(t2 * 2.1);
            rising.scale.z = 1 + 0.18 * Math.cos(t2 * 2.3);
            rising.scale.y = 1 + 0.12 * Math.abs(Math.sin(t2 * 1.7));
            rising.material.opacity = 0.35 * heatingGlow;
        }
    }
    // Animate stir bar without affecting camera
    if (isStirring && stirBar && stirBar.visible) {
        stirBar.rotation.y += 0.3;
        stirKnob.rotation.y += 0.3;
    }
    // Remove flame holder animation
    if (isFlameApplied && flameHolder) {
        flameHolderAngle = 0;
        flameHolder.rotation.z = 0;
    }
    // Update digital thermometer
    if (digitalThermo && digitalThermoTexture) {
        digitalThermoTexture.image = makeThermoCanvas(currentTemperature);
        digitalThermoTexture.needsUpdate = true;
    }
    renderer.render(scene, camera);
}

// UI Logic
function setStatus(msg) {
    document.getElementById('status-indicator').textContent = msg;
}

function enable(id) {
    const el = document.getElementById(id);
    if (el) {
        el.disabled = false;
        el.classList.add('active-step');
    }
}

function disable(id) {
    const el = document.getElementById(id);
    if (el) {
        el.disabled = true;
        el.classList.remove('active-step');
    }
}

function resetAllControls() {
    const controls = [
        'fill-water-bath',
        'add-oil',
        'start-heating',
        'stir-oil',
        'apply-flame',
        'record-temp'
    ];
    
    controls.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = true;
            el.classList.remove('active-step');
        }
    });
}

function showTooltip(id, msg) {
    const el = document.getElementById(id);
    el.title = msg;
}

function resetExperiment() {
    // Reset all state variables
    isWaterBathFilled = false;
    isOilAdded = false;
    isHeating = false;
    isStirring = false;
    isFlameApplied = false;
    experimentStarted = false;
    currentTemperature = 25;
    observationRows = [];
    flashObservedTemp = null;
    flashCeasedTemp = null;
    flashPoint = null;
    waterLevel = 0;
    oilLevel = 0;
    heatingGlow = 0;

    // Clear all intervals
    if (heatingInterval) {
        clearInterval(heatingInterval);
        heatingInterval = null;
    }
    if (coolingInterval) {
        clearInterval(coolingInterval);
        coolingInterval = null;
    }

    // Reset 3D elements
    if (oilMesh) {
        oilMesh.visible = false;
        oilMesh.scale.y = 0.01;
        if (oilMesh.surface) {
            oilMesh.surface.visible = false;
        }
    }
    if (waterMesh) {
        waterMesh.visible = false;
        waterMesh.scale.y = 0.01;
        if (waterMesh.surface) {
            waterMesh.surface.visible = false;
        }
    }
    if (burnerFlame) {
        burnerFlame.visible = false;
        if (burnerFlame.glow) {
            burnerFlame.glow.visible = false;
        }
    }
    if (stirBar) {
        stirBar.visible = false;
    }
    if (testFlame) {
        testFlame.visible = false;
    }

    // Reset matchstick
    const matchstickGroup = apparatusGroup.getObjectByName('matchstickGroup');
    if (matchstickGroup) {
        matchstickGroup.visible = false;
    }

    // Reset UI elements
    setStatus('Ready');
    resetAllControls();
    enable('start-experiment');

    // Clear observation table
    const tbody = document.querySelector('#observationTableFlashPoint tbody');
    tbody.innerHTML = '';

    // Reset result display
    const resultDisplay = document.getElementById('result-display');
    resultDisplay.style.display = 'none';
    resultDisplay.innerHTML = '';

    // Reset digital thermometer
    if (digitalThermo && digitalThermoTexture) {
        digitalThermoTexture.image = makeThermoCanvas(currentTemperature);
        digitalThermoTexture.needsUpdate = true;
    }
}

function fillWaterBath() {
    isWaterBathFilled = true;
    setStatus('Water bath filled. Add oil.');
    enable('add-oil');
    disable('fill-water-bath');
    showTooltip('add-oil', 'Add oil sample to the cup.');
    // Animate water rising
    waterMesh.visible = true;
    waterLevel = 0;
    waterMesh.scale.y = 0.01;
    waterMesh.position.y = waterBath.position.y + 0.5;
}

function addOil() {
    isOilAdded = true;
    setStatus('Oil added. Start heating.');
    enable('start-heating');
    disable('add-oil');
    showTooltip('start-heating', 'Begin heating the oil.');
    
    // Show oil mesh
    oilMesh.visible = true;
    oilLevel = 0;
    
    // Reset position and scale for animation
    oilMesh.scale.y = 0.01;
    oilMesh.position.y = 2.2; // Start from bottom of inner cup
}

function startHeating() {
    if (isHeating) return; // Prevent multiple intervals
    
    console.log('Starting heating...'); // Debug log
    isHeating = true;
    setStatus('Heating... (Stir oil and apply test flame at any temperature)');
    enable('stir-oil');
    enable('apply-flame');
    enable('record-temp');
    showTooltip('stir-oil', 'Click to start/stop stirring.');
    showTooltip('apply-flame', 'Apply the test flame at any temperature.');
    showTooltip('record-temp', 'Record the temperature and whether flash is observed.');
    
    // Animate burner glow
    heatingGlow = 0;
    if (burnerFlame) {
        burnerFlame.visible = false;
    }
    
    // Clear any existing interval
    if (heatingInterval) {
        clearInterval(heatingInterval);
        heatingInterval = null;
    }
    
    // Start new heating interval
    heatingInterval = setInterval(() => {
        console.log('Temperature update:', currentTemperature); // Debug log
        if (currentTemperature < 80) {
            currentTemperature += 0.5; // Increase by 0.5°C per second
            updateThermometer();
        } else {
            clearInterval(heatingInterval);
            heatingInterval = null;
            isHeating = false;
            setStatus('Max temp reached. Apply flame or cool.');
            enable('cool-retest');
        }
    }, 1000); // 1 second interval
    
    console.log('Heating interval set:', heatingInterval); // Debug log

    // Show burner and flame
    if (burnerFlame) {
        burnerFlame.visible = true;
    }
}

function stirOil() {
    isStirring = !isStirring;
    setStatus(isStirring ? 'Stirring...' : 'Stirring stopped.');
    
    // Ensure controls are enabled
    if (controls) {
        controls.enabled = true;
    }
}

function applyFlame() {
    if (!isFlameApplied) {
        isFlameApplied = true;
        setStatus('Test flame applied. Record if flash observed.');

        // Pause temperature increase
        if (heatingInterval) {
            clearInterval(heatingInterval);
            heatingInterval = null;
        }

        // Get the matchstick group
        const matchstickGroup = apparatusGroup.getObjectByName('matchstickGroup');
        if (!matchstickGroup) return;

        // Make matchstick visible and set initial position
        matchstickGroup.visible = true;
        matchstickGroup.position.set(3, 9.2, 0); // raised even higher above the container
        // Rotate matchstick to hold it at an angle
        matchstickGroup.rotation.z = -Math.PI / 6;

        // Animate matchstick movement
        let startPos = new THREE.Vector3(3, 9.2, 0); // raised higher
        let endPos = new THREE.Vector3(1.7, 9.2, 0); // stops earlier on the right
        let startTime = Date.now();
        let duration = 1500; // 1.5 seconds for slower, more deliberate movement

        // Calculate flash probability (gentle slope)
        const baseProb = 0.16;
        const tempFactor = (currentTemperature - 20) / 60;
        const willFlash = Math.random() < (baseProb + tempFactor * 0.19);

        // Flame flicker animation
        function flickerFlame() {
            if (!matchstickGroup.visible) return;
            
            const flame = matchstickGroup.children[2]; // The flame is the third child
            if (flame) {
                flame.scale.x = 1 + 0.2 * Math.sin(Date.now() * 0.01);
                flame.scale.z = 1 + 0.2 * Math.cos(Date.now() * 0.012);
                flame.material.emissiveIntensity = 1.5 + 0.5 * Math.sin(Date.now() * 0.008);
            }
            
            if (isFlameApplied) {
                requestAnimationFrame(flickerFlame);
            }
        }

        function animateMatch() {
            let now = Date.now();
            let elapsed = now - startTime;
            let progress = Math.min(elapsed / duration, 1);

            // Move matchstick
            matchstickGroup.position.lerpVectors(startPos, endPos, progress);

            if (progress < 1) {
                requestAnimationFrame(animateMatch);
            } else {
                setTimeout(() => {
                    if (willFlash) {
                        createFlashEffect();
                        // Pause temp for 1s, then resume if heating was running
                        setTimeout(() => {
                            if (isHeating && !heatingInterval && currentTemperature < 80) {
                                heatingInterval = setInterval(() => {
                                    if (currentTemperature < 80) {
                                        currentTemperature += 0.5;
                                        updateThermometer();
                                    } else {
                                        clearInterval(heatingInterval);
                                        heatingInterval = null;
                                        isHeating = false;
                                        setStatus('Max temp reached. Apply flame or cool.');
                                        enable('cool-retest');
                                    }
                                }, 1000);
                            }
                        }, 1000); // 1 second pause after flash
                    } else {
                        // If no flash, resume temp increase immediately if heating was running
                        if (isHeating && !heatingInterval && currentTemperature < 80) {
                            heatingInterval = setInterval(() => {
                                if (currentTemperature < 80) {
                                    currentTemperature += 0.5;
                                    updateThermometer();
                                } else {
                                    clearInterval(heatingInterval);
                                    heatingInterval = null;
                                    isHeating = false;
                                    setStatus('Max temp reached. Apply flame or cool.');
                                    enable('cool-retest');
                                }
                            }, 1000);
                        }
                    }
                    
                    // Animate matchstick removal
                    let removeStartTime = Date.now();
                    function removeMatch() {
                        let removeProgress = Math.min((Date.now() - removeStartTime) / 1000, 1);
                        matchstickGroup.position.lerpVectors(endPos, startPos, removeProgress);
                        
                        if (removeProgress < 1) {
                            requestAnimationFrame(removeMatch);
                        } else {
                            matchstickGroup.visible = false;
                            isFlameApplied = false;
                        }
                    }
                    setTimeout(removeMatch, 1000);
                }, 1500);
            }
        }

        // Start animations
        animateMatch();
        flickerFlame();
    }
}

function createFlashEffect() {
    const flashGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(1.7, 7.8, 0);
    apparatusGroup.add(flash);

    // Animate flash
    let startTime = Date.now();
    let duration = 300; // 0.3 seconds

    function animateFlash() {
        let now = Date.now();
        let elapsed = now - startTime;
        let progress = elapsed / duration;

        if (progress < 1) {
            flash.material.opacity = 0.8 * (1 - progress);
            flash.scale.setScalar(1 + progress);
            requestAnimationFrame(animateFlash);
        } else {
            apparatusGroup.remove(flash);
        }
    }

    animateFlash();
}

function recordTemp() {
    // Remove restriction: allow recording even if isFlameApplied is false
    // Record temperature and flash observation
    let flash = confirm(`At ${currentTemperature}°C, was a flash observed? Click OK for Yes, Cancel for No.`);
    addObservationRow(currentTemperature, 'Yes', flash ? 'Yes' : 'No');

    if (flash) {
        observationRows.push({
            temperature: currentTemperature,
            flash: true
        });
    }

    isFlameApplied = false;
    updateResult();
}

function updateResult() {
    // Filter observations where flash was observed
    const flashObservations = observationRows.filter(row => row.flash === true);
    const resultDisplay = document.getElementById('result-display');

    if (flashObservations.length > 0) {
        // Calculate mean of all flash temperatures
        const sum = flashObservations.reduce((acc, curr) => acc + curr.temperature, 0);
        const mean = sum / flashObservations.length;

        // Update result display
        resultDisplay.innerHTML = `
            <p>Number of flash points observed: ${flashObservations.length}</p>
            <p>Temperatures where flash was observed: ${flashObservations.map(o => o.temperature + '°C').join(', ')}</p>
            ${flashObservations.length >= 2 ? 
                `<p>Mean Flash Point: <strong>${mean.toFixed(1)}°C</strong></p>` : 
                '<p>Record at least one more flash point temperature.</p>'}
        `;
    } else {
        resultDisplay.innerHTML = '<p>No flash points recorded yet.</p>';
    }
}

function calculateResult() {
    const flashObservations = observationRows.filter(row => row.flash === true);
    const resultDisplay = document.getElementById('result-display');

    // Hide result display initially
    resultDisplay.style.display = 'none';

    if (flashObservations.length < 2) {
        alert('Minimum 2 flash point observations are required to calculate the result. Please record more observations.');
        return;
    }

    // Show result display
    resultDisplay.style.display = 'block';

    // Calculate mean of all flash temperatures
    const sum = flashObservations.reduce((acc, curr) => acc + curr.temperature, 0);
    const mean = sum / flashObservations.length;
    
    // Calculate standard deviation
    const squareDiffs = flashObservations.map(obs => {
        const diff = obs.temperature - mean;
        return diff * diff;
    });
    const avgSquareDiff = squareDiffs.reduce((acc, curr) => acc + curr, 0) / flashObservations.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    resultDisplay.innerHTML = `
        <div class="result-content">
            <h4>Flash Point Analysis:</h4>
            <p><strong>Number of observations:</strong> ${flashObservations.length}</p>
            <p><strong>Observed temperatures:</strong> ${flashObservations.map(o => o.temperature + '°C').join(', ')}</p>
            <p><strong>Mean Flash Point:</strong> <span style="color:#007bff;font-size:1.2em">${mean.toFixed(1)}°C</span></p>
            <p><strong>Standard Deviation:</strong> ±${stdDev.toFixed(2)}°C</p>
            <div class="interpretation">
                ${getInterpretation(mean)}
            </div>
        </div>
    `;
}

function getInterpretation(flashPoint) {
    if (flashPoint < 60) {
        return '<p class="interpretation-text">This is a low flash point, indicating a more volatile oil. Exercise caution when handling.</p>';
    } else if (flashPoint < 100) {
        return '<p class="interpretation-text">This is a moderate flash point, typical for many lubricating oils.</p>';
    } else {
        return '<p class="interpretation-text">This is a high flash point, indicating a less volatile, safer oil.</p>';
    }
}

function coolRetest() {
    setStatus('Cooling... Apply flame and record when flash ceases.');
    if (heatingInterval) clearInterval(heatingInterval);
    if (burnerFlame) heatingGlow = 0;
    coolingInterval = setInterval(() => {
        if (currentTemperature > 20) {
            currentTemperature -= 0.2; // Slower cooling rate
            updateThermometer();
        } else {
            clearInterval(coolingInterval);
            setStatus('Min temp reached.');
        }
    }, 1000);
    enable('apply-flame');
    enable('record-temp');
    isCooling = true;
}

function addObservationRow(temp, flame, flash) {
    const tbody = document.querySelector('#observationTableFlashPoint tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${temp}</td><td>${flame}</td><td>${flash}</td>`;
    tbody.appendChild(tr);
    observationRows.push({ temp, flame, flash });
    // If cooling and flash is 'No', record as flashCeasedTemp
    if (isCooling && flash === 'No' && !flashCeasedTemp) {
        flashCeasedTemp = temp;
        setStatus('Flash ceased. You can now show result.');
        enable('show-result');
    }
}

function updateThermometer() {
    // Display temperature with one decimal place
    setStatus(`Current Temperature: ${currentTemperature.toFixed(1)}°C`);
    
    // Update digital thermometer display
    if (digitalThermo && digitalThermoTexture) {
        digitalThermoTexture.image = makeThermoCanvas(currentTemperature);
        digitalThermoTexture.needsUpdate = true;
    }
    
    console.log('Thermometer updated:', currentTemperature); // Debug log
}

function flashFlashEffect() {
    // Create a brief flash effect in the scene
    const flashGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.7 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    flashMesh.position.copy(testFlame.position);
    scene.add(flashMesh);
    setTimeout(() => { scene.remove(flashMesh); }, 600);
}

function showResult() {
    if (flashObservedTemp && flashCeasedTemp) {
        flashPoint = ((flashObservedTemp + flashCeasedTemp) / 2).toFixed(1);
        let interp = '';
        if (flashPoint < 60) interp = 'This is a low flash point, indicating a more volatile oil.';
        else if (flashPoint < 100) interp = 'This is a moderate flash point, typical for many lubricants.';
        else interp = 'This is a high flash point, indicating a less volatile, safer oil.';
        document.getElementById('result-display').innerHTML = `
            <b>Flash Observed Temperature:</b> ${flashObservedTemp}°C<br>
            <b>Flash Ceased Temperature:</b> ${flashCeasedTemp}°C<br>
            <b>Calculated Flash Point:</b> <span style="color:#007bff;font-weight:bold;">${flashPoint}°C</span><br>
            <i>${interp}</i><br>
            <button id="copy-result">Copy Result</button>
            <button id="download-result">Download Result</button>
        `;
        setStatus('Experiment complete.');
        document.getElementById('copy-result').onclick = function() {
            const text = `Flash Observed: ${flashObservedTemp}°C\nFlash Ceased: ${flashCeasedTemp}°C\nFlash Point: ${flashPoint}°C\n${interp}`;
            navigator.clipboard.writeText(text);
            setStatus('Result copied to clipboard!');
        };
        document.getElementById('download-result').onclick = function() {
            const text = `Flash Observed: ${flashObservedTemp}°C\nFlash Ceased: ${flashCeasedTemp}°C\nFlash Point: ${flashPoint}°C\n${interp}`;
            const blob = new Blob([text], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'flash_point_result.txt';
            a.click();
            setStatus('Result downloaded!');
        };
    } else {
        document.getElementById('result-display').innerHTML = 'Insufficient data.';
    }
}

// Event listeners
window.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
    resetExperiment();

    // Add specific control event listeners
    renderer.domElement.addEventListener('mousedown', () => {
        if (controls) controls.enabled = true;
    });

    renderer.domElement.addEventListener('touchstart', () => {
        if (controls) controls.enabled = true;
    });

    // Start Experiment button
    const startExperimentBtn = document.getElementById('start-experiment');
    if (startExperimentBtn) {
        startExperimentBtn.addEventListener('click', function() {
            console.log('Start experiment clicked');
            experimentStarted = true;
            setStatus('Experiment started. Fill water bath.');
            resetAllControls();
            enable('fill-water-bath');
            disable('start-experiment');
            showTooltip('fill-water-bath', 'Fill the water bath to the required level.');
            
            // Add power-on effect for display
            if (digitalThermo && digitalThermo.material) {
                digitalThermo.material.opacity = 0;
                let fadeIn = 0;
                const fadeInterval = setInterval(() => {
                    fadeIn += 0.1;
                    digitalThermo.material.opacity = fadeIn;
                    if (fadeIn >= 1) {
                        clearInterval(fadeInterval);
                    }
                }, 50);
            }
        });
    }

    // Other control buttons
    const controlButtons = {
        'fill-water-bath': fillWaterBath,
        'add-oil': addOil,
        'start-heating': startHeating,
        'stir-oil': stirOil,
        'apply-flame': applyFlame,
        'record-temp': recordTemp,
        'reset-experiment': resetExperiment,
        'calculate-result': calculateResult
    };

    // Add event listeners for all control buttons
    Object.entries(controlButtons).forEach(([id, handler]) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    });
});