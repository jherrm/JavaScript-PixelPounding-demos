/*
	Author: Jeremy Herrman
	For now ,this is a direct python to javascript port of Dave Menninger's Parametric Snowflake gcode generator.
		https://github.com/davemenninger/Parametric-GCode/blob/master/para_snowflake.py
		http://www.thingiverse.com/thing:1388
		License: CC-BY-SA

*/
var Point;
(function() {
	Point = function(x, y) {
		var self = this;
		self.x = x;
		self.y = y;
	};

	var members = {

		// Generate GCode for 3D printing
		toString: function() {
			var self = this;
			// Added rounding
			return "G1 X" + self.x.toFixed(2) + " Y" + self.y.toFixed(2);
		},

		// Rotate the XY point of the Point
		rotate: function(theta) {
			var self = this;
			var oldX = self.x;
			var oldY = self.y;
			self.x = oldX * Math.cos(theta) - oldY * Math.sin(theta);
			self.y = oldX * Math.sin(theta) + oldY * Math.cos(theta);
		},

		// Add relative moves
		relative_move: function(xMove, yMove) {
			var self = this;
			self.x += xMove;
			self.y += yMove;
		},

		// Clone Method
		clone: function() {
			var self = this;
			return new Point(self.x, self.y);
		}
	}

	// Copy over members to prototype
	for (var key in members) {
		Point.prototype[key] = members[key];
	};
})();


var PolyLine;
(function() {
	PolyLine = function() {
		this.points = [];
	};

	var members = {

		// Generate GCode for 3D printing
		toString: function() {
			var self = this,
				output = "";
			for(point in self.points) {
				output += self.points[point].toString() + "\n"
			}
			return output;
		},

		// add a single point to the list
		append: function(point) {
			var self = this;
			self.points.push(point);
		},

		// add another PolyLine to the end of this PolyLine
		extend: function(polyline) {
			var self = this;
			for(point in polyline.points) {
				self.points.push(polyline.points[point].clone());
			}
		},

		// method to make a clone of the PolyLine
		clone: function() {
			var self = this;
			var cloned = new PolyLine();
			for(point in self.points) {
				cloned.append(self.points[point].clone());
			}
			return cloned;
		},

		// rotate each individual point within
		rotate: function(angle) {
			var self = this;
			for(point in self.points) {
				self.points[point].rotate(angle);
			}
		},

		// reflect the list of points around the x axis
		reflect: function() {
			var self = this;
			for(point in self.points) {
				self.points[point].y = -1*(self.points[point].y);
			}
		},

		// reverse the order of the list of points
		reverse: function() {
			var self = this;
			self.points.reverse();
		},

		draw: function(ctx) {
			var self = this;

			ctx.beginPath();
			var point = self.points[0];
			ctx.moveTo(point.x, point.y);

			for(var n=1; n < self.points.length; n++) {
				point = self.points[n];
				ctx.lineTo(point.x, point.y);
			}
			ctx.closePath();
		}

	};

	// Copy over members to prototype
	for (var key in members) {
		PolyLine.prototype[key] = members[key];
	};
})();

var Snowflake;
(function() {
	Snowflake = function(options) {

		this.options = {

			/** {Integer} Number of arms of the snowflake */
			numArms: 6,

			/** {Integer} Length of arms of the snowflake */
			armLength: 100,

			/** {Integer} Thickness of arms of the snowflake */
			armThickness: 3,

			/** {Integer} Number of spikes on the arms of the snowflake */
			numSpikes: randomInt(2,5),

			/** {Number}  */
			spacer: 0.5

		};

		for (var key in options) {
			this.options[key] = options[key];
		}

		this.__gapSize = (this.options.armLength/this.options.numSpikes)/2;

		var self = this,
			spikyArm = new PolyLine();

		spikyArm.append(new Point(self.options.armThickness, self.options.armThickness/2));

		// var angle = radians(randomInt(30,80));console.log("Angle: " + angle);
		var angle = radians(31);

		for(var n=0; n < self.options.numSpikes; n++) {
			var spikeLength = Math.random()*(self.options.armLength/2),
				spikeLength = randomInt(self.options.armThickness,self.options.armLength/2),
				// spikeLength = self.options.armLength/2.0,
				x1 = self.options.spacer + self.__gapSize*(n*2),
				y1 = self.options.armThickness/2,
				x2 = self.options.spacer + x1 + spikeLength*Math.cos(angle),
				y2 = spikeLength*Math.sin(angle),
				x3 = self.options.spacer + x1 + self.__gapSize,
				y3 = self.options.armThickness/2;

			spikyArm.append(new Point(x1, y1));
			spikyArm.append(new Point(x2, y2));
			spikyArm.append(new Point(x3, y3));
		};

		spikyArm.append(new Point(self.options.armLength, self.options.armThickness/2));

		// make a mirror image of the first half of the arm
		var otherHalf = spikyArm.clone();
		otherHalf.reflect();
		otherHalf.reverse();

		// make a pointy tip
		spikyArm.append(new Point(self.options.armLength+(self.options.armLength/10), 0));

		// join em together
		spikyArm.extend(otherHalf);

		self.__path = new PolyLine();
		// join together 6 rotated copies of the spiky arm
		for(var a=0; a < self.options.numArms; a++) {
			spikyArm.rotate(radians(-(360/self.options.numArms)));
			self.__path.extend(spikyArm);
		}

	};

	/*
	---------------------------------------------------------------------------
		PRIVATE FUNCTIONS
	---------------------------------------------------------------------------
	*/

	/**
	 * Generates a random integer that is between two integers.
	 *
	 * @param from {Integer} The integer to start from.
	 * @param to {Integer} The integer to end with.
	 *
	 * @return {Integer} Random integer in between the two given integers.
	 **/
	function randomInt(from, to) {
		return Math.floor(Math.random() * (to - from + 1) + from);
	};

	/**
	 * @param degrees {Number} Angle in degrees
	 *
	 * @return {Number} Angle in radians
	 **/
	function radians(degrees) {
		return degrees*(Math.PI/180);
	};

	var members = {
		/*
		---------------------------------------------------------------------------
			INTERNAL FIELDS ::
		---------------------------------------------------------------------------
		*/

		/** {Number} Set in constructor */
		__gapSize: 0,
		__path: undefined,

		/*
		---------------------------------------------------------------------------
			PUBLIC API
		---------------------------------------------------------------------------
		*/

		/**
		 * Draws the snowflake
		 *
		 * @param ctx {2D Context} The 2D graphics context from a canvas element.
		 */
		draw: function(ctx) {
			var self = this;
			self.__path.draw(ctx);
		}
	}

	// Copy over members to prototype
	for (var key in members) {
		Snowflake.prototype[key] = members[key];
	}

})();
