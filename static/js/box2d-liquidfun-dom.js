var e_shapeBit = 0x0001;
var e_jointBit = 0x0002;
var e_aabbBit = 0x0004;
var e_pairBit = 0x0008;
var e_centerOfMassBit = 0x0010;

var canvasView = document.getElementById("debug");
var canvas = document.getElementsByTagName("canvas")[0] || document.getElementById("debug");
var VIEW = {};
VIEW.width    = canvas.getBoundingClientRect().width;
// Cambiar por la altura que contenga el view que se quiere del elemento en este caso toda la pagina
VIEW.height   = document.documentElement.scrollHeight;
VIEW.centerX  = VIEW.width / 2;
VIEW.centerY  = VIEW.height / 2;
VIEW.offsetX  = VIEW.width / 2;
VIEW.offsetY  = VIEW.height / 2;

var PTM = 52;

var world = null;
var mouseJointGroundBody = null;
var mouse = {
	x:0,
	y:0
}
var context;
var myDebugDraw;        
var myQueryCallback;
var mouseJoint = null;        
var run = true;
var frameTime60 = 0;
var statusUpdateCounter = 0;
var showStats = false;        
var mouseDown = false;
var shiftDown = false;        
var mousePosPixel = {
	x: 0,
	y: 0
};
var prevMousePosPixel = {
	x: 0,
	y: 0
};        
var mousePosWorld = {
	x: 0,
	y: 0
};        
var canvasOffset = {
	x: VIEW.offsetX,
	y: VIEW.offsetY
};        
var viewCenterPixel = {
	x:VIEW.centerX,
	y:VIEW.centerY
};

var dpi = 227;
// This gives us the gravity acceleration in pixels per square second
var gravityFactor = dpi * 9.81*100/2.54;
var gravityFactor = 10.0*PTM;
var gravityFactor = 10;
// var gravityFactor = 0;
var precision = 9;
var fps = 60;

var bodies = [];
var previous = undefined;

// shouldnt be a global :(
var particleColors = [
	new b2ParticleColor(0xff, 0x00, 0x00, 0xff), // red
	new b2ParticleColor(0x00, 0xff, 0x00, 0xff), // green
	new b2ParticleColor(0x00, 0x00, 0xff, 0xff), // blue
	new b2ParticleColor(0xff, 0x8c, 0x00, 0xff), // orange
	new b2ParticleColor(0x00, 0xce, 0xd1, 0xff), // turquoise
	new b2ParticleColor(0xff, 0x00, 0xff, 0xff), // magenta
	new b2ParticleColor(0xff, 0xd7, 0x00, 0xff), // gold
	new b2ParticleColor(0x00, 0xff, 0xff, 0xff) // cyan
];
var container;
var world = null;
var threeRenderer;
var renderer;
var camera;
var scene;
var objects = [];
var timeStep = 1.0 / 60.0;
var velocityIterations = 8;
var positionIterations = 3;
var projector = new THREE.Projector();
var planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

//var GenerateOffsets = Module.cwrap("GenerateOffsets", 'null');

// Funciones auxiliares
function myRound(val,places) {
	var c = 1;
	for (var i = 0; i < places; i++)
		c *= 10;
	return Math.round(val*c)/c;
}

function QueryCallback(point) {
	this.point = point;
	this.fixture = null;
}

QueryCallback.prototype.ReportFixture = function(fixture) {
	var body = fixture.body;
	if (body.GetType() === b2_dynamicBody) {
		var inside = fixture.TestPoint(this.point);
		if (inside) {
			this.fixture = fixture;
			return true;
		}
	}
	return false;
};


function getMouseCoords(event, canvasDOM) {
	var rect = canvasDOM.getBoundingClientRect();

	var mouse = new THREE.Vector3();
	// mouse.x = (event.clientX / VIEW.width) * 2 - 1;
	// mouse.y = -(event.clientY / VIEW.height) * 2 + 1;
	mouse.x = (event.clientX - rect.left - canvasOffset.x)/PTM;
	mouse.y = (- (event.clientY - rect.top) + canvasOffset.y)/PTM;
	mouse.z = 0.5;

	projector.unprojectVector(mouse, camera);
	var dir = mouse.sub(camera.position).normalize();
	var distance = -camera.position.z / dir.z;
	var pos = camera.position.clone().add(dir.multiplyScalar(distance));
	var p = new b2Vec2(pos.x, pos.y);
	return p;
}
				
