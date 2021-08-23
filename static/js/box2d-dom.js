var e_shapeBit = 0x0001;
var e_jointBit = 0x0002;
var e_aabbBit = 0x0004;
var e_pairBit = 0x0008;
var e_centerOfMassBit = 0x0010;

var canvasView = document.getElementById("debug");
var VIEW = {};
VIEW.width    = canvasView.getBoundingClientRect().width;
// Cambiar por la altura que contenga el view que se quiere del elemento en este caso toda la pagina
VIEW.height   = document.documentElement.scrollHeight;
VIEW.centerX  = VIEW.width / 2;
VIEW.centerY  = VIEW.height / 2;
VIEW.offsetX  = VIEW.width / 2;
VIEW.offsetY  = VIEW.height / 2;

var PTM = 32;

var world = null;
var mouseJointGroundBody;
var canvas;
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
var currentTest = null;

var dpi = 227;
// This gives us the gravity acceleration in pixels per square second
var gravityFactor = dpi * 9.81*100/2.54;
var gravityFactor = 0.0
var precision = 9;
var fps = 60;

var bodies = [];
var previous = undefined;


// Funciones auxiliares
function myRound(val,places) {
	var c = 1;
	for (var i = 0; i < places; i++)
		c *= 10;
	return Math.round(val*c)/c;
}

function getWorldPointFromPixelPoint(pixelPoint) {
	return {                
		x: (pixelPoint.x - canvasOffset.x)/PTM,
		y: (pixelPoint.y - (canvas.height - canvasOffset.y))/PTM
	};
}

function updateMousePos(canvas, evt) {
		var rect = canvas.getBoundingClientRect();
		mousePosPixel = {
				x: evt.clientX - rect.left,
				y: VIEW.height - (evt.clientY - rect.top)
		};

		mousePosWorld = getWorldPointFromPixelPoint(mousePosPixel);
}

function setViewCenterWorld(b2vecpos, instantaneous) {
		var currentViewCenterWorld = getWorldPointFromPixelPoint( viewCenterPixel );
		var toMoveX = b2vecpos.get_x() - currentViewCenterWorld.x;
		var toMoveY = b2vecpos.get_y() - currentViewCenterWorld.y;
		var fraction = instantaneous ? 1 : 0.25;
		canvasOffset.x -= myRound(fraction * toMoveX * PTM, 0);
		canvasOffset.y += myRound(fraction * toMoveY * PTM, 0);
}

function onMouseMove(canvas, evt) {
		prevMousePosPixel = mousePosPixel;
		updateMousePos(canvas, evt);
		// updateStats();
		if ( shiftDown ) {
				canvasOffset.x += (mousePosPixel.x - prevMousePosPixel.x);
				canvasOffset.y -= (mousePosPixel.y - prevMousePosPixel.y);
				// draw();
		}
		else if ( mouseDown && mouseJoint != null ) {
				mouseJoint.SetTarget( new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y) );
		}
}

function startMouseJoint() {
		
		if ( mouseJoint != null )
				return;
		
		// Make a small box.
		var aabb = new Box2D.b2AABB();
		var d = 0.001;            
		aabb.set_lowerBound(new b2Vec2(mousePosWorld.x - d, mousePosWorld.y - d));
		aabb.set_upperBound(new b2Vec2(mousePosWorld.x + d, mousePosWorld.y + d));
		
		// Query the world for overlapping shapes.            
		myQueryCallback.m_fixture = null;
		myQueryCallback.m_point = new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y);
		world.QueryAABB(myQueryCallback, aabb);
		
		if (myQueryCallback.m_fixture) {
				var body = myQueryCallback.m_fixture.GetBody();
				var md = new Box2D.b2MouseJointDef();
				md.set_bodyA(mouseJointGroundBody);
				md.set_bodyB(body);
				md.set_target( new Box2D.b2Vec2(mousePosWorld.x, mousePosWorld.y) );
				md.set_maxForce(1000 * body.GetMass());
				md.set_collideConnected(true);
				
				mouseJoint = Box2D.castObject(world.CreateJoint(md), Box2D.b2MouseJoint);
				body.SetAwake(true);
		}
}

function onMouseDown(canvas, evt) {
		updateMousePos(canvas, evt);
		if ( !mouseDown )
				startMouseJoint();
		mouseDown = true;
		// updateStats();
}

function onMouseUp(canvas, evt) {
		mouseDown = false;
		updateMousePos(canvas, evt);
		// updateStats();
		if ( mouseJoint != null ) {
				world.DestroyJoint(mouseJoint);
				mouseJoint = null;
		}
}

