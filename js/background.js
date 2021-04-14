const $trans = chrome.i18n.getMessage;
let startTime = null;
window.appData = {
  // 录制状态 ready, recording, pause
  disableRecord: false,
  recordStatus: 'ready',
  recordOptions: [
    {
      label: $trans('browserTab'),
      value: 'browserTab',
      // 可选的音频录制项
      soundOptions: [
        { label: $trans('systemSound'), value: ['systemSound'] },
        { label: $trans('microphone'), value: ['microphone'] },
        { label: $trans('systemSoundAndMicrophone'), value: ['systemSound', 'microphone'] },
      ],
      // MediaRecorder api 的第二个参数，录制器的 options
      recorderHints: {
        // checkForInactiveTracks: false,
        // ignoreMutedMedia: false,
        disableLogs: false,
        type: 'video/webm',
        mimeType: 'video/webm;codecs=vp8',
      }
    },
    {
      label: $trans('screen'),
      value: 'screen',
      soundOptions: [
        { label: $trans('systemSound'), value: ['systemSound'] },
        { label: $trans('microphone'), value: ['microphone'] },
        { label: $trans('systemSoundAndMicrophone'), value: ['systemSound', 'microphone'] },
      ]
    },
    {
      label: $trans('camera'),
      value: 'camera',
      soundOptions: [
        { label: $trans('systemSound'), value: ['systemSound'], disable: true },
        { label: $trans('microphone'), value: ['microphone'] },
        { label: $trans('systemSoundAndMicrophone'), value: ['systemSound', 'microphone'], disable: true },
      ]
    }
  ],


  selectedRecordOption: null,
  selectedSoundOption: null,
  // 等待用户确认分享屏幕中。。。
  requestSharePending: false,
  // 录制开始倒计时中。。。
  countDownPending: false,
  countDownNumber: 3,
  visibleSoundSelector: false,
  sound: true,
  camera: false,
  recordTime: 0,
  interval: null,
  audioColumnHeight: 0,

  openSetting: false,
  audioInputDevices: [],
  audioOutputDevices: [],
  videoInputDevices: [],
  selectedAudioInput: null,
  selectedVideoInput: null,
  openSettingItem: '',
  streamStoped:true,
  dataArray: null,
  analyser:null,
};

