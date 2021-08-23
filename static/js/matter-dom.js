$(document).ready(function() {
	// Should reappear
	// document.getElementsByTagName("main")[0].style.visibility = "visible";
	var canvasView = document.getElementById("debug");
	var VIEW = {};
	VIEW.width    = canvasView.getBoundingClientRect().width;
	// Cambiar por la altura que contenga el view que se quiere del elemento en este caso toda la pagina
	VIEW.height   = document.documentElement.scrollHeight;
	VIEW.centerX  = VIEW.width / 2;
	VIEW.centerY  = VIEW.height / 2;
	VIEW.offsetX  = VIEW.width / 2;
	VIEW.offsetY  = VIEW.height / 2;

	// Matter.js module aliases
	var Engine    = Matter.Engine,
			Render    = Matter.Render,
			Runner    = Matter.Runner,
			Common    = Matter.Common,
			World     = Matter.World,
			Bodies    = Matter.Bodies,
			Body      = Matter.Body,
			Events    = Matter.Events,
			Query     = Matter.Query,
			MouseConstraint = Matter.MouseConstraint,
			Mouse     = Matter.Mouse;

	// create engine
	var engine    = Engine.create(),
			world     = engine.world;

	// Create Renderer
	var render = Render.create({
		engine: engine,
		element: document.getElementById("debug"),
		options: {
			width: VIEW.width,
			height: VIEW.height,
			background: 'transparent', // transparent to hide
			wireframeBackground: 'transparent', // transparent to hide
			// background: '#0a0a0a', 
			// wireframeBackground: '#222', 
			hasBounds: false,
			enabled: true,
			wireframes: false,
			showSleeping: true,
			showDebug: false,
			showBroadphase: false,
			showBounds: false,
			showVelocity: false,
			showCollisions: false,
			showAxes: false,
			showPositions: false,
			showAngleIndicator: false,
			showIds: false,
			showShadows: false
		}
	});

	// Disable to hide debug
	Render.run(render);

	// create runner
	var runner = Runner.create();
	Runner.run(runner, engine);

	var ceiling,
			wallLeft,
			wallRight,
			ground;

	// add walls
	var wallopts = {
			isStatic:     true,
			restitution:  0.2,
			friction:     1
	};
	var groundopts = {
			isStatic:     true,
			restitution:  0,
			friction:     2
	};

	World.add(world, [
		// ground
		ground    = Bodies.rectangle(VIEW.width/2, VIEW.height+50, VIEW.width+200, 100, groundopts),
		// walls
		ceiling   = Bodies.rectangle(VIEW.width/2, -50, VIEW.width+200, 100, wallopts), // top
		wallRight = Bodies.rectangle(VIEW.width+50, VIEW.height/2, 100, VIEW.height, wallopts), // right
		wallLeft  = Bodies.rectangle(-50, VIEW.height/2, 100, VIEW.height, wallopts) // left
	]);

	// OBJETOS
	var bodiesDom = document.querySelectorAll('.matter-body');
	var bodies = [];
	var dictBodies = {};
	var dictBodiesDom = {};
	for (var i = 0, l = bodiesDom.length; i < l; i++) {
		if (bodiesDom[i].classList.contains('hot')) {
			frA = 0.1;
			oY = -40;
		} else {
			frA = 0;
			oY = 0;
		}
		// if (bodiesDom[i].classList.contains('segment')) {
		if (true) {
			// Rectangles
			var body = Matter.Bodies.rectangle(
				VIEW.centerX + Math.floor(Math.random() * VIEW.width/2) - VIEW.width/4,
				oY,
				VIEW.width * bodiesDom[i].offsetWidth / VIEW.width,
				VIEW.height * bodiesDom[i].offsetHeight / VIEW.height, {
					restitution:      0.05,
					friction:         2,
					frictionAir:      frA,
					frictionStatic:   20,
					density:          100,
					// chamfer:          { radius: 4 },
					angle:            (Math.random() * 2.000) - 1.000
				}
			);
		}
		// else if (bodiesDom[i].classList.contains('page-nav')) {
		// 	// Balls
		// 	var body = Matter.Bodies.circle(
		// 		VIEW.centerX + Math.floor(Math.random() * VIEW.width/2) - VIEW.width/4,
		// 		0,
		// 		24, {
		// 			restitution:      0.3,
		// 			friction:         2,
		// 			frictionAir:      0,
		// 			frictionStatic:   2,
		// 			density:          100,
		// 			angle:            (Math.random() * 2.000) - 1.000
		// 		}
		// 	);
		// }
		// bodiesDom[i].id = body.id;
		if(bodiesDom[i].id === ""){
			bodiesDom[i].id = body.id;
		}
		
		bodies.push(body);
		dictBodies[body.id] = body;
		dictBodiesDom[body.id] = bodiesDom[i];
	}

	World.add(engine.world, bodies);

	// add gyro control
	var updateGravity = function(event) {
			var orientation = typeof window.orientation !== 'undefined' ? window.orientation : 0,
					gravity = engine.world.gravity;

			if (orientation === 0) {
					gravity.x = Common.clamp(event.gamma, -90, 90) / 90;
					gravity.y = Common.clamp(event.beta, -90, 90) / 90;
			} else if (orientation === 180) {
					gravity.x = Common.clamp(event.gamma, -90, 90) / 90;
					gravity.y = Common.clamp(-event.beta, -90, 90) / 90;
			} else if (orientation === 90) {
					gravity.x = Common.clamp(event.beta, -90, 90) / 90;
					gravity.y = Common.clamp(-event.gamma, -90, 90) / 90;
			} else if (orientation === -90) {
					gravity.x = Common.clamp(-event.beta, -90, 90) / 90;
					gravity.y = Common.clamp(event.gamma, -90, 90) / 90;
			}
	};

	window.addEventListener('deviceorientation', updateGravity);

	// CONTROLS
	// Add mouse control
	// var mouse = Mouse.create(render.canvas),
	var mouse = Mouse.create(
		document.documentElement
	),
	mouseConstraint = MouseConstraint.create(engine, {
		mouse: mouse,
		constraint: {
			stiffness: 1,
			render: {
				visible: false
			}
		}
	});

	World.add(engine.world, mouseConstraint);

	// keep the mouse in sync with rendering
	render.mouse = mouse;

	// Mouse Controller
	var mouseX,
		mouseY,
		mouseXO,
		mouseYO,
		mouseXN,
		mouseYN;

	// Hover
	// Elements with hover
	
	var elements = document.querySelectorAll('.segment');
	for(var i=0; i<elements.length; i++){
		 elements[i].addEventListener("mouseenter", mouseEnter);
		 elements[i].addEventListener("mouseleave", removeHovers);
		 // elements[i].addEventListener("mousedown", mouseDown);
		 // elements[i].addEventListener("dragstart", function(e) {
		 // 	console.log(e);
		 // });
	}

	function mouseEnter(e){
		// element == this
		mouseX = e.pageX;
		mouseY = e.pageY;
		removeHovers();

		// console.log(dictBodies[this.id]);
		// console.log(document.getElementById(this.id));
		// console.log(mouseX, mouseY);

		document.getElementById(this.id).className += " hover";
		document.body.style.cursor = "pointer";
	}

	// Events.on(mouseConstraint, "mousemove", function(e) {
	// 	mouseX = e.mouse.absolute.x;
	// 	mouseY = e.mouse.absolute.y;
	// 	if (Query.point(bodies, { x: mouseX, y: mouseY }).length) {
	// 		// remove exitsing hovers
	// 		removeHovers();
	// 		// apply new hover
	// 		var underMouse = Query.point(bodies, { x: mouseX, y: mouseY })[0].id;
	// 		document.getElementById(underMouse).className += " hover";
	// 		document.body.style.cursor = "pointer";
	// 	} else {
	// 		removeHovers();
	// 	}
	// });

	function removeHovers() {
		var hovered = document.getElementsByClassName("hover");
		for (var i = 0; i < hovered.length; i++) {
			hovered[i].classList.remove("hover");
		}
		document.body.style.cursor = "auto";
	}

	// function mouseDown(e) {
	// 	console.log(mouseConstraint.mousedown());
	// 	var bodyDom = this;
	// 	let shiftX = e.clientX - bodyDom.getBoundingClientRect().left;
	// 	let shiftY = e.clientY - bodyDom.getBoundingClientRect().top;

	// 	moveAt(bodyDom, e.pageX, e.pageY);

	// 	// moves the ball at (pageX, pageY) coordinates
	// 	// taking initial shifts into account
	// 	function moveAt(elem, pageX, pageY) {
	// 		var body = dictBodies[elem.id];
	// 		var pos = {x: pageX - shiftX, y: pageY - shiftY};
	// 		// elem.style.transform = "translate( " + pos.x +"px, " + pos.y +"px )";
	// 		// elem.style.transform += "rotate( " + body.angle + "rad )";

	// 		Matter.Body.setPosition(body, pos);
	// 	}

	// 	function onMouseMove(event) {
	// 		moveAt(bodyDom, event.pageX, event.pageY);
	// 	}

	// 	// move the ball on mousemove
	// 	document.addEventListener('mousemove', onMouseMove);

	// 	// drop the ball, remove unneeded handlers
	// 	bodyDom.onmouseup = function() {
	// 		document.removeEventListener('mousemove', onMouseMove);
	// 		bodyDom.onmouseup = null;
	// 	};
	// }

	// Events.on(mouseConstraint, "startdrag", function(e) {
	// 	console.log(e);
	// });
	mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
	mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

	// Press (1)
	Events.on(mouseConstraint, "mousedown", function(e) {
		mouseXO = e.mouse.absolute.x;
		mouseYO = e.mouse.absolute.y;
	});
	// Press (2), part 1 and 2 checks is not end of drag
	Events.on(mouseConstraint, "mouseup", function(e) {
		mouseXN = e.mouse.absolute.x;
		mouseYN = e.mouse.absolute.y;
		if ((mouseXO == mouseXN) && (mouseYO == mouseYN)) {
			if (Query.point(bodies, { x: mouseXN, y: mouseYN }).length) {
				var underMouse = Query.point(bodies, { x: mouseXN, y: mouseYN })[0].id;
			}
			if (underMouse) {
				// go to URL
				// window.location.href = document.getElementById(underMouse).getAttribute("data-url");
			}
		}
		removeHovers();
	});

	window.requestAnimationFrame(update);

	function update() {
		// strips
		for (var id_body in dictBodiesDom) {
			var bodyDom = dictBodiesDom[id_body];
			var body = dictBodies[id_body];

			if (body === null) continue;

			if (body.position.x == NaN || body.position.y == NaN) {

				var trans = bodyDom.style.transform.match(/translate\([^)]+\)/)[0];
				trans = trans.substr("translate(".length).split("px")
				var xpos = parseFloat(trans[0].match(/\d+(\.\d+)?/) || 0 [0]);
				var ypos = parseFloat(trans[1].match(/\d+(\.\d+)?/) || 0 [0]);
				Matter.Body.setPosition(body, {x: xpos, y: ypos});
			}

			if (body.position.x > VIEW.width || body.position.x < 0 || body.position.y > VIEW.height || body.position.y < 0) {
				var xpos = body.position.x, ypos = body.position.y;
				if (body.position.x > VIEW.width) {
					xpos = VIEW.width - bodyDom.offsetWidth/2;
				}

				if (body.position.x < 0) {
					xpos = body.width/2;
				}

				if (body.position.y > VIEW.height) {
					ypos = VIEW.height - bodyDom.offsetHeight/2;
				}

				if (body.position.y < 0) {
					ypos = body.height/2;
				}
				Matter.Body.setPosition(body, {x: xpos, y: ypos});
				// Anadir angulo tambien
			}

			bodyDom.style.transform = "translate( " +(body.position.x - bodyDom.offsetWidth / 2) +"px, " + (body.position.y - bodyDom.offsetHeight / 2) +"px )";
			bodyDom.style.transform += "rotate( " + body.angle + "rad )";
		}

		window.requestAnimationFrame(update);
	}
});