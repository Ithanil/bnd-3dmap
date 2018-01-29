var camera, scene, renderer, controls;
var clock;

var hemiLight, hemiLightHelper;

var plane, map, hmap;

var height_scale = 10;
var nvert_scale = 5;

//return array with height data from img
function getHeightData(img, vsize, hscale) {

    var width = img.width;
    var height = img.height;
    var size = width * height;
    if (vsize == undefined) vsize=size;
    if (hscale == undefined) hscale=1;
    var nvscale = Math.floor(Math.sqrt(size/vsize));
    var vwidth = Math.floor(width/nvscale);
    var vheight = Math.floor(height/nvscale);

    var canvas = document.createElement( 'canvas' );
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext( '2d' );
    context.drawImage(img,0,0);

    var imgd = context.getImageData(0, 0, width, height);
    var pix = imgd.data;

    var data = new Float32Array( vsize );
    for ( var i = 0; i < vsize; i ++ ) {
        data[i] = 0;
    }

    console.log("img.width: " + width + " img.height: " + height);
    console.log("size: " + size + " pix.length: " + pix.length);
    console.log("hscale: " + hscale + " nvscale: " + nvscale);

    var x,y;
    for (var j = 0; j<pix.length; j+=4) {
        var k = j/4;
        x = k%width;
        y = Math.floor(k/width);
        k = Math.floor(x/nvscale) + Math.floor(y/nvscale)*vwidth;
        data[k] += pix[j];
    }

    var hsum = 0;
    var scale2 = nvscale*nvscale/hscale;
    for ( var i = 0; i < vsize; i ++ ) {
        data[i] /= scale2;
        hsum += data[i];
    }
    hsum /= vsize;
    for ( var i = 0; i < vsize; i ++ ) {
        data[i] -= hsum;
    }

    //because current height map asset is "empty"
//    data = getRandomHeightData(size, 20);

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

// load color map to plane
function onloadMap(map, url, plane, nvscale){
    var texture = THREE.ImageUtils.loadTexture(url);
    texture.generateMipmaps = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;

    plane.geometry = new THREE.PlaneGeometry(map.width, map.height, map.width/nvscale-1, map.height/nvscale-1);
    plane.material = new THREE.MeshBasicMaterial( { map: texture } );
}

// load and apply height map to vertices
function onloadHeightMap(hmap, url, plane, hscale){
    var size = hmap.width*hmap.height;
    var vsize = plane.geometry.vertices.length;
    var data = getHeightData(hmap, vsize, hscale);

    console.log("size: " + size + " #vertices: " + vsize);
    //set height of vertices
    var z;
    for ( var i = 0; i<vsize; i++ ) {
        plane.geometry.vertices[i].z = data[i];
    }
}

function loadMap(url, onload, plane, scale){

    var newmap = new Image();
    newmap.src = url;

    if (newmap.complete) { // If the map has been cached
        onload(newmap, url, plane, scale);
    } else {
        newmap.onerror = function() {
            console.log("Error while loading map.");
        };
        newmap.onload = function() {
            onload(newmap, url, plane, scale);
            newmap.onload = null;
        };
    }
    return newmap;
}

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

    camera.position.z = 1000;

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

    // load map and create plane
    plane = new THREE.Mesh();
    map = loadMap('assets/map_tilecolors.png', onloadMap, plane, nvert_scale);
    var hmapInt = setInterval(function(){ //loads height map after map is loaded
        if (map!=undefined) if(map.complete) {
            hmap=loadMap('assets/map_height.png', onloadHeightMap, plane, height_scale);
            clearInterval(hmapInt);
        }
    }, 500);

    var planeInt = setInterval(function(){ //add plane to scene after hmap is loaded
        if (hmap!=undefined) if(hmap.complete) {
            scene.add(plane);
            clearInterval(planeInt);
        }
    }, 500);

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