// 获取访问媒体设备的权限
(function getMediaPermission() {
  var constraints = {
    video: true,
    audio: true
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(mediaStream => {
      mediaRecorderBg.closeStream(mediaStream);
    })
    .catch(error => {
      if (error.name === 'NotReadableError') {
      } else if (error.name === 'NotAllowedError') {
        window.open(location.origin + '/media-permission.html', '');
      } else if (error.name === 'NotFoundError') {
        
      }
    });
})();

// 取设置数据
chrome.storage.local.get('config', function(store) {
  if (store.config) {
    // 初始状态不可选择摄像头模式
    if (store.config.recordMode === 'camera') {
      store.config.recordMode = 'screen';
    }
    appData.recordOptions.forEach(item => {
      if (item.value === store.config.recordMode) {
        appData.selectedRecordOption = item;
      }
    });
  }
});

// 计时器
window.stopwatch = {
  interval: null,
  start() {
    this.interval = setInterval(() => {
      appData.recordTime++;
      if (appData.recordTime % 2 === 0) {
        chrome.browserAction.setIcon({ path: '../img/logo.png' });
      } else {
        chrome.browserAction.setIcon({ path: '../img/recording.png' });
      }
    }, 1000);
  },
  stop() {
    clearInterval(this.interval);
    let that = this;
    // 判断rec弹窗是否一天之内弹出过，没有就弹出
    chrome.storage.local.get('recDialogInfo', function(res) {
      let dateNow = Date.now();
      if(res.recDialogInfo) {
        if(dateNow >= res.recDialogInfo.outTime) {
          chrome.storage.local.remove('recDialogInfo');
          that.showRecDialog();
        }
      } else {
        that.showRecDialog();
      }
    })

    appData.recordTime = 0;
    chrome.browserAction.setIcon({ path: '../img/logo.png' });
  },
  pause() {
    clearInterval(this.interval);
  },
  resume() {
    this.start();
  },
  // 弹出rec引流框，记录时间
  showRecDialog() {
    contentMessage.sendMessage({ action: 'show-rec-dialog' })
    let outTime = Date.now() + 24*60*60*1000;
    chrome.storage.local.set({
      recDialogInfo: {'recDialogShowTime': 1, 'outTime': outTime}
    }, function() {
      console.log('recDialog showed');
    });
  }
};

// 向 popup 页发送消息
window.popup = {
  getPopup() {
    return chrome.extension.getViews({ type: 'popup' })[0];
  },
  sendMessage(action, data) {
    const popupWin = this.getPopup();
    if (popupWin) {
      popupWin.onBgMessage(action, data);
    }
  }
};

// 去掉下载提示
function deleteDownloadTip(){
  contentMessage.sendMessage({ action: 'delete-download-tip' });
}
function isRecordSystemSound() {
  return !!(appData.sound && appData.selectedSoundOption.value.includes('systemSound'));
}

function isRecordMicrophone() {
  return !!(appData.sound && appData.selectedSoundOption.value.includes('microphone'));
}

window.recorder = {
  start() {
    mediaRecorderBg.streamList = [];
    if (appData.selectedRecordOption.value === 'browserTab') {
      this.recordTab();
    } else if (appData.selectedRecordOption.value === 'screen') {
      this.recordScreen();
    } else if (appData.selectedRecordOption.value === 'camera') {
      this.recordCamera();
    }
  },
  recordTab() {
    chrome.tabCapture.capture(
      {
        audio: isRecordSystemSound(),
        video: true,
        videoConstraints: {
          mandatory: {
            chromeMediaSource: 'tab',
            maxWidth: 3840,
            maxFrameRate:24,
            maxHeight: 2160,
          }
        },
      },
      function(mediaStream) {
        if (isRecordSystemSound()) {
          tabAudio.init(mediaStream);
          tabAudio.play();
        }
        if (isRecordMicrophone()) {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(audioStream => {
              mediaRecorderBg.streamList.push(mediaStream);
              var mediaStreamCopy = mediaStream.clone();
              // 混合音频
              let finalStream = new MediaStream();
              let mixedAudioStream = getMixedAudioStream([mediaStream, audioStream]);

              mixedAudioStream.getAudioTracks().forEach(function (audioTrack) {
                finalStream.addTrack(audioTrack);
              });

              mediaStream.getVideoTracks().forEach(function (videoTrack) {
                finalStream.addTrack(videoTrack);
              });
              mediaStreamCopy = finalStream;
              startRecordingScreen(mediaStreamCopy, audioStream);
            })
            .catch(error => {
              console.log(error);
            });
        } else {
          startRecordingScreen(mediaStream);
        }
      }
    );
  },
  recordScreen() {
    screenShare.requestShare();
  },
  recordCamera() {
    var constraints = {
      video: true,
      audio: true
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(mediaStream => {
        startRecordingScreen(mediaStream);
      })
      .catch(error => {
        console.log(error);
      });
  }
};

window.screenShare = {
  shareId: null, 
  requestShare() {
    //  ['screen', 'window', 'tab', 'audio']
    const sources = ['screen', 'window'];
    
    if (isRecordSystemSound()) {
      sources.push('audio');
    }
    this.shareId = chrome.desktopCapture.chooseDesktopMedia(sources, (streamId, option) => {
      if (streamId) {
        getMediaStream(streamId,option);
      } else {
        popup.sendMessage('reject-share');
      }
      appData.requestSharePending = false;
    });
  },
  cancelShare() {
    chrome.desktopCapture.cancelChooseDesktopMedia(this.shareId);
    appData.requestSharePending = false;
  }
};

function getMediaStream(streamId, option) {
  let screenConstraints = {
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        maxWidth: window.screen.width,
        maxHeight: window.screen.height,
      },
    }
  };

  if (option.canRequestAudioTrack) {
    screenConstraints.audio = {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  }
  let audioConstraints = {audio: true};
  navigator.mediaDevices
    .getUserMedia(screenConstraints)
    .then(screenStream => {
      mediaRecorderBg.bindEventStream(screenStream)
      if (isRecordMicrophone()) {
        mediaRecorderBg.streamList.push(screenStream)
        let screenStreamCopy = screenStream.clone();
        navigator.mediaDevices.getUserMedia(audioConstraints).then(stream => {
          if (isRecordSystemSound()) {
            // 混合音频
            let finalStream = new MediaStream();
            let mixedAudioStream = getMixedAudioStream([screenStream, stream]);
            mixedAudioStream.getAudioTracks().forEach(function (audioTrack) {
              finalStream.addTrack(audioTrack);
            });
            screenStream.getVideoTracks().forEach(function (videoTrack) {
              finalStream.addTrack(videoTrack);
            });
            screenStreamCopy = finalStream;
          } else {
            screenStreamCopy.addTrack(stream.getAudioTracks()[0]);
          }
          startRecordingScreen(screenStreamCopy, stream);
        });
      } else {
        startRecordingScreen(screenStream);
      }
    })
    .catch(error => {
      console.log('获取麦克风失败',error)
      popup.sendMessage('set-status-ready');
    });
}
function startRecordingScreen(mediaStream, screenStream) {
  contentMessage.sendMessage({ action: 'start-count-down' });
  mediaRecorderBg.init(mediaStream, screenStream);
  appData.countDownPending = true;
  appData.requestSharePending = false;
  appData.countDownNumber = 3;
  appData.streamStoped = false;
}

window.mediaRecorderBg = {
  instance: null,
  recorderRTC:null,
  stream: null,
  streamList: [],
  init(stream, screenStream) {
    this.stream = stream;
    this.streamList.push(stream);
    if (screenStream){
      this.streamList.push(screenStream);
    }
    this.bindEventStream(this.streamList);
  },
  bindEventStream(streams) {
    if (!Array.isArray(streams)) {
      streams = [streams];
    }
    streams.forEach(stream => {
      if (stream) {
        addStreamStopListener(stream, function() {
          mediaRecorderBg.stop();
          popup.sendMessage('app-init');
          appData.recordStatus = 'ready';
          // 录制结束，关闭摄像头预览
          // cameraPreview.closeCameraPreview();
          appData.streamStoped = true
        });
      }
    });
  },
  start() {
    // this.instance.start();
    if (appData.streamStoped){
      return
    }
    this.recorderRTC = RecordRTC(this.stream, {
      disableLogs: false,
      type: 'video',
      mimeType: 'video/webm\;codecs=vp8',
      audioBitsPerSecond: 96000,
      videoBitsPerSecond: 4000000,
    })
    this.recorderRTC.startRecording();
    stopwatch.start();
    popup.sendMessage('start-record');
    appData.recordStatus = 'recording';
  },
  pause() {
    // this.instance.pause();
    this.recorderRTC.pauseRecording();
    stopwatch.pause();
  },
  resume() {
    // this.instance.resume();
    this.recorderRTC.resumeRecording()
    stopwatch.resume();
    popup.sendMessage('resume-record');
  },
  
  stop() {
    contentMessage.sendMessage({ action: 'close-preview' }, null, {});
    if (this.recorderRTC && this.recorderRTC.state !== 'inactive') {
      let recorderRTC_ = this.recorderRTC;
      this.recorderRTC.stopRecording(function () {
        let blob = recorderRTC_.getBlob();
        mediaRecorderBg.downloadVideo(blob);
      });
    }
    mediaRecorderBg.closeStream(this.streamList);
    stopwatch.stop();
    tabAudio.stop();
  },
  downloadVideo(videoBlob) {
    contentMessage.sendMessage({ action: 'show-download-tip' });
    let blobUrl = URL.createObjectURL(videoBlob);
    var downloadBtn = document.createElement('a');
    downloadBtn.download = "";
    downloadBtn.href = blobUrl;
    document.body.appendChild(downloadBtn);
    downloadBtn.click();
    
    // chrome.downloads.download({
    //   url: blobUrl
    // });
  },
  closeStream(streams) {
    contentMessage.sendMessage({ action: 'stop-count-down' });
    if (!Array.isArray(streams)) {
      streams = [streams];
    }
    streams = [...streams];
    streams.forEach(stream => {
      if (stream) {
        // 推荐直接使用track.stop
        // if (typeof stream.stop === 'function') {
        //   stream.stop();
        // } else {
        //   stream.getTracks().forEach(track => {
        //     if (typeof track.stop === 'function') {
        //       track.stop();
        //     }
        //   });
        // }
        stream.getTracks().forEach(track => {
          if (typeof track.stop === 'function') {
            track.stop();
          }
        });
      }
    });
  }
};

// 播放 Tab 音频
window.tabAudio = {
  stream: null,
  audioEl: null,
  init(stream) {
    this.stream = stream;
  },
  play() {
    var audioEl = document.createElement('audio');
    audioEl.srcObject = this.stream;
    document.body.appendChild(audioEl);
    audioEl.play();
  },
  stop() {
    if (this.audioEl) {
      document.body.removeChild(this.audioEl);
    }
    this.stream = null;
    this.audioEl = null;
  }
}
// 摄像头预览
window.cameraPreview = {
  win: null,
  isClosed: true,
  width: 320,
  height: 240,
  stream: null,
  getCameraStream(callback) {
    var constraints = {
      video: true
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(mediaStream => {
        callback && callback(mediaStream);
        cameraPreview.stream = mediaStream;
      })
      .catch(error => {
        console.log(error.name);
        if (error.name == "NotFoundError" || error.name == "DeviceNotFoundError") {
          // require track is missing
        } else if (error.name == "NotReadableError" || error.name == "TrackStartError") {
          // webcam or mic are already in use
        } else if (error.name == "OverconstrainedError" || error.name == "ConstraintNotSatisfiedError") {
          // constraints can not be satisfied by avb.device
        } else if (error.name == "NotAllowedError" || error.name == "PermissionDeniedError") {
          // permission denied in browser
          chrome.tabs.create({ url: 'media_access/camera.html?' });
        } else if (error.name == "TypeError" || error.name == "TypeError") {
          // empty constraints object
        } else {
          // other errors
        }
      });
  },
  openCameraPreview() {
    this.tabPagePreview();
    cameraPreview.isClosed = false;
  },
  closeCameraPreview() {
    if (appData.selectedRecordOption.value === 'camera') {
      // 摄像头模式下，关闭摄像头预览时
      if (appData.recordStatus === 'ready') {
        appData.disableRecord = true;
      }
      if (appData.recordStatus === 'recording') {
        mediaRecorderBg.stop();
        popup.sendMessage('app-init');
      }
    }
    mediaRecorderBg.closeStream(cameraPreview.stream);
    cameraPreview.isClosed = true;
    appData.camera = false;
  },
  onCameraPreviewClose() {
    
  },
  tabPagePreview() {
    contentMessage.sendMessage({ action: 'open-preview' }, function(response) {
      console.log(response);
    });
  },
  popWinPreview() {
    let features = `
      width=${cameraPreview.width},
      height=${cameraPreview.height},
      top=${window.screen.height - cameraPreview.height},
      left=${window.screen.width - cameraPreview.width},
      titlebar=no,
      toolbar=no`;
    cameraPreview.win = window.open('camera-view.html', '', features);
  }
};

// 与 content-script 通信
window.contentMessage = {
  sendMessage(message, callback, tab) {
    if (!tab) {
      tab = { active: true, currentWindow: true};
    }
    chrome.tabs.query(tab, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message, function(response) {
          if (callback) callback(response);
        });
      });
    });
  },
  onMessage(message, sender, sendResponse) {
    if (message.action === 'close-preview') {
      cameraPreview.closeCameraPreview();
    } else if (message.action === 'start-record'){
      let timer = setTimeout(() => {
        clearTimeout(timer);
        appData.countDownPending = false;
        mediaRecorderBg.start();
      }, 0);
      
    }
  }
};
chrome.runtime.onMessage.addListener(contentMessage.onMessage);
