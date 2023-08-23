import * as THREE from 'three'
import * as dat from 'lil-gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

let canvas, renderer, scene, camera, controls                           // scene config and controls
let sizes, aspectRatio, mouse, clock, oldElapsedTime                    // scene parameters and update variables
let normalMaterial, transparentMaterial, videoMaterial                  // materials
let video, videoWholeTex, planeGeometry, planeVideoMesh                 // webcam video
let debugGui                                                            // UI
let ambientLight                                                        // lights

let gltfLoader, teapotMesh
let textureLoader 
let organicColour, organicNormal, organiccHeight, organicAO, organicMat

// Array to store parameters used in the debug UI
const parameters = {
    testWebcam: false
}

init()  // initialises variables and calls all other initialisation functions
addSceneElements()      // adds scene elements (wall, cubes)

function init(){
    // Master function to initialise variables and call other initialisation functions
    mouse = new THREE.Vector2()
    gltfLoader = new GLTFLoader()
    textureLoader = new THREE.TextureLoader()

    //// Screen
    sizes = { width: window.innerWidth, height: window.innerHeight }
    aspectRatio = sizes.width / sizes.height

    normalMaterial = new THREE.MeshNormalMaterial()

    //// Update
    clock = new THREE.Clock()
    oldElapsedTime = 0

    //// Initialisers
    initScene()
    initGui()
    initWebcam()
    loadModels()
    loadTextures()
}

function initScene(){
    // Initialises all the key components of a three.js scene

    //// Rendering
    canvas = document.querySelector('canvas.webgl')
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    
    //// Scene, camera, controls lighting
    scene = new THREE.Scene()
    
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.set(0, 0, 8)
    scene.add(camera)
    camera.far = 10000

    controls = new OrbitControls(camera, canvas)    // orbit controls for viewing the scene during development
    controls.enableDamping = true

    ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    ambientLight.position.set(-3,2,3)
    scene.add(ambientLight)
}

function initGui(){
    // Initialises an instance of datGUI, a gui to be used during development. Hide this on the final product

    debugGui = new dat.GUI()
    debugGui.add(parameters, 'testWebcam').onChange( function() { getWebcam(parameters.testWebcam)})

    //debugGui.hide()
}

function initWebcam(){
    // Initialises all components needed to access the webcam

    video = document.getElementById("video")

    //// Setting up three.js components for rendering the webcam feed in the scene
      // This example renders a single video material on to multiple geometries

    const videoWholeTex = new THREE.VideoTexture(video)

    videoWholeTex.colorSpace = THREE.SRGBColorSpace
    videoMaterial = new THREE.MeshStandardMaterial({ map: videoWholeTex, side: THREE.DoubleSide })

    getWebcam(true) // Starts the webcam source, set true when testing and false when deploying to media wall

}

function getWebcam(testWebcam){
    if(testWebcam){
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
            const constraints = { video: true };
    
            navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
                video.srcObject = stream
                //video.Play()
            }).catch( function (error){
                console.error("Unable to access webcam. " + error)
            })
        }
        else{
            console.error("Mediadevices interface is not available on this device")
        }
    }
    else{
        const constraints = { video: {width:1920,height:1080} }

        navigator.mediaDevices.enumerateDevices(constraints).then( result => {
    
            result = result.filter( item => item.kind === 'videoinput' )
            const constraints = {video: {deviceId:result[1].deviceId} }
    
            navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
    
                video.srcObject = stream
                // alert('received stream')
    
                video.onloadedmetadata = function (e) {
                    video.setAttribute('autoplay', 'true')
                    video.setAttribute('playsinline', 'true')
                    video.play()
                }
    
            }).catch( function (error){
                console.error("Unable to access webcam. " + error)
            })
    
        })
    }
}

function loadModels(){
    // Loads all models
    // Utah teapot taken from https://www.cgtrader.com/free-3d-models/furniture/tableware/utah-teapot-c35df3fc-667e-47c4-90c6-9002491ce11b
    gltfLoader.load('/models/utah_teapot.glb',
    (gltf) => {
        console.log("Utah teapot loaded")
        console.log(gltf)   // Write gltf object to console to view model structure

        teapotMesh = gltf.scene
        scene.add(teapotMesh)

        teapotMesh.position.set(0,-3,1)
        teapotMesh.scale.set(10,10,10)
        
        // This model is split into groups, each group needs to be iterated through and the mesh
        // inside is assigned a material
        teapotMesh.children.forEach(element => {
            element.children.forEach(mesh => {
                mesh.material = videoMaterial
            })
        });
    })
}

