let FramePlayer = function (el) {
	this.playerContainer = document.getElementById(el);
	this.rate = 10;
	this.imageCount = 7;
	this.currentFrame = -1;
	this.currentTime = 0;
	this.videoFramesNum = 25;
	this.paused = true;
	this.images = [];
	this.img = undefined;
	this.playerMaxWidth = 640;
	this.playerMaxHeight = 360;
	this.canvas = document.createElement('canvas');
	this.canvas.width = this.getVideoCanvasWidth();
	this.canvas.height = this.getVideoCanvasHeight();
	this.context = this.canvas.getContext('2d');
	this.playerContainer.appendChild(this.canvas);
	this.requestId = undefined;
	const player = this;
	this.canvas.addEventListener('click', function () {
		player.play();
	}, false);
	this.on('downloadcomplete', function (e) {
		console.log('download completed in ' + e.data.time);
		const imageNumber = e.data.imageNumber;
		const playListItemCanvas = document.createElement("canvas");
		playListItemCanvas.width = player.getPlayerListItemCanvasWidth();
		playListItemCanvas.height = player.getPlayerListItemCanvasHeight();
		playListItemCanvas.addEventListener('click', function () {
			player.img = player.images[imageNumber];
			player.pauseAndSeek(0);
		}, false);
		const context = playListItemCanvas.getContext('2d');
		context.drawImage(e.data.img, 0, 0, 128, 72, 0, 0, playListItemCanvas.width, playListItemCanvas.height);

		const playListItem = document.createElement("li");
		playListItem.appendChild(playListItemCanvas);

		let playList = document.getElementById("play-list");
		if (!playList) {
			playList = document.createElement("ul");
			playList.id = "play-list";
			const playlistContainer = document.getElementById("playlist-container");
			playlistContainer.appendChild(playList);
		}
		playList.appendChild(playListItem);
	});
	this.on('play', function (ms) {
		console.log('video is playing now, current milliseconds is ' + ms.data);
	});
	this.on('pause', function (ms) {
		console.log('video is paused, current milliseconds is ' + ms.data);
	});
	this.on('end', function () {
		console.log('video is completed');
	});
	window.addEventListener("resize", function () {
		player.canvas.width = player.getVideoCanvasWidth();
		player.canvas.height = player.getVideoCanvasHeight();
		const playListItemCanvases = document.querySelectorAll("#play-list li canvas");
		for (let i = 0; i < playListItemCanvases.length; i++) {
			const playListItemCanvas = playListItemCanvases[i];
			playListItemCanvas.width = player.getPlayerListItemCanvasWidth();
			playListItemCanvas.height = player.getPlayerListItemCanvasHeight();
			const context = playListItemCanvas.getContext('2d');
			context.drawImage(player.images[i], 0, 0, 128, 72, 0, 0, playListItemCanvas.width, playListItemCanvas.height);
		}
	}, false);
};

FramePlayer.prototype.play = function () {
	if (this.paused) {
		this.triggerEvent("play", this.currentTime);
		document.getElementById('player').classList.add("player--playing");
		document.getElementById('bottom-play').classList.add("player-control--pressed");
		this.paused = false;
		this.render(this);
		this.drawFrame(this.currentFrame);
	} else {
		this.pause();
	}
};

FramePlayer.prototype.pause = function () {
	this.paused = true;
	document.getElementById('player').classList.remove("player--playing");
	document.getElementById('bottom-play').classList.remove("player-control--pressed");
	if (this.requestId) {
		window.cancelAnimationFrame(this.requestId);
		this.requestId = undefined;
	}
	this.triggerEvent("pause", this.currentTime);
};

FramePlayer.prototype.pauseAndSeek = function (currentFame) {
	this.pause();
	this.drawFrame(currentFame);
};

