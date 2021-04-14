window.onload = function () {
    let access_error = document.querySelector('.access_error');
    access_error.style.display = 'none' ;
    // 获取参数
    let getLocationParam = function () {
        const p = window.location.href.match(/\?(\w+)$/);
        return (p && p[1]) || '';
    };
    // 多语言
    document.querySelectorAll('*[data-i18n]').forEach(element => {
        const text = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
        if (text) {
            element.innerHTML = text;
        }
    });
    // 图片
    if (navigator.language && navigator.language.indexOf('zh') >= 0){
        document.getElementById('step1').src = '../img/step1-zh.jpg';
        document.getElementById('step2').src = '../img/step2-zh.png'
    }
    // 获取权限
    window.navigator.getUserMedia({ audio: true },
        function (s) {
            window.close();
        },
        function (s) {
            access_error.style.display = 'block';
        });
}