function loadTextures(){
    // Texture loading ///

    organicColour = textureLoader.load('textures/organic/organic_colour.jpg')
    organicNormal = textureLoader.load('textures/organic/organic_normal.jpg')
    organiccHeight = textureLoader.load('textures/organic/organic_height.jpg')
    organicAO = textureLoader.load('textures/organic/organic_ao.jpg')

    // Materials ///

    organicMat = new THREE.MeshStandardMaterial({
        map: organicColour,
        normalMap: organicNormal,
        //aoMap: organicAO,
        //displacementMap: organiccHeight
    })
}

function addSceneElements(){
    createPlane(new THREE.Vector3(0,0,0), new THREE.Vector2(16, 9), videoMaterial)
    createBox(new THREE.Vector3(4,0,0), new THREE.Vector3(2,2,2), videoMaterial)
    createSphere(new THREE.Vector3(-4, 0, 0), 2, new THREE.Vector3(1,1,1), organicMat).rotation.set(0,-90,0)
}

function createPlane(position, size, material = normalMaterial){

    const planeGeo = new THREE.PlaneGeometry(size.x, size.y)
    const planeMesh = new THREE.Mesh(planeGeo, material)

    planeMesh.position.copy(position)

    scene.add(planeMesh)

    return planeMesh
}

function createBox(position, size = {x:1, y:1, z:1}, material = normalMaterial){
    // Creates a static box with a physics body. Used for the walls of the scene

    const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z)
    const boxMesh = new THREE.Mesh(boxGeo, material)

    boxMesh.position.copy(position)
    scene.add(boxMesh)

    return boxMesh
}

function createSphere(position, radius, scale, material = normalMaterial){
    
    const sphereGeo = new THREE.SphereGeometry(radius)
    const sphereMesh = new THREE.Mesh(sphereGeo, material)

    sphereMesh.position.copy(position)
    sphereMesh.scale.copy(scale)

    scene.add(sphereMesh)

    return sphereMesh
}

// Update /////
tick()

function tick(){
    // Update function, called every frame

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    renderer.render(scene, camera)

    window.requestAnimationFrame(tick)
}

// Utility functions //

function clamp(num, min, max){ 
    // Clamps a value (num) between a min and a max
    return Math.min(Math.max(num, min), max) 
}

function calculateScreenEdgePositon(){
    // Create a vector for each corner of the screen
    var topLeft = new THREE.Vector3(-1, 1, 0);
    var topRight = new THREE.Vector3(1, 1, 0);
    var bottomLeft = new THREE.Vector3(-1, -1, 0);
    var bottomRight = new THREE.Vector3(1, -1, 0);

    // Create a raycaster object
    var raycaster = new THREE.Raycaster();

    // Use the raycaster to get the world position of each screen corner
    raycaster.setFromCamera(topLeft, camera);
    var worldTopLeft = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldTopLeft);
    raycaster.setFromCamera(topRight, camera);
    var worldTopRight = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldTopRight);
    raycaster.setFromCamera(bottomLeft, camera);
    var worldBottomLeft = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldBottomLeft);
    raycaster.setFromCamera(bottomRight, camera);
    var worldBottomRight = new THREE.Vector3();
    raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, -1)), worldBottomRight);

    // Get the screen edges by taking the minimum and maximum values of the x and y coordinates
    minX = Math.min(worldTopLeft.x, worldTopRight.x, worldBottomLeft.x, worldBottomRight.x);
    maxX = Math.max(worldTopLeft.x, worldTopRight.x, worldBottomLeft.x, worldBottomRight.x);
    minY = Math.min(worldTopLeft.y, worldTopRight.y, worldBottomLeft.y, worldBottomRight.y);
    maxY = Math.max(worldTopLeft.y, worldTopRight.y, worldBottomLeft.y, worldBottomRight.y);

    // Log the screen edges
    //console.log("Min X:", minX, "  Max X:", maxX, "  Min Y:", minY, "  Max Y:", maxY);
}

// Event listeners - Called when certain input events are received.
window.addEventListener('keydown', function(event) {
    console.log(event.key.charCodeAt(0))
})

window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX / sizes.width * 2 - 1
    mouse.y = - (event.clientY / sizes.height) * 2 + 1
})

window.addEventListener('click', (event) => {
    console.log("Click")
})

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    
    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    
    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    //calculateScreenEdgePositon()
})