FramePlayer.prototype.render = function (player) {
	let then = Date.now();
	let interval = 1000 / player.rate;
	let videoFramesNum = this.videoFramesNum;
	let processFrame = function () {
		let now = Date.now();
		let delta = now - then;
		if (delta > interval) {
			then = now - (delta % interval);
			if (!player.paused) {
				player.currentFrame++;
				if (player.currentFrame >= videoFramesNum) {
					player.triggerEvent("end");
					player.currentFrame = 0;
					player.currentTime = 0;
				} else if (player.currentFrame < 0) {
					player.currentFrame = videoFramesNum - 1;
				}
				player.drawFrame(player.currentFrame);
			}
		}
		player.requestId = window.requestAnimationFrame(processFrame);
	};
	player.requestId = window.requestAnimationFrame(processFrame);
};

FramePlayer.prototype.drawFrame = function (currentFrame) {
	this.currentFrame = currentFrame;
	let sx = 0;
	let sy = 0;
	for (let i = 1; i <= this.currentFrame; i++) {
		if (i % 5 === 0) {
			sx += 128;
			sy = 0;
		} else {
			sy += 72;
		}
	}

	var progressBar = document.getElementById("progress-bar");
	var currentTime = document.getElementById("current-time");
	let curTime = ((this.currentFrame + 1) * 0.1).toFixed(2);
	progressBar.style.width = ((this.currentFrame + 1) * 4) + '%';
	currentTime.innerHTML = curTime;

	player.currentTime = 1000 * curTime;
	player.context.drawImage(player.img, sx, sy, 128, 72, 0, 0, player.canvas.width, player.canvas.height);
};

FramePlayer.prototype.loadImages = function () {
	const player = this;
	let startTime = (new Date()).getTime();
	for (let imageNumber = 0; imageNumber < this.imageCount; imageNumber++) {
		let image = new Image();
		image.onload = function () {
			let endTime = (new Date()).getTime();
			let data = {time: endTime - startTime, img: this, imageNumber: imageNumber};
			player.triggerEvent("downloadcomplete", data);
		};
		image.src = `http://storage.googleapis.com/alyo/assignments/images/${imageNumber}.jpg`;
		player.images.push(image);
	}
	player.img = player.images[0];
};

FramePlayer.prototype.on = function (event, handler) {
	if (!this.playerContainer) {
		throw 'Not yet rendered';
	}
	if (this.playerContainer.addEventListener) {
		this.playerContainer.addEventListener(event, handler, false);
	} else if (el.attachEvent) {
		this.playerContainer.attachEvent('on' + event, handler);
	}
};

FramePlayer.prototype.triggerEvent = function (eventName, data) {
	var event;
	if (document.createEvent) {
		event = document.createEvent("HTMLEvents");
		event.initEvent(eventName, true, true);
	} else {
		event = document.createEventObject();
		event.eventType = eventName;
	}
	event.eventName = eventName;
	event.data = data;
	if (document.createEvent) {
		this.playerContainer.dispatchEvent(event);
	} else {
		this.playerContainer.fireEvent("on" + event.eventType, event);
	}
};

FramePlayer.prototype.getVideoCanvasWidth = function () {
	const viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	if (viewPortWidth < 800) {
		return this.playerMaxWidth / 5 * 3;
	} else if (viewPortWidth < 1350) {
		return this.playerMaxWidth / 5 * 4;
	} else {
		return this.playerMaxWidth;
	}
};

FramePlayer.prototype.getVideoCanvasHeight = function () {
	return this.playerMaxHeight / (this.playerMaxWidth / this.canvas.width)
};

FramePlayer.prototype.getPlayerListItemCanvasWidth = function () {
	const viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	if (viewPortWidth < 800) {
		return this.playerMaxWidth / 15 * 3;
	} else if (viewPortWidth < 1350) {
		return this.playerMaxWidth / 15 * 4;
	} else {
		return this.playerMaxWidth / 15 * 5;
	}
};

FramePlayer.prototype.getPlayerListItemCanvasHeight = function () {
	const viewPortWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	if (viewPortWidth < 800) {
		return this.playerMaxHeight / 15 * 3;
	} else if (viewPortWidth < 1350) {
		return this.playerMaxHeight / 15 * 4;
	} else {
		return this.playerMaxHeight / 15 * 5;
	}
};