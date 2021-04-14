const bgPage = chrome.extension.getBackgroundPage();
let camera = document.getElementById('camera');
camera.muted = true;
camera.addEventListener('canplay',function(e){
	camera.play()
});
bgPage.cameraPreview.getCameraStream(function(stream) {
  camera.srcObject = stream;
});