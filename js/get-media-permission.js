const bgPage = chrome.extension.getBackgroundPage();

// 获取访问媒体设备的权限
function getMediaPermission() {
  var constraints = {
    video: true,
    audio: true,
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(mediaStream => {
      console.log('获取权限成功');
      if (typeof mediaStream.stop === 'function') {
        mediaStream.stop();
      }
    })
    .catch(error => {
      console.log(error);
      console.log('获取权限失败');
      if (['Permission dismissed', 'Permission denied'].includes(error.message)) {
        alert(chrome.i18n.getMessage('allowAccessTips'));
      }
    });
}
getMediaPermission();

if (bgPage.devicesList.videoInputDevices.length === 0 || bgPage.devicesList.audioInputDevices.length === 0) {
  alert(chrome.i18n.getMessage('lackDeviceTips'));
}