function onMouseOut(canvas, evt) {
		onMouseUp(canvas, evt);
}

function onKeyDown(canvas, evt) {
		//console.log(evt.keyCode);
		if ( evt.keyCode == 80 ) {//p
				pause();
		}
		// else if ( evt.keyCode == 82 ) {//r
		// 		resetScene();
		// }
		else if ( evt.keyCode == 83 ) {//s
				step();
		}
		else if ( evt.keyCode == 88 ) {//x
				zoomIn();
		}
		else if ( evt.keyCode == 90 ) {//z
				zoomOut();
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
		
		if ( currentTest && currentTest.onKeyDown )
				currentTest.onKeyDown(canvas, evt);
		
		// draw();
}

function onKeyUp(canvas, evt) {
		if ( evt.keyCode == 16 ) {//shift
				shiftDown = false;
		}
		
		if ( currentTest && currentTest.onKeyUp )
				currentTest.onKeyUp(canvas, evt);
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

function updateWorldFromDebugDrawCheckboxes() {
		var flags = 0;
		// if ( document.getElementById('drawShapesCheck').checked )
				flags |= e_shapeBit;
		// if ( document.getElementById('drawJointsCheck').checked )
				flags |= e_jointBit;
		// if ( document.getElementById('drawAABBsCheck').checked )
				flags |= e_aabbBit;
		/*if ( document.getElementById('drawPairsCheck').checked )
				flags |= e_pairBit;*/
		// if ( document.getElementById('drawTransformsCheck').checked )
				flags |= e_centerOfMassBit;

		myDebugDraw.SetFlags( flags );
}

// Funciones principales
function init() {
		// For debugging
		canvas = document.createElement('canvas');
    canvas.width = VIEW.width;
    canvas.height = VIEW.height;
    canvas.oncontextmenu = function() { return false; };
    canvas.onselectstart = function() { return false; };

    canvasView.appendChild(canvas);
		context = canvas.getContext('2d');
		
		canvasOffset.x = VIEW.width/2;
		canvasOffset.y = VIEW.height/2;
		
		// Controladores del mouse
		controlZone = document.documentElement;
		controlZone.addEventListener('mousemove', function(evt) {
				onMouseMove(controlZone, evt);
		}, false);
		
		controlZone.addEventListener('mousedown', function(evt) {
				onMouseDown(controlZone, evt);
		}, false);
		
		controlZone.addEventListener('mouseup', function(evt) {
				onMouseUp(controlZone, evt);
		}, false);
		
		// controlZone.addEventListener('mouseout', function(evt) {
		// 		onMouseOut(controlZone, evt);
		// }, false);
		
		controlZone.addEventListener('keydown', function(evt) {
				onKeyDown(controlZone, evt);
		}, false);
		
		controlZone.addEventListener('keyup', function(evt) {
				onKeyUp(controlZone, evt);
		}, false);
		
		myDebugDraw = getCanvasDebugDraw();            
		myDebugDraw.SetFlags(e_shapeBit);
		
		myQueryCallback = new Box2D.JSQueryCallback();

		myQueryCallback.ReportFixture = function(fixturePtr) {
				var fixture = Box2D.wrapPointer(fixturePtr, b2Fixture);
				if (fixture.GetBody().GetType() != Box2D.b2_dynamicBody) //mouse cannot drag static bodies around
						return true;
				if (! fixture.TestPoint( this.m_point ))
						return true;
				this.m_fixture = fixture;
				return false;
		};

		// Se coloca el centro de la camara
		setViewCenterWorld(new b2Vec2(0,0), true);

}

function createWorld() {
	if (world != null)
		Box2D.destroy(world);
	
	world = new Box2D.b2World(new Box2D.b2Vec2(0.0, -gravityFactor));
	// world.SetVelocityThreshold(0.0);
	world.SetDebugDraw(myDebugDraw);
	
	mouseJointGroundBody = world.CreateBody(new Box2D.b2BodyDef());

	// Creacion del suelo y las paredes
	var bd_ground = new Box2D.b2BodyDef();
	bd_ground.restitution = 1.0;
	var ground = world.CreateBody(bd_ground);
	var groundShape = new Box2D.b2EdgeShape();

	worldWidth = VIEW.width / PTM;
	worldHeight = VIEW.height / PTM;
	groundShape.Set(new Box2D.b2Vec2(-worldWidth/2, -worldHeight/2), new Box2D.b2Vec2(worldWidth/2, -worldHeight/2));
	ground.CreateFixture(groundShape, 0.0);

	groundShape.Set(new Box2D.b2Vec2(-worldWidth/2, worldHeight/2), new Box2D.b2Vec2(worldWidth/2, worldHeight/2));
	ground.CreateFixture(groundShape, 0.0);

	groundShape.Set(new Box2D.b2Vec2(-worldWidth/2, worldHeight/2), new Box2D.b2Vec2(-worldWidth/2, -worldHeight/2));
	ground.CreateFixture(groundShape, 0.0);

	groundShape.Set(new Box2D.b2Vec2(worldWidth/2, worldHeight/2), new Box2D.b2Vec2(worldWidth/2, -worldHeight/2));
	ground.CreateFixture(groundShape, 0.0);
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
			x: left - width/2,
			y: - top - height/2
		};
		
		var shape = new Box2D.b2PolygonShape();
		shape.SetAsBox(width/2, height/2);
		// bodyDefinition.set_position(new Box2D.b2Vec2(coordinates.x, coordinates.y));
		
		var bodyDefinition = new Box2D.b2BodyDef();
    bodyDefinition.set_type(Module.b2_dynamicBody);
    bodyDefinition.set_position(ZERO);
    
    var body = world.CreateBody(bodyDefinition);
		body.CreateFixture(shape, 5.0);

    // temp.Set(16*(Math.random()-0.5), 4.0 + 2.5*i);
    // body.SetTransform(temp, 0.0);
    body.SetLinearVelocity(ZERO);
    body.SetAwake(1);
    body.SetActive(1);

		bodies.push({
			coordinates: coordinates,
			domElement: value,
			box: body
		});
		i+=1;
	});
}

