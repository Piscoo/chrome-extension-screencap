$(function () {
    $('.access_error').hide();

    let getLocationParam = function () {
        const p = window.location.href.match(/\?(\w+)$/);
        return (p && p[1]) || '';
    };

    window.navigator.getUserMedia({video: true, audio: true},
        function (s) {
            let typeCapture = getLocationParam();
            typeCapture && chrome.extension.getBackgroundPage().videoRecorder.mediaAccess({typeCapture: typeCapture});
            window.close();
        },
        function (s) {
            $('.access_error').show();
        });
});