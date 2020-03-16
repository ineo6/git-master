let pageId = 'inject';

const tools = {
  gitlab: {
    highlight: function() {
      $('.js-syntax-highlight')
        .syntaxHighlight();
      $('.js-render-math')
        .renderMath();
    },
  },
};

function executeHandle(type, handle) {
  const handles = tools[type];

  switch (handle) {
    case 'highlight':
      handles.highlight();
      break;
    default:

  }
}

// 通过postMessage调用content-script
function invokeContentScript(code) {
  window.postMessage({
    cmd: 'invoke',
    code: code,
    from: pageId,
  }, '*');
}

// 发送普通消息到content-script
function sendMessageToContentScriptByPostMessage(data) {
  window.postMessage({
    cmd: 'message',
    data: data,
    from: pageId,
  }, '*');
}

window.addEventListener('message', function(e) {
  if (e.data.from === pageId) {
    return;
  }

  console.log('收到消息：', e.data);
  if (e.data && e.data.cmd === 'invoke') {
    eval('(' + e.data.code + ')');
  } else if (e.data && e.data.cmd === 'message') {

    const data = e.data.data;

    if (data.type && data.handle) {
      executeHandle(data.type, data.handle);
    }
  }
}, false);