function getWorldPointFromPixelPoint(pixelPoint) {
	// canvasOffset inicialmente es la mitad del tamaño del canvas se puede ir moviendo
	return {                
		x: (pixelPoint.x - canvasOffset.x)/PTM,
		y: (pixelPoint.y + canvasOffset.y)/PTM
	};
}

function updateMousePos(canvasDOM, evt) {
		var rect = canvasDOM.getBoundingClientRect();
		mousePosPixel = {
				x: evt.clientX - rect.left,
				y: - (evt.clientY - rect.top)
		};

		mousePosWorld = getWorldPointFromPixelPoint(mousePosPixel);
}

function onWindowResize() {
	// canvasView = document.getElementById("debug");
	VIEW.width = canvasView.getBoundingClientRect().width;
	// Cambiar por la altura que contenga el view que se quiere del elemento en este caso toda la pagina
	VIEW.height = document.documentElement.scrollHeight;

	camera.aspect = VIEW.width / VIEW.height;
	camera.updateProjectionMatrix();
	threeRenderer.setSize(VIEW.width, VIEW.height);
}

function startMouseJoint(that) {
		if ( mouseJoint != null )
				return;
		
		// Make a small box.
		var p = new b2Vec2(mousePosWorld.x, mousePosWorld.y);;
		var aabb = new b2AABB();
		var d = 0.001;            
		aabb.lowerBound = new b2Vec2(mousePosWorld.x - d, mousePosWorld.y - d);
		aabb.upperBound = new b2Vec2(mousePosWorld.x + d, mousePosWorld.y + d);
		
		// Query the world for overlapping shapes.            
		myQueryCallback.fixture = null;
		myQueryCallback.point = p;
		world.QueryAABB(myQueryCallback, aabb);
		
		if (myQueryCallback.fixture) {
				var body = myQueryCallback.fixture.body;
				var md = new b2MouseJointDef;
				md.bodyA = mouseJointGroundBody;
				md.bodyB = body;
				md.target = p;
				md.maxForce = 1000 * body.GetMass();
				that.mouseJoint = world.CreateJoint(md);
				body.SetAwake(true);
		}
}

function onMouseDown(that, canvasDOM, evt) {
		updateMousePos(canvasDOM, evt);
		if (!mouseDown)
			startMouseJoint(that);
		mouseDown = true;
		// updateStats();
}

// function onMouseDown(that, canvasDOM, evt) {
// 	var p = getMouseCoords(evt, canvasDOM);
// 	var aabb = new b2AABB;
// 	var d = new b2Vec2;

// 	d.Set(0.01, 0.01);
// 	b2Vec2.Sub(aabb.lowerBound, p, d);
// 	b2Vec2.Add(aabb.upperBound, p, d);

// 	var queryCallback = new QueryCallback(p);
// 	world.QueryAABB(queryCallback, aabb);

// 	if (queryCallback.fixture) {
// 		var body = queryCallback.fixture.body;
// 		var md = new b2MouseJointDef;
// 		md.bodyA = g_groundBody;
// 		md.bodyB = body;
// 		md.target = p;
// 		md.maxForce = 1000 * body.GetMass();
// 		that.mouseJoint = world.CreateJoint(md);
// 		body.SetAwake(true);
// 	}
// }


// function onMouseDown(that, canvasDom, evt) {
// 	mouse = new THREE.Vector2();

// 	var rect = threeRenderer.domElement.getBoundingClientRect();
// 	mouse.x = ( ( evt.clientX - rect.left ) / rect.width ) * 2 - 1;
// 	mouse.y = - ( ( evt.clientY - rect.top ) / rect.height ) * 2 + 1;

// 	var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
// 	// vector = vector.unproject(camera);

// 	var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
// 	var intersects = raycaster.intersectObjects(scene.children, true);

// 	if (intersects.length > 0) {
// 		var dd = scene.getObjectByName(intersects[0].object.name);
// 		const a = intersects[0].point;
// 		console.log(a);
// 		cameramove(a, dd);
// 	}

