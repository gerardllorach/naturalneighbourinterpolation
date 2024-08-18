//@Cone Creation
// Natural Neighbour Interpolation
  // TODO
  /*
  - Store pixels
  - Create a new cone in the voronoi diagram
  - Compute difference between pixels
  - Compute areas and weights
  
  - Try a different approach:
  - Paint/Store a matrix 64x64 with the closest point index in each pixel
  - Introduce a new point and see how many "pixels" are taken from each existing point
  - Compare speed of processing
  
  
  - Implement both with simple methods:
  https://github.com/jagenjo/litescene.js/blob/master/guides/draw.md
  */


/*this.onMouseDown = function(e){
  console.log(e);
}*/

this.onStart = function()
{
  // Get components
  this.coneMesh = LS.ResourcesManager.meshes["gerard/voronoi/cone__Cone_mesh.wbin"];
  //var coneMesh = LS.ResourcesManager.getMesh("cone__Cone_mesh.wbin");
  
  if (!this.coneMesh){
    LS.ResourcesManager.load("gerard/voronoi/cone__Cone_mesh.wbin", undefined,
                             function(){console.log("Cone mesh loaded");});
  }
  
  
  // Get Camera
  var cams = LS.GlobalScene.getAllCameras();
  for (var i = 0; i<cams.length; i++){
    if (cams[i].type == LS.Camera.ORTHOGRAPHIC){
      this.camOrth = cams[i];
      break;
    }
  }
  // TODO: NOT WORKING PROPERLY
  // Modify layers
  if (!this.camOrth){
    // Create orthogonal camera
    this.camOrth = new LS.Camera();
    this.camOrth.setOrthographic(-1, 1, -1, 1)//left, right, bottom, top, near, far
    this.camOrth.setCenter([0,1,0]);
    this.camOrth.setEye([0, -1, 0]);
    this.camOrth.render_to_texture = true;
    var camNode = new LS.SceneNode();
    camNode.addComponent(this.camOrth);
    // Change layer
  	//camNode.setLayer("num", true/false);
    LS.GlobalScene.root.addChild(camNode);
	}
  
  
  // Pixels
  this.pixels = null;
  this.NNIPixels = null;
  // Cones
  this.conesW = {};
  this.cones = {}; // For painting points;
  // Target average
  this.startNNI = false;
	this.NNIUid;
}




// Before render
this.onSceneRender = function(){
  if (this.startNNI){
    // First store the pixels
  	this.pixels = this.camOrth._frame.getColorTexture().getPixels();
  	// Add a new cone for NNI
  	var coneNNI = this.addCone(this.targetNNI[0],this.targetNNI[1], 0.5);
    this.cones[coneNNI.uid] = coneNNI;
    this.NNIUid = coneNNI.uid;
    // Flag for computing the average
  	this.computeAverage = true;
  }
}



this.onUpdate = function(dt)
{
    
	node.scene.refresh();
}



// Script called when scene render finished
this.onAfterRender = function(){
  if (!this.camOrth){
    return;
  }
  if (!this.computeAverage)
    return;
  
  if (this.startNNI)
    this.startNNI = false;
  
  // Get the new pixels
  this.NNIPixels = this.camOrth._frame.getColorTexture().getPixels();
  // Compute differences
  // Pixels indx
  this.pixelsIndx = [];
  var p = this.pixels;
  var np = this.NNIPixels;
  // Check differences between pixels without the new averaging cone
  for (var i = 0; i < this.pixels.length/4; i++){
    var ii = i*4;
    var diff = p[ii]-np[ii] + p[ii+1]-np[ii+1] + p[ii+2]-np[ii+2];
    // Store index
    if (diff != 0)
      this.pixelsIndx.push(i);
  }
  
  // Reset weights
  var keys = Object.keys(this.conesW);
  for (var i = 0; i<keys.length; i++) this.conesW[keys[i]] = 0;
    
  // Compute weights
  for (var i = 0; i<this.pixelsIndx.length; i++){
    var ii = this.pixelsIndx[i]*4;
    var id = this.rgb2hex([p[ii], p[ii+1], p[ii+2]], 255);
    //if (this.conesW[id] !== undefined)
    	this.conesW[id] += 1;
  }
  
}





