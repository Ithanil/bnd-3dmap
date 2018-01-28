var camera, scene, renderer, controls;
var clock;

var hemiLight, hemiLightHelper;

var plane, map, hmap;

//return array with height data from img
function getHeightData(img,scale) {

    if (scale == undefined) scale=1;

    var canvas = document.createElement( 'canvas' );
    canvas.width = img.width;
    canvas.height = img.height;
    var context = canvas.getContext( '2d' );

    var size = img.width * img.height;
    var data = new Float32Array( size );

    context.drawImage(img,0,0);

    for ( var i = 0; i < size; i ++ ) {
        data[i] = 0;
    }

    console.log("img.width: " + img.width + " img.height: " + img.height);
    var imgd = context.getImageData(0, 0, img.width, img.height);
    var pix = imgd.data;
    console.log("size: " + size + " pix.length: " + pix.length);

    var j = 0;
    for (var i = 0; i<pix.length; i +=4) {
        data[j++] = pix[i]*scale;
        //console.log(pix[i] + " " + pix[i+1] + " " + pix[i+2] + " " + pix[i+3]);
    }

    return data;
}

// return array with random height data
function getRandomHeightData(size, scale) {
    var data = new Float32Array( size );
    for (var i = 0; i<size; i++) {
        data[i] = scale*Math.random();
    }
    return data;
}

function onloadMap(map, loaded, url, plane){
    // load map to plane

    var texture = THREE.ImageUtils.loadTexture(url);
    texture.generateMipmaps = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;

    plane.geometry = new THREE.PlaneGeometry(map.width, map.height);
    plane.material = new THREE.MeshBasicMaterial( { map: texture } );
}

function onloadHeightMap(hmap, loaded, url, plane){
    var size = hmap.width*hmap.height;
    var data = getHeightData(hmap,1);

    //set height of vertices
    for ( var i = 0; i<plane.geometry.vertices.length; i++ ) {
        plane.geometry.vertices[i].z = data[i];
    }
}

function loadMap(url, onload, plane){

    var newmap = new Image();
    newmap.src = url;

    if (newmap.complete) { // If the map has been cached
        onload(newmap, true, url, plane);
    } else {
        newmap.onerror = function() {
            onload(newmap, false, url, plane);
        };
        newmap.onload = function() {
            onload(newmap, true, url, plane);
            newmap.onload = null;
        };
    }
    return newmap;
}

var myVar = setInterval(function(){
    if( map.complete ) {
        hmap=loadMap('assets/map_height.png', onloadHeightMap, plane);
        clearInterval(myVar);
    }
}, 500);

function init( ) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var aspect = width/height;

    scene = new THREE.Scene( );
    scene.background = new THREE.Color( 0, 0, 0, 0 );
    scene.fog = new THREE.Fog( scene.background, 1, 5000 );

    camera = new THREE.PerspectiveCamera( 75, aspect, 0.1, 5000 );
    scene.add( camera );

    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
    renderer = Detector.webgl ? ( new THREE.WebGLRenderer( { antialias: true } ) ) : ( new THREE.CanvasRenderer( ) );
    renderer.setSize( width, height );
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.renderReverseSided = false;

    document.body.appendChild( renderer.domElement );

    camera.position.z = 175;

    clock = new THREE.Clock();

    // Setup the orbit controls.
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.target.set( 0, 0, 0 );
    controls.update( );

    // Setup a resize listener.
    window.addEventListener( 'resize', onWindowResize, false );

    setupScene( );
}

function setupScene( )
{

    // light
    hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.8 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 50, 0 );
    hemiLight.visible = true;
    scene.add( hemiLight );

    hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
    scene.add( hemiLightHelper );

    //create map plane
    plane = new THREE.Mesh( );
    scene.add(plane);

    // load maps
    map = loadMap('assets/map_tilecolors.png', onloadMap, plane);

    // Setup shaders.
    var vertexShader = document.getElementById( 'vertexShader' ).textContent;
    var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
    var uniforms = {
        topColor:    { value: new THREE.Color( 0x0077ff ) },
        bottomColor: { value: new THREE.Color( 0xffffff ) },
        offset:      { value: 33 },
        exponent:    { value: 0.6 }
    };
    uniforms.topColor.value.copy( hemiLight.color );
    scene.fog.color.copy( uniforms.bottomColor.value );

    // sky
    var vertexShader = document.getElementById( 'vertexShader' ).textContent;
    var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
    var uniforms = {
        topColor:    { value: new THREE.Color( 0x0077ff ) },
        bottomColor: { value: new THREE.Color( 0xffffff ) },
        offset:      { value: 33 },
        exponent:    { value: 0.6 }
    };
    uniforms.topColor.value.copy( hemiLight.color );
    scene.fog.color.copy( uniforms.bottomColor.value );

    var skyGeo = new THREE.SphereGeometry( 4000, 32, 15 );
    var skyMat = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );

    var sky = new THREE.Mesh( skyGeo, skyMat );
    scene.add( sky );
}

function onWindowResize( )
{
    var width = window.innerWidth;
    var height = window.innerHeight;
    camera.aspect = width/height;
    camera.updateProjectionMatrix( );

    renderer.setSize( width, height );
}

function render( )
{
    var delta = clock.getDelta();
    var elapsed = clock.elapsedTime;

    //camera.lookAt(...);

    renderer.render( scene, camera );
}

function update() {
    requestAnimationFrame( update );
    render();
}

init();
update();