// }

// function onMouseMove(canvasDOM, evt) {
// 		prevMousePosPixel = mousePosPixel;
// 		updateMousePos(canvasDOM, evt);
// 		// updateStats();
// 		if ( shiftDown ) {
// 				canvasOffset.x += (mousePosPixel.x - prevMousePosPixel.x);
// 				canvasOffset.y -= (mousePosPixel.y - prevMousePosPixel.y);
// 				// draw();
// 		}
// 		else if ( mouseDown && mouseJoint != null ) {
// 				mouseJoint.SetTarget( new b2Vec2(mousePosWorld.x, mousePosWorld.y) );
// 		}
// }

// function onMouseMove(that, canvasDOM, evt) {
// 	var p = getMouseCoords(evt, canvasDOM);
// 		if (that.mouseJoint) {
// 			that.mouseJoint.SetTarget(p);
// 		}
// }

function onMouseMove(that, canvas, evt) {
		prevMousePosPixel = mousePosPixel;
		updateMousePos(canvas, evt);
		// updateStats();
		if ( shiftDown ) {
				canvasOffset.x += (mousePosPixel.x - prevMousePosPixel.x);
				canvasOffset.y -= (mousePosPixel.y - prevMousePosPixel.y);
				// draw();
		}
		else if ( mouseDown && mouseJoint != null ) {
			that.mouseJoint.SetTarget(new b2Vec2(mousePosWorld.x, mousePosWorld.y));
		}
}


// function onMouseMove( that, canvasDOM, event ) {
// 	// calculate mouse position in normalized device coordinates
// 	// (-1 to +1) for both components

// 	mouse.x = ( event.clientX / VIEW.width ) * 2 - 1;
// 	mouse.y = - ( event.clientY / VIEW.height ) * 2 + 1;
// 	// console.log(mouse);
// 	var p = getMouseCoords(event, canvasDOM);
// 		if (that.mouseJoint) {
// 			that.mouseJoint.SetTarget(p);
// 		}
// }

function onMouseUp(that, canvasDOM, evt) {
	mouseDown = false;
	updateMousePos(canvasDOM, evt);
	// updateStats();
	if ( mouseJoint != null ) {
			world.DestroyJoint(mouseJoint);
			mouseJoint = null;
	}
}

// function onMouseUp(that, canvasDOM, evt) {
// 	if (that.mouseJoint) {
// 		world.DestroyJoint(that.mouseJoint);
// 		that.mouseJoint = null;
// 	}
// }

function onMouseOut(canvasDOM, evt) {
		onMouseUp(canvasDOM, evt);
}

function onKeyDown(canvasDOM, evt) {
		//console.log(evt.keyCode);
		if ( evt.keyCode == 80 ) {//p
				// pause();
		}
		// else if ( evt.keyCode == 82 ) {//r
		// 		resetScene();
		// }
		else if ( evt.keyCode == 83 ) {//s
				// step();
		}
		else if ( evt.keyCode == 88 ) {//x
				// zoomIn();
		}
		else if ( evt.keyCode == 90 ) {//z
				// zoomOut();
		}
		else if ( evt.keyCode == 37 ) {//left
				canvasOffset.x += 32;
		}
		else if ( evt.keyCode == 39 ) {//right
				canvasOffset.x -= 32;
		}
		else if ( evt.keyCode == 38 ) {//up
				canvasOffset.y += 32;
		}
		else if ( evt.keyCode == 40 ) {//down
				canvasOffset.y -= 32;
		}
		else if ( evt.keyCode == 16 ) {//shift
				shiftDown = true;
		}
		
		// draw();
}

function onKeyUp(canvasDOM, evt) {
		if ( evt.keyCode == 16 ) {//shift
				shiftDown = false;
		}
}

function zoomIn() {
		var currentViewCenterWorld = getWorldPointFromPixelPoint(viewCenterPixel);
		PTM *= 1.1;
		var newViewCenterWorld = getWorldPointFromPixelPoint(viewCenterPixel);
		canvasOffset.x += (newViewCenterWorld.x-currentViewCenterWorld.x) * PTM;
		canvasOffset.y -= (newViewCenterWorld.y-currentViewCenterWorld.y) * PTM;
		// draw();
}