this.addCone = function(px, py, alpha){
  // if mesh is not loaded
  if (!this.coneMesh){
    this.coneMesh = LS.ResourcesManager.meshes["gerard/voronoi/cone__Cone_mesh.wbin"];
    if (!this.coneMesh){
    	console.error("Cone mesh not found.");
    	return;
    }
  }
  console.log("here");
  // Create material
  var coneMat = new LS.StandardMaterial();
  // Shadeless
  coneMat.flags.ignore_lights = true;
  // Random color
  coneMat.setProperty("color", [Math.random(),Math.random(),Math.random()]);
  // Opacity if alpha is set (for NNI)
  if (alpha !== undefined){
    coneMat.setProperty("opacity", alpha);
    coneMat.setProperty("blend_mode", "alpha");
    coneMat.setProperty("color", [1,1,1]);
  }
  
  // Create mesh component
  var meshRendererComp = new LS.Components.MeshRenderer();
  meshRendererComp.mesh = this.coneMesh;//LS.ResourcesManager.meshes["gerard/voronoi/cone__Cone_mesh.wbin"];
  //meshRendererComp.material = coneMat;
  
  // Create node
  var coneNode = new LS.SceneNode();
  coneNode.addComponent(meshRendererComp);
  coneNode.material = coneMat;
  // Rotate -90 deg in X and scale
  coneNode.transform.rotateX(-90);
  coneNode.transform.setScale(16, 16, 16);
  
  // Set position according to click
  coneNode.transform.setPosition((px-0.5)*10, -1, (py-0.5)*10);
  
  // Change layer
  //coneNode.setLayer("num", true/false);
  
  // Add Node to Scene
  node.addChild(coneNode);
  
  // Return id of node
  return coneNode;
}

this.moveCone = function(uid, px, py){
  var coneNNI = LS.GlobalScene.getNodeByUId(uid);
  
  if (!coneNNI)
    return;
  coneNNI.transform.position[0] = (px-0.5)*10;
  coneNNI.transform.position[2] = (py-0.5)*10;
  coneNNI.transform.mustUpdate = true; 
}







