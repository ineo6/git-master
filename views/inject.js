let gmPageId = 'inject';

const gmTrigger = {
  gitlab: {
    highlight: function() {
      $('.js-syntax-highlight').length && $('.js-syntax-highlight').syntaxHighlight && $('.js-syntax-highlight').syntaxHighlight();
      $('.js-render-math').length && $('.js-render-math').renderMath && $('.js-render-math').renderMath();
    },
  },
};

function executeHandle(type, handle) {
  const handles = gmTrigger[type];

  switch (handle) {
    case 'highlight':
      handles.highlight();
      break;
    default:
  }
}

// 发送普通消息到content-script
function sendMessageToContentScriptByPostMessage(data) {
  window.postMessage(
    {
      cmd: 'message',
      data: data,
      from: gmPageId,
    },
    '*'
  );
}

window.addEventListener(
  'message',
  function(e) {
    if (e.data.from === gmPageId) {
      return;
    }

    if (e.data && e.data.cmd === 'message') {
      const data = e.data.data;

      if (data.type && data.handle) {
        executeHandle(data.type, data.handle);
      }
    }
  },
  false
);