function zoomOut() {
		var currentViewCenterWorld = getWorldPointFromPixelPoint(viewCenterPixel);
		PTM /= 1.1;
		var newViewCenterWorld = getWorldPointFromPixelPoint(viewCenterPixel);
		canvasOffset.x += (newViewCenterWorld.x-currentViewCenterWorld.x) * PTM;
		canvasOffset.y -= (newViewCenterWorld.y-currentViewCenterWorld.y) * PTM;
		// draw();
}

var ResetWorld = function() {
	if (world !== null) {
		while (world.joints.length > 0) {
			world.DestroyJoint(world.joints[0]);
		}

		while (world.bodies.length > 0) {
			world.DestroyBody(world.bodies[0]);
		}

		while (world.particleSystems.length > 0) {
			world.DestroyParticleSystem(world.particleSystems[0]);
		}
	}
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = 100;
};

// Funciones principales
function init() {
	// For debugging
	// canvas = document.createElement('canvas');
	// canvas.width = VIEW.width;
	// canvas.height = VIEW.height;
	// canvas.oncontextmenu = function() { return false; };
	// canvas.onselectstart = function() { return false; };

	// canvasView.appendChild(canvas);
	// context = canvas.getContext('2d');
	
	// canvasOffset.x = VIEW.width/2;
	// canvasOffset.y = VIEW.height/2;
	
	// myDebugDraw = getCanvasDebugDraw();
	// myDebugDraw.SetFlags(e_shapeBit);
	
	// myQueryCallback = new JSQueryCallback();
	myQueryCallback = new QueryCallback(new b2Vec2(0, 0));


	// Se coloca el centro de la camara
	// setViewCenterWorld(new b2Vec2(0,0), true); ANTIGUO

	// NUEVO con THREE.js
	// camera = new THREE.PerspectiveCamera(35, VIEW.width / VIEW.height, 0.1, 10);


	// canvasView.appendChild(threeRenderer.domElement);

	var options = {
		devicePixelRatio: window.devicePixelRatio,
	};
	var element = canvas;
	if (element instanceof HTMLCanvasElement) {
	  options.canvas = element;
	}

	threeRenderer = new THREE.WebGLRenderer(options);
	threeRenderer.setClearColor(0xEEEEEE);
	threeRenderer.setSize(VIEW.width, VIEW.height);

	if (!options.canvas) {
	  element.appendChild(threeRenderer.domElement);
	  canvas = threeRenderer.domElement
	} else {
	  canvas = element;
	}

	scene = new THREE.Scene();
	// camera.lookAt(scene.position);


	// CAMERA v1
	const fov = 35; // AKA Field of View
	const aspect = canvas.clientWidth / canvas.clientHeight;
	const near = 0.1; // the near clipping plane
	const far = 100; // the far clipping plane

	// camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera = new THREE.OrthographicCamera(-VIEW.width/(PTM*2), VIEW.width/(PTM*2), VIEW.height/(PTM*2), -VIEW.height/(PTM*2), 1, 10);
	// every object is initially created at ( 0, 0, 0 )
	// we'll move the camera back a bit so that we can view the scene
	camera.position.set(0, 0, 10);
	// camera.lookAt(new THREE.Vector3(0, 0, 0));

	this.mouseJoint = null;

	// hack
	renderer = new Renderer();
	// var gravity = new b2Vec2(0, -gravityFactor);
	// world = new b2World(gravity);

	scene.add(camera);

	DomWorld();
}

function DomWorld(obj) {
	// Init world
	createWorld();
	//GenerateOffsets();

	// Controladores del mouse
	controlZone = document.documentElement;
	
	controlZone.addEventListener('keydown', function(evt) {
			onKeyDown(controlZone, evt);
	}, false);
	
	controlZone.addEventListener('keyup', function(evt) {
			onKeyUp(controlZone, evt);
	}, false);

	//Init
	var that = this;

	controlZone.addEventListener('mousedown', function(event) {
		onMouseDown(that, controlZone, event);
	});

	controlZone.addEventListener('mousemove', function(event) {
		onMouseMove(that, controlZone, event);
	});

	controlZone.addEventListener('mouseup', function(event) {
		onMouseUp(that, controlZone, event);
	});

	window.addEventListener('resize', onWindowResize, false );

}