this.onRenderGUI = function(){
  
  width = w = gl.viewport_data[2];
  height = h = gl.viewport_data[3];
  
  if (LS.RUNNING != LS.GlobalScene.state)
    return;
  
  
  gl.start2D();
  
  // LEFT MOUSE
  if (gl.mouse.left_button && !this._clicked){
		this._clicked = true;
    var coneNode = this.addCone(gl.mouse.x/w, (h - gl.mouse.y)/h);
    // Add coneNode to list of areas
    var id = this.rgb2hex(coneNode.material.color);
		this._selCone = coneNode;
    this.conesW[id] = 0;
    this.cones[id] = coneNode;
    console.log("Cone created with hex color: ", id);
    
  }
  // Dragging cone
  else if (gl.mouse.left_button){
    if (this._selCone){
      this.moveCone(this._selCone.uid, gl.mouse.x/w, (h - gl.mouse.y)/h);
    }
  }
  else if (!gl.mouse.left_button){
    this._clicked = false;
    this._selCone = null;
  }
  
  // RIGHT MOUSE
  if (gl.mouse.middle_button && !this._rclick){
    this._rclick = true;
    // Start NNI (store previous pixels and compute averaging)
    this.startNNI = true;
    this.targetNNI = [gl.mouse.x/w, (h - gl.mouse.y)/h];
    
  } else if (!gl.mouse.middle_button && this._rclick){
    this._rclick = false;
    this.computeAverage = false;
    // Remove node
    var NNIcone = this.cones[this.NNIUid];//LS.GlobalScene.getNodeByUId(this.NNIUid);
   	NNIcone.parentNode.removeChild(NNIcone);
    delete this.cones[this.NNIUid];
  }
  // Mouse dragged
  else if (gl.mouse.middle_button){
    // DRAG CONE - Dragging cone
		this.moveCone(this.NNIUid, gl.mouse.x/w, (h - gl.mouse.y)/h);
       
    // Show weights
    var totalP =  this.pixelsIndx.length;
    var keys = Object.keys(this.conesW);
    
    // Paint background rectangle
    var rx = 70; var ry = 85; var rw = 20; var rh = 15;
    gl.fillStyle = "rgba(127,127,127,0.5)";
    gl.fillRect(rx-rw, ry-rh/2, 130, keys.length * rw + rh);
     
    var lastP = 0;
    for (var i = 0; i<keys.length; i++){
      var percentage = this.conesW[keys[i]]/totalP;
      var text = ( percentage * 100).toFixed(2) + "%";
      
      // TEXT - Paint text and percentage
      gl.strokeStyle = "black";
      gl.font = "15px Arial";
      gl.fillStyle = "rgba(255,255,255,0.8)";
      gl.textAlign = "left";
      gl.fillText(text, 100, i*20+100);
      //gl.strokeText(text, 100, i*20+100);
      
      // LEGEND COLORS - Paint legend of colors
      var c = hexColorToRGBA(keys[i]);
      gl.fillStyle = "rgba(" + c[0]*255 + "," + c[1]*255 + "," + c[2]*255 + ",0.8)";
      gl.fillRect(70, i*20+85, 20, 15);
      gl.strokeRect(70, i*20+85, 20, 15);
      
      // PERCENTAGE CAKE - Paint cake
      var centerX = width-130; var centerY = 130;
      gl.strokeStyle = "rgba(255,255,255,0.8)";
      gl.lineWidth = 2;
      gl.beginPath();
      gl.moveTo(centerX,centerY);
      gl.arc(centerX,centerY,100, lastP*2*Math.PI, (percentage+lastP)*2*Math.PI);
      gl.lineTo(centerX, centerY);
      gl.closePath();
      gl.fill();
      gl.stroke();
      lastP += percentage;
    }
  }
  
  // POINT POINTS - won't work if window is resized
  var keys = Object.keys(this.cones);
  for (var i = 0; i<keys.length; i++){
    var coneNode = this.cones[keys[i]];
    var posCone = coneNode.transform.position;
    centerX = w*(0.5+posCone[0]/10); centerY = h*(0.5+posCone[2]/10);
    gl.strokeStyle = "rgba(0,0,0,0.5)";
    gl.lineWidth = 2;
    gl.beginPath();
    gl.arc(centerX,centerY,5, 0, 2*Math.PI);
    gl.closePath();
    gl.stroke();
  }
  
  
  // Show instructions
  gl.fillStyle = "rgba(0,0,0,0.5)";
  gl.fillRect(40, h-85, 400, 60);
  gl.strokeStyle = "black";
  gl.font = "15px Arial";
  gl.fillStyle = "rgba(255,255,255,0.8)";
  gl.textAlign = "left";
  var text = "Middle mouse for Natural Neighbour Interpolation.\nLeft mouse to create new neighbours.";
  gl.fillText(text, 60, h-40);
  
  
  gl.finish2D();
}



this.rgb2hex = function(rgb, range){
  var r = rgb[0];
  var g = rgb[1];
  var b = rgb[2];
  
  if (range != 255){
    // Check if range is from 0-1 and translate to 0-255
    if (r % 1 != 0 || g % 1 != 0 || b % 1 != 0 ||
       (r <1 && g <1 && b <1)){
      r *= 255;
      g *= 255;
      b *= 255;
    }
  }

  r = Math.round(r); g = Math.round(g); b = Math.round(b);
  // RGB to Hex
  return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}