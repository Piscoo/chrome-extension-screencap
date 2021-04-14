const bgPage = chrome.extension.getBackgroundPage();
const { appData, cameraPreview, mediaRecorderBg, recorder, screenShare, deleteDownloadTip, contentMessage } = bgPage;
const $trans = chrome.i18n.getMessage;
// 接收 bg 页的消息
function onBgMessage(action, data) {
  data = data || {};
  switch (action) {
    case 'start-record':
      app.startRecord();
      break;
    case 'resume-record':
      app.resumeRecord();
      break;
    case 'app-init':
      app.init();
      break;
    case 'set-status-ready':
      app.init();
      break;
    case 'reject-share':
      app.init();
      break;
  }
}
// 向 bg 页发送消息
function doAction(action) {
  switch (action) {
    case 'start':
      recorder.start();
      break;
    case 'stop':
      mediaRecorderBg.stop();
      break;
    case 'pause':
      mediaRecorderBg.pause();
      break;
    case 'resume':
      mediaRecorderBg.resume();
      break;
    case 'open-camera-view':
      cameraPreview.openCameraPreview();
      break;
    case 'close-camera-view':
      contentMessage.sendMessage({ action: 'close-preview' }, null, {});
      break;
  }
}
//
const app = new Vue({
  el: '#app',
  data: appData,
  computed: {
    recordTimeFormat() {
      let hour = Math.floor(this.recordTime / 3600);
      let min = Math.floor((this.recordTime % 3600) / 60);
      let sec = (this.recordTime % 3600) % 60;

      hour = hour > 9 ? hour : '0' + hour;
      min = min > 9 ? min : '0' + min;
      sec = sec > 9 ? sec : '0' + sec;

      return hour + ':' + min + ':' + sec;
    }
  },
  watch: {},
  created() {
    this.visibleSoundSelector = false;
    
    // chrome.storage.local.set({'recDialogShowTime': 0}, function() {console.log('success')});

    if (!this.selectedRecordOption) {
      this.selectedRecordOption = this.recordOptions[0];
    }
    
    if (!this.selectedSoundOption) {
      this.selectedSoundOption = this.selectedRecordOption.soundOptions[0];
    }
    this.getAllDevices();
    this.camera = !cameraPreview.isClosed;
    this.openSetting = false;
    deleteDownloadTip();
    this.setDisableRecord();
  },
  methods: {
    init() {
      this.recordStatus = 'ready';
      this.requestSharePending = false;
      this.recordTime = 0;
      this.setDisableRecord();
    },
    start() {
      doAction('start');
      if (this.selectedRecordOption.value === 'screen') {
        this.requestSharePending = true;
      }
      deleteDownloadTip();
      window.close();

    },
    pause() {
      if (this.recordStatus === 'pause') {
        this.recordStatus = 'recording';
        doAction('resume');
      } else {
        this.recordStatus = 'pause';
        doAction('pause');
      }
    },
    stop() {
      doAction('stop');
      this.init();

      if (this.camera) {
        this.toggleCamera();
      }
    },
    startRecord() {
      this.recordStatus = 'recording';
      this.setConfig();
    },
    resumeRecord() {
      this.startRecord();
    },
    selectOption(data) {
      this.disableRecord = false;
      this.selectedRecordOption = data;
      if (data.value !== 'camera') {
        data.soundOptions.forEach(option => {
          if (option.label === this.selectedSoundOption.label) {
            this.selectedSoundOption = option;
          }
        });
      } else {
        this.selectedSoundOption = data.soundOptions[1];
      }
      
      if (this.selectedRecordOption.value === 'camera') {
        doAction('open-camera-view');
      } else if (!this.camera) {
        doAction('close-camera-view');
      }
    },
    selectSound(option) {
      if (option.disable) return;
      this.selectedSoundOption = option;
      if (this.audioInputDevices.length === 0 && this.selectedSoundOption.value.includes('microphone')) {
        this.sound = false
      }
      this.visibleSoundSelector = false;
    },
    toggleSound() {
      if (this.audioInputDevices.length === 0 && this.selectedSoundOption.value.includes('microphone')) {
        this.notification({message: chrome.i18n.getMessage('lackDeviceTips')});
        return;
      }
      this.sound = !this.sound;
    },
    toggleCamera() {
      this.camera = !this.camera;
      if (this.camera) {
        doAction('open-camera-view');
      } else {
        doAction('close-camera-view');
      }
    },
    toggleSoundSelector() {
      if (this.selectedRecordOption.soundOptions.length > 1) {
        this.visibleSoundSelector = !this.visibleSoundSelector;
      }
    },
    selectAudioInput(item) {
      this.selectedAudioInput = item;
      this.openSettingItem = '';
    },
    selectVideoInput(item) {
      this.selectedVideoInput = item;
      this.openSettingItem = '';
    },
    setDisableRecord() {
      setTimeout(() => {
        if (this.selectedRecordOption.value === 'camera') {
          // 如果摄像头预览是关闭的，禁止录制
          // this.disableRecord = cameraPreview.isClosed;
          doAction('open-camera-view');
          this.disableRecord = false;
        }
      });
    },
    cancelShare() {
      this.requestSharePending = false;
      screenShare.cancelShare();
    },
    setConfig() {
      chrome.storage.local.set({
        config: {
          recordMode: this.$data.selectedRecordOption.value,
        }
      });
    },
    onDocumentClick() {
      this.visibleSoundSelector = false;
      this.openSettingItem = '';
    },
    getAllDevices() {
      bgPage.getAllAudioVideoDevices(devices => {
        bgPage.devicesList = devices;
        this.audioInputDevices = devices.audioInputDevices;
        this.audioOutputDevices = devices.audioOutputDevices;
        this.videoInputDevices = devices.videoInputDevices;
        
        if (!this.selectedAudioInput) {
          this.selectedAudioInput = this.audioInputDevices.length ? this.audioInputDevices[0]:undefined;
        }
        if (!this.selectedVideoInput) {
          this.selectedVideoInput = this.videoInputDevices[0];
        }

        if (this.audioInputDevices.length === 0 && this.selectedSoundOption.value.includes('microphone')) {
          this.sound = false;
        }
      });
    },
    notification(options) {
      const defaultOptions = {
        type: 'basic',
        title: chrome.i18n.getMessage('name'),
        iconUrl: '../img/logo.png',
      };
      options = Object.assign(defaultOptions, options);
      chrome.notifications.create('', options);
    },
  }
});

// 麦克风音频线
function audioVisualize(stream) {
  var audioCtx = new window.AudioContext();
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);
  source.connect(analyser);

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);
    let max = Math.max(...dataArray);
    app.$data.audioColumnHeight = ((max - 128) / 128) * 100 + 0;
  }
  draw();
}

function getAudioMedia() {
  if (!navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia) {

    console.log('getUserMedia is not supported!');
    return;
  } else {
    var constraints = {
      audio: { deviceId: this.selectedAudioInput ? { exact: this.selectedAudioInput.deviceId} : undefined }
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(mediaStream => {
        audioVisualize(mediaStream);
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
          chrome.tabs.create({ url: 'media_access/mic.html?' });
        } else if (error.name == "TypeError" || error.name == "TypeError") {
          // empty constraints object
        } else {
          // other errors
        }
      });
  }
  
}

getAudioMedia();