function createWorld() {
	if (world != null)
		// destroy(world);
		ResetWorld();
	
	world = new b2World(new b2Vec2(0.0, -gravityFactor));
	// world.SetDebugDraw(myDebugDraw);

	mouseJointGroundBody = world.CreateBody(new b2BodyDef);

	// Creacion del suelo y las paredes
	var bd_ground = new b2BodyDef();
	bd_ground.restitution = 1.0;
	var ground = world.CreateBody(bd_ground);

	var aux_PTM = PTM;
	worldWidth = VIEW.width / aux_PTM;
	worldHeight = VIEW.height / aux_PTM;

	var groundShape1 = new b2EdgeShape();
	groundShape1.Set(new b2Vec2(-worldWidth/2, -worldHeight/2), new b2Vec2(worldWidth/2, -worldHeight/2));
	ground.CreateFixtureFromShape(groundShape1, 0.0);

	var groundShape2 = new b2EdgeShape();
	groundShape2.Set(new b2Vec2(-worldWidth/2, worldHeight/2), new b2Vec2(worldWidth/2, worldHeight/2));
	ground.CreateFixtureFromShape(groundShape2, 0.0);

	var groundShape3 = new b2EdgeShape();
	groundShape3.Set(new b2Vec2(-worldWidth/2, worldHeight/2), new b2Vec2(-worldWidth/2, -worldHeight/2));
	ground.CreateFixtureFromShape(groundShape3, 0.0);

	var groundShape4 = new b2EdgeShape();
	groundShape4.Set(new b2Vec2(worldWidth/2, worldHeight/2), new b2Vec2(worldWidth/2, -worldHeight/2));
	ground.CreateFixtureFromShape(groundShape4, 0.0);
}

function init_bodies() {
	// Se cargan los objetos que tenga una clase dada
	var ZERO = new b2Vec2(0, 0);
	var temp = new b2Vec2(0, 0);
	var i=0;
	document.querySelectorAll('.matter-body').forEach(function(value, key, parent) {
		// $('p').each(function () {
		// $(this).html('<span>' + $(this).text().split(' ').join('</span> <span>') + '</span>');
		// $(this).find('span').each(function () {
		// 	$(this).css('display', 'inline-block');

		var boundings = value.getBoundingClientRect();
		var left = boundings.left / PTM;
		var top = boundings.top / PTM;
		var width = value.offsetWidth / PTM;
		var height = value.offsetHeight / PTM;
		var angle;
		if(width === 0 || height === 0) {
			return;
		}
		var coordinates = {
			// x: left + width/2 -(VIEW.width/(2*PTM)),
			// y: - top - height/2 + (VIEW.height/(2*PTM))
			x: left,
			y: - top
		};
		
		var bodyDefinition = new b2BodyDef;
		bodyDefinition.type = b2_dynamicBody;
		// bodyDefinition.position.Set(coordinates.x, coordinates.y);
		// bodyDefinition.active = true;

		var body = world.CreateBody(bodyDefinition);
		// body.SetType(Module.b2_dynamicBody);

		shape = new b2PolygonShape;
		shape.SetAsBoxXYCenterAngle(width/2, height/2, new b2Vec2(0,0), 0);

		body.CreateFixtureFromShape(shape, 1.0);
		body.SetLinearVelocity(new b2Vec2(9, 5));
		body.SetAwake(true);
		// body.SetActive(1);

		bodies.push({
			coordinates: coordinates,
			domElement: value,
			box: body
		});
		i+=1;
	});


	// bd = new b2BodyDef;
	// bd.type = b2_dynamicBody;
	// body = world.CreateBody(bd);
	// shape = new b2PolygonShape;
	// shape.SetAsBoxXYCenterAngle(0.1*PTM, 0.1*PTM, new b2Vec2(-1*PTM, 0.5*PTM), 0);
	// body.CreateFixtureFromShape(shape, 1.0);
	// particleSystem.DestroyParticlesInShape(shape, body.GetTransform());

	// setup particles
	var psd = new b2ParticleSystemDef();
	psd.radius = 0.0025*PTM;
	psd.dampingStrength = 0.2;

	var particleSystem = world.CreateParticleSystem(psd);
	var box = new b2PolygonShape();
	box.SetAsBoxXYCenterAngle(0.1*PTM, 0.1*PTM, new b2Vec2(0, 0), 0);

	var particleGroupDef = new b2ParticleGroupDef();
	particleGroupDef.shape = box;
	var particleGroup = particleSystem.CreateParticleGroup(particleGroupDef);
}

