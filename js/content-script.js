var extensionOrigin = '';
const $trans = chrome.i18n.getMessage;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  switch (message.action) {
    case 'open-preview':
      cameraPreview.preview();
      break;
    case 'close-preview':
      cameraPreview.hidePreview();
      break;
    case 'start-count-down':
      cameraPreview.startCountDown();
      break;
    case 'stop-count-down':
      cameraPreview.stopCountDown();
      break;
    case 'show-download-tip':
      cameraPreview.showDownloadTip();
      break;
    case 'delete-download-tip':
      cameraPreview.deleteDownloadTip();
      break;
    case 'show-rec-dialog':
      cameraPreview.showRecDialog();
      break;
      
  }
});

function sendMessage(message, callback) {
  chrome.runtime.sendMessage(message, callback);
}

var cameraPreview = {
  container: null,
  previewBox: null,
  recDialog: null,

  init() {
    this.createPreview();
    this.createRecDialog();
  },
  preview() {
    this.showPreview();
  },
  showPreview() {
    if (!document.getElementById('apower-container')){
      this.createPreview();
    }
    this.container.querySelector('iframe.acp-iframe').src = chrome.extension.getURL('tab-camera-view.html');
    this.previewBox.style.display = 'block';
  },
  hidePreview() {
    this.previewBox.style.display = 'none';
    this.container.querySelector('iframe').src = '';
    sendMessage({ action: 'close-preview' });
  },
  createPreview() {
    var container = document.createElement('apower-container');
    container.setAttribute('id', 'apower-container');
    var html = `
      <div class="apower-camera-preview">
        <div class="acp-iframe-box">
          <iframe class="acp-iframe" src=""></iframe>
          <div class="acp-iframe-mask">
          </div>
        </div>
        <i class="acp-close-btn"></i>
      </div>
    `;
    container.innerHTML = html;
    document.body.appendChild(container);
    this.container = container;
    this.previewBox = this.container.getElementsByClassName('apower-camera-preview')[0];

    this.initEvent();
  },
  initEvent() {
    this.previewBox.addEventListener('mousedown', function(e) {
      var startX = e.pageX;
      var startY = e.pageY;
      var maxLeft = window.innerWidth - cameraPreview.previewBox.offsetWidth;
      var maxBottom = window.innerHeight - cameraPreview.previewBox.offsetHeight;
      var style = window.getComputedStyle(cameraPreview.previewBox);
      var startLeft = parseInt(style.getPropertyValue('left'));
      var startBottom = parseInt(style.getPropertyValue('bottom'));

      function onMousemove(event) {
        var x = event.pageX - startX;
        var y = event.pageY - startY;
        var left = x + startLeft;
        var bottom = - y + startBottom;
        if (left < 0) {
          left = 0;
        }
        if (left > maxLeft) {
          left = maxLeft;
        }
        if (bottom < 0) {
          bottom = 0;
        }
        if (bottom > maxBottom) {
          bottom = maxBottom;
        }
        cameraPreview.previewBox.style.left = left + 'px';
        cameraPreview.previewBox.style.bottom = bottom + 'px';
      }
      document.addEventListener('mousemove', onMousemove);
      document.addEventListener('mouseup', function() {
        document.removeEventListener('mousemove', onMousemove);
      });
    });
    this.container.getElementsByClassName('acp-close-btn')[0].addEventListener('click', function(e) {
      sendMessage({action: 'close-preview'});
    });
  },
  startCountDown() {
    var countDownEl = document.createElement('div');
    countDownEl.setAttribute('class', 'apower-count-down');
    var acdBg = document.createElement('div');
    acdBg.setAttribute('class', 'acd-bg');
    var numberEl = document.createElement('div');
    numberEl.setAttribute('class', 'acd-number');
    countDownEl.appendChild(acdBg);
    countDownEl.appendChild(numberEl);
    document.body.appendChild(countDownEl);

    var number = 3;
    numberEl.textContent = number;
    countDownEl.style.display = 'block';
    var timer = setInterval(function() {
      number-=1;
      if (number === 0) {
        clearInterval(timer);
        countDownEl.style.display = 'none';
        document.body.removeChild(countDownEl);
        sendMessage({ action: 'start-record' });
      }
      numberEl.textContent = number;
      
    }, 1000);
  },
  stopCountDown(){
    var countDownEl = document.getElementsByClassName('apower-count-down')[0];
    if (countDownEl){
      countDownEl.style.display = 'none';
    }
  },
  showDownloadTip(){
    var container = document.createElement('div');
    container.setAttribute('id', 'apower-download-tip');
    let html = $trans('downloadSuccess');
    container.innerHTML = html;
    document.body.appendChild(container);
    document.addEventListener('click', function() {
      if (document.getElementById('apower-download-tip')) {
        document.body.removeChild(container)
      }
    });
  },
  deleteDownloadTip(){
    let container = document.getElementById('apower-download-tip');
    if (document.getElementById('apower-download-tip')){
      document.body.removeChild(container)
    }
    
  },
  showRecDialog() {
    if (!document.getElementById('apowerrec-dialog')){
      this.createRecDialog();
    }
    this.recDialog.style.display = 'block';
  },
  createRecDialog() {
    var recContainer = document.createElement('apowerrec-dialog');
    recContainer.setAttribute('id', 'apowerrec-dialog');
    var html = `
      <div class="apowerrec-box">
        <div class="title">${$trans('apowerrec')}</div>
        <div class="img"></div>
        <div class="desc">${$trans('recdesc')}</div>
        <a href="https://download.aoscdn.com/down.php?softid=apowerrec-saas-Chrome" class="btn">${$trans('download')}</a>
        <div class="close"></div>
      </div>
    `;
    recContainer.innerHTML = html;
    document.body.appendChild(recContainer);
    this.recDialog = recContainer;
    let that = this;
    this.recDialog.getElementsByClassName('close')[0].addEventListener('click', function() {
      that.closeRecDialog();
    });
    this.recDialog.getElementsByClassName('btn')[0].addEventListener('click', function() {
      that.closeRecDialog();
    });
    if(navigator.language.includes('zh') || navigator.language.includes('tw')) {
      this.recDialog.getElementsByClassName('img')[0].classList.add("img-zh");
    } else {
      this.recDialog.getElementsByClassName('img')[0].classList.remove("img-zh");
    }
  },
  closeRecDialog() {
    this.recDialog.style.display = 'none';
  }
};
cameraPreview.init();