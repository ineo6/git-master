(function ($) {
  let TOAST_CONTAINER_HTML = '<div class="gm-toast-container" aria-live="polite" aria-atomic="true"></div>';
  let TOAST_WRAPPER_HTML = '<div class="gm-toast-wrapper"></div>';

  function init(opts) {
    // If container is not set in opts use body
    let general_container = $('body');
    if (opts.container && opts.container.length === 1) general_container = opts.container;

    // if toast container and wrapper are not present in container create them
    if (!general_container.children('.gm-toast-container').length) {
      general_container.prepend(TOAST_CONTAINER_HTML);
      general_container.children('.gm-toast-container')
        .append(TOAST_WRAPPER_HTML);

      general_container.on('hidden.bs.toast', '.gm-toast', function () {
        $(this)
          .remove();
      });
    }
    let toast_wrapper = general_container.children('.gm-toast-container')
      .children('.gm-toast-wrapper');

    let id = 'toast-' + ($('.gm-toast').length + 1),
      html = '',
      bg_header_class = '',
      fg_header_class = '',
      fg_subtitle_class = 'text-muted',
      fg_dismiss_class = '',
      title = opts.title || 'Notice!',
      subtitle = opts.subtitle || '',
      content = opts.content || '',
      type = opts.type || 'info',
      delay = opts.delay || -1,
      img = opts.img,
      closable = opts.closable,
      pause_on_hover = opts.pause_on_hover || false,
      pause = false,
      delay_or_autohide = '';

    switch (type) {
      case 'info':
        bg_header_class = 'bg-info';
        fg_header_class = 'toast-text-white';
        fg_subtitle_class = 'toast-text-white';
        fg_dismiss_class = 'toast-text-white';
        break;

      case 'success':
        bg_header_class = 'bg-success';
        fg_header_class = 'toast-text-white';
        fg_subtitle_class = 'toast-text-white';
        fg_dismiss_class = 'toast-text-white';
        break;

      case 'warning':
      case 'warn':
        bg_header_class = 'bg-warning';
        fg_header_class = 'toast-text-white';
        fg_subtitle_class = 'toast-text-white';
        fg_dismiss_class = 'toast-text-white';
        break;

      case 'error':
      case 'danger':
        bg_header_class = 'bg-danger';
        fg_header_class = 'toast-text-white';
        fg_subtitle_class = 'toast-text-white';
        fg_dismiss_class = 'toast-text-white';
        break;
    }

    if (pause_on_hover !== false) {
      let hide_timestamp = Math.floor(Date.now() / 1000) + (delay / 1000);

      delay_or_autohide = 'data-autohide="false"';
      pause_on_hover = 'data-hide-timestamp="' + hide_timestamp + '"';
    } else if (delay === -1) {
      delay_or_autohide = 'data-autohide="false"';
    } else {
      delay_or_autohide = 'data-delay="' + delay + '"';
    }

    html = '<div id="' + id + '" class="gm-toast" role="alert" aria-live="assertive" aria-atomic="true" ' + delay_or_autohide + ' ' + pause_on_hover + '>';
    html += '<div class="gm-toast-header ' + bg_header_class + ' ' + fg_header_class + '">';

    if (typeof img !== 'undefined') {
      html += '<img src="' + img.src + '" class="' + (img.class || '') + ' mr-2" alt="' + (img.alt || 'Image') + '" ' + (typeof img.title !== 'undefined' ? 'data-toggle="tooltip" title="' + img.title + '"' : '') + '>';
    } else {
      html += '<svg class="gm-toast-default-img" width="20" height="20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" focusable="false" role="img"><rect width="100%" height="100%" fill="#007aff"></rect></svg>'
    }

    html += '<strong class="mr-auto">' + title + '</strong>';
    html += '<small class="' + fg_subtitle_class + '">' + subtitle + '</small>';

    if (closable) {
      html += '<button type="button" class="gm-toast-close" data-dismiss="toast" aria-label="Close">';
      html += '<span aria-hidden="true" class="' + fg_dismiss_class + '">&times;</span>';
      html += '</button>';
    }
    html += '</div>';

    if (content !== '') {
      html += '<div class="gm-toast-body">'
      html += content
      html += '</div>';
    }

    html += '</div>';

    toast_wrapper.append(html);
    toast_wrapper.find('.gm-toast:last')
      .gmToast('show');

    if (pause_on_hover !== false) {
      setTimeout(function () {
        if (!pause) {
          $('#' + id)
            .gmToast('hide');
        }
      }, delay);

      $(document)
        .on('mouseover', '#' + id, function () {
          pause = true;
        });

      $(document)
        .on('mouseleave', '#' + id, function () {
          let current = Math.floor(Date.now() / 1000),
            future = parseInt($(this)
              .data('hide-timestamp'));

          pause = false;

          if (current >= future) {
            $(this)
              .gmToast('hide');
          }
        });
    }

    return id;
  }

  function remove(key) {
    $('#' + key)
      .gmToast('hide')
  }

  $.toast = {
    init: init,
    remove: remove,
  }
}(jQuery));