function step_dom(timestamp) {
	// if (!previous) previous = timestamp;
	// var progress = timestamp - previous;
	// previous = timestamp;
	// world.Step(progress/(fps*1000), precision, precision);

	var x, y, position, angle;
	for(var body of bodies) {
		position = body.box.GetPosition();
		body.coordinates = position;
		angle = - body.box.GetAngle();
		x =   position.x*PTM + VIEW.width/2  - body.domElement.offsetWidth/2;
		y = - position.y*PTM + VIEW.height/2 - body.domElement.offsetHeight/2;

		x =   position.x*PTM + VIEW.width/2  - body.domElement.offsetWidth/2;
		y = - position.y*PTM + VIEW.height/2 - body.domElement.offsetHeight/2;

		$(body.domElement).css({
			transform: 'translate(' + x + 'px, ' + y + 'px) rotate(' + angle + 'rad)'
		});
	}
}

function step() {
		step_dom();

		if (!showStats) {
				world.Step(1.0/60.0, velocityIterations, positionIterations);
				return;
		}
		
		var current = Date.now();
		world.Step(1.0/60.0, velocityIterations, positionIterations);
		var frametime = (Date.now() - current);
		frameTime60 = frameTime60 * (59/60) + frametime * (1/60);
		
		// draw();
		statusUpdateCounter++;
		if (statusUpdateCounter > 20) {
			statusUpdateCounter = 0;
		}
}

// function draw() {
// 	//black background
// 	context.fillStyle = 'rgba(0,0,0, 0.8)';
// 	context.fillRect(0, 0, canvas.width, canvas.height);
	
// 	context.save();
// 	context.translate(canvasOffset.x, canvasOffset.y);
// 	context.scale(1,-1);
// 	context.scale(PTM, PTM);
// 	context.lineWidth = 1;
// 	context.lineWidth /= PTM;
	
// 	drawAxes(context);
	
// 	context.fillStyle = 'rgb(255,255,0)';
// 	world.DrawDebugData();
			
// 	if ( mouseJoint != null ) {
// 		//mouse joint is not drawn with regular joints in debug draw
// 		var p1 = mouseJoint.GetAnchorB();
// 		var p2 = mouseJoint.GetTarget();
// 		context.strokeStyle = 'rgb(204,204,204)';
// 		context.beginPath();
// 		context.moveTo(p1.x,p1.y);
// 		context.lineTo(p2.x,p2.y);
// 		context.stroke();
// 	}
				
// 		context.restore();
// }

function draw() {

}

window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
					window.webkitRequestAnimationFrame || 
					window.mozRequestAnimationFrame    || 
					window.oRequestAnimationFrame      || 
					window.msRequestAnimationFrame     || 
					function(callback){
						callback();
						// window.setTimeout(callback, 1000 / fps);
					};
})();

// function animate() {
// 		if (run) {
// 			requestAnimFrame(animate);
// 		}
		
// 		step();
// }

// var render = function() {
// 	// bring objects into world
// 	renderer.currentVertex = 0;
// 	step();
// 	renderer.draw();

// 	threeRenderer.render(scene, camera);
// 	requestAnimationFrame(render);
// };

function render() {
	if(run) {
		requestAnimFrame(render);
	}

	// bring objects into world
	renderer.currentVertex = 0;
	step();
  renderer.draw();

	threeRenderer.render(scene, camera);
}

function pause() {
	run = !run;
	if (run) {
			render();
	}
}

const afterDocumentLoaded = function(){
	// using(Box2D, "b2.+");
	init();
	init_bodies();
	render();
};

// Module = Box2D;
if(document.readyState === "complete"){
		afterDocumentLoaded()
} else {
		window.onload = afterDocumentLoaded
}