function step_bodies(timestamp) {
	// if (!previous) previous = timestamp;
	// var progress = timestamp - previous;
	// previous = timestamp;
	// world.Step(progress/(fps*1000), precision, precision);

	var x, y, position, angle;
	for(var body of bodies) {
		position = body.box.GetPosition();
		angle = - body.box.GetAngle();
		x = VIEW.width/2 + position.get_x()*PTM - body.domElement.offsetWidth/2;
		y = - (position.get_y()*PTM - VIEW.height/2 + body.domElement.offsetHeight/2);

		$(body.domElement).css({
			transform: 'translate(' + x + 'px, ' + y + 'px) rotate(' + angle + 'rad)'
		});
	}
}

function step() {
		// if (currentTest && currentTest.step) 
				// currentTest.step();
		step_bodies();

		if (!showStats) {
				world.Step(1/60, precision, precision);
				draw();
				return;
		}
		
		var current = Date.now();
		world.Step(1/60, precision, precision);
		var frametime = (Date.now() - current);
		frameTime60 = frameTime60 * (59/60) + frametime * (1/60);
		
		// draw();
		statusUpdateCounter++;
		if (statusUpdateCounter > 20) {
			// updateStats();
			statusUpdateCounter = 0;
		}
}

function draw() {
	//black background
	context.fillStyle = 'rgba(0,0,0, 0.8)';
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	context.save();
	context.translate(canvasOffset.x, canvasOffset.y);
	context.scale(1,-1);
	context.scale(PTM, PTM);
	context.lineWidth = 1;
	context.lineWidth /= PTM;
	
	drawAxes(context);
	
	context.fillStyle = 'rgb(255,255,0)';
	world.DrawDebugData();
			
	if ( mouseJoint != null ) {
		//mouse joint is not drawn with regular joints in debug draw
		var p1 = mouseJoint.GetAnchorB();
		var p2 = mouseJoint.GetTarget();
		context.strokeStyle = 'rgb(204,204,204)';
		context.beginPath();
		context.moveTo(p1.get_x(),p1.get_y());
		context.lineTo(p2.get_x(),p2.get_y());
		context.stroke();
	}
				
		context.restore();
}

window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       || 
						window.webkitRequestAnimationFrame || 
						window.mozRequestAnimationFrame    || 
						window.oRequestAnimationFrame      || 
						window.msRequestAnimationFrame     || 
						function( callback ){
							callback();
							// window.setTimeout(callback, 1000 / fps);
						};
})();

function animate() {
		if (run)
			requestAnimFrame(animate);

		step();
}


function pause() {
		run = !run;
		if (run)
				animate();
		// updateStats();
}


var Box2D;

if (!Box2D) Box2D = (typeof Box2D !== 'undefined' ? Box2D : null) || Module;

const afterDocumentLoaded = function(){
	using(Box2D, "b2.+");
	init();
	createWorld();
	init_bodies();
	// changeTest();
	animate();
};

Box2D().then(function(r){
	Box2D = r;
	Module = Box2D;
	if(document.readyState === "complete"){
			afterDocumentLoaded()
	} else {
			window.onload = afterDocumentLoaded
	}
});
