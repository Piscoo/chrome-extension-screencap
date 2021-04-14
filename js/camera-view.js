
function getCameraMedia() {
  var constraints = {
    video: true,
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(mediaStream => {
      document.getElementById('camera').srcObject = mediaStream;
    })
    .catch(error => {
      console.log(error);
    });
}

getCameraMedia();

const bgPage = chrome.extension.getBackgroundPage();

window.onunload = function() {
  bgPage.cameraPreview.onCameraPreviewClose();
}