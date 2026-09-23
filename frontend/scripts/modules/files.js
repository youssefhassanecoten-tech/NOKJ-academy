      // ============================================================
      //  FILE PREVIEW
      // ============================================================
      function openFilePreview(fileName, fileData) {
        var body = document.getElementById('file-preview-body');
        body.innerHTML = '';

        if (!fileData || fileData === '' || fileData === 'dummy-pdf-data' || fileData === 'dummy-doc-data') {
          body.innerHTML =
            '<div class="file-preview-fallback">📄 ' + fileName +
            '<br><br>File content not available. This could be because the file was not uploaded with content in demo mode.</div>';
          document.getElementById('file-preview-overlay').classList.add('open');
          return;
        }

        var ext = fileName.split('.').pop().toLowerCase();
        var isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext);
        var isPDF = ext === 'pdf';
        var isText = ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js', 'log'].includes(ext);

        var content = '';

        if (isImage) {
          content = '<img src="' + fileData + '" class="file-preview-image" alt="' + fileName + '" />';
        } else if (isPDF) {
          content = '<iframe src="' + fileData + '" class="file-preview-iframe" title="' + fileName +
            '"></iframe>';
        } else if (isText) {
          try {
            var base64Data = fileData.split(',')[1] || fileData;
            var decoded = atob(base64Data);
            content = '<pre class="file-preview-text">' + decoded + '</pre>';
          } catch (e) {
            content = '<div class="file-preview-fallback">📄 ' + fileName +
              '<br><br>Text preview not available.<br><a href="' + fileData + '" download="' + fileName +
              '" style="color:var(--primary);">⬇️ Download file</a></div>';
          }
        } else {
          content = '<div class="file-preview-fallback">📄 ' + fileName +
            '<br><br>This file type may not be previewed directly.<br><a href="' + fileData + '" download="' +
            fileName + '" style="color:var(--primary);">⬇️ Download file</a></div>';
        }

        body.innerHTML = content;
        document.getElementById('file-preview-overlay').classList.add('open');
      }

      window.openFilePreview = openFilePreview;

      function closeFilePreview() {
        document.getElementById('file-preview-overlay').classList.remove('open');
        document.getElementById('file-preview-body').innerHTML = '';
      }
