import * as THREE from './threepeat/three/build/three.module.js';
import { OBJLoader } from './threepeat/three/examples/jsm/loaders/OBJLoader.js';

function Crv() {
    THREE.Curve.call( this );
}
Crv.prototype = Object.create( THREE.Curve.prototype );
Crv.prototype.constructor = Crv;

var w = window;

export var makecrv = function(getPoint) {
    let crv = new Crv();
    crv.getPoint = getPoint;

    // let cmat = new THREE.MeshBasicMaterial();
    // let cmsh = new THREE.Mesh( crv, cmat );

    return new THREE.TubeBufferGeometry(
        crv , 100, 1, 3, true );
}

export var loadmodel = function(name, onload) {
    var objload = new OBJLoader();
    var bmload = new THREE.TextureLoader();
    //bmload.setOptions( { imageOrientation: 'flipY' } );

    var mat, geo;

    bmload.load(
        // resource URL
        'mod/' + name + '.bmp',
        (tex) => {
            mat = new THREE.MeshBasicMaterial({ map: tex });

            objload.load(
                './mod/' + name + '.obj',
                ( object ) => {
                    object.traverse(( child ) => {
                        if ( child.geometry !== undefined ) {
                            geo = child.geometry;
                        }
                    });

                    if(onload) onload(geo, mat);
                },
                undefined,
                function ( error ) {
                    console.log(error);
                }
            );
        },
        undefined,
        function ( err ) {
            console.log( err);
        }
    );
}

export var formatters = {}

formatters['teapot3'] = (mesh) => {
    mesh.position.y = -50 * 0.25;
    mesh.scale.set(0.25, 0.25, 0.25);
    mesh.rotateX(-Math.PI/2);

    return mesh
}

export var makemodel = (name, onload) => {
    loadmodel(name, (geo, mat) => {
        var mesh = new THREE.Mesh( geo, mat );

        if(formatters[name]) {
            formatters[name](mesh);
        }

        if(onload) onload(mesh);
    });
};

export var Wrm = function(name, crv, nsegs) {

    var direction = new THREE.Vector3();
    var binormal = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var position = new THREE.Vector3();
    var lookAt = new THREE.Vector3();

    var segments = []

    loadmodel(name, (geo, mat) => {
        for(let i = 0; i < nsegs; i++) {
            var mesh = new THREE.Mesh( geo, mat );
            if(formatters[name]) { formatters[name](mesh); }

            segments[i] = new THREE.Group();
            segments[i].add(mesh)

            scene.add( segments[i] );
        }
    });

    this.update = function(T) {

        for(let i in segments) {

            let seg = segments[i];
            let t = (T + (i/nsegs)) % 1;

            crv.parameters.path.getPointAt( t, position );
            position.multiplyScalar( 1 );

            // interpolation

            var tangents = crv.tangents.length;
            var pickt = t * tangents;
            var pick = Math.floor( pickt );
            var pickNext = ( pick + 1 ) % tangents;

            binormal.subVectors( crv.binormals[ pickNext ], crv.binormals[ pick ] );
            binormal.multiplyScalar( pickt - pick ).add( crv.binormals[ pick ] );

            crv.parameters.path.getTangentAt( t, direction );
            var offset = 15;

            normal.copy( binormal ).cross( direction );

            // we move on a offset on its binormal

            position.add( normal.clone().multiplyScalar( offset ) );

            seg.position.copy( position );

            // using arclength for stablization in look ahead

            crv.parameters.path.getPointAt( ( t + 30 / crv.parameters.path.getLength() ) % 1, lookAt );
            lookAt.multiplyScalar( 1 );

            // camera orientation 2 - up orientation via normal

            if ( ! true ) lookAt.copy( position ).add( direction );
            seg.matrix.lookAt( seg.position, lookAt, normal );
            seg.quaternion.setFromRotationMatrix( seg.matrix );
        }
    }
}

export var Seq = function(args) {
    var tweens = [];
    var grp = new TWEEN.Group();

    // var state = {
    //     target: (new THREE.Vector3()).copy(args[0][1].target),
    //     position: (new THREE.Vector3()).copy(args[0][1].position),
    //     zoom: args[0][1].zoom
    // };

    var time = (t) => {
        return t * 1000;
    }

    var on = (v) => {
        //orbit.set(v);
        //console.log("onUpdate");
        console.log(v);
        camera.updateProjectionMatrix();
        camera.lookAt(0,0,0);
    }

    for(let i = 0; i < args.length; i++) {
        tweens[i] = new TWEEN.Tween(window.camera.position, grp)
            .to(args[i][1], time(args[i][0]))
            .easing(TWEEN.Easing.Sinusoidal.InOut)
            .onUpdate(on);

        let last = i == 0 ? args.length - 1 : i - 1;
        if(args[last][2]) {
            tweens[i].delay(time(args[last][2]))
        }
    }

    for(let i = 0; i < tweens.length - 1; i++) tweens[i].chain(tweens[i + 1]);
    tweens[tweens.length - 1].chain(tweens[0]);

    this.update = function(ms) {
        grp.update()
    }

    // on(state);
    tweens[1].start();
}
