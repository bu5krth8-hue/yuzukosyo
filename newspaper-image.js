const width = 900;
const margin = 54;
const firstLine = 250;
const lastLine = 1760;
const bodyFont = 'system-ui, "Hiragino Sans", "Yu Gothic", sans-serif';
const titleFont = '"Hiragino Mincho ProN", "Yu Mincho", serif';

function wrap(context, text) {
  const lines = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const char of paragraph) {
      if (line && context.measureText(line + char).width > width - margin * 2) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
    lines.push(line);
  }
  return lines;
}

function paginate(context, articles) {
  const pages = [[]];
  let y = firstLine;
  function addPage() { pages.push([]); y = firstLine; }
  for (const article of articles) {
    const rows = [];
    function add(text, font, color, height) {
      context.font = font;
      for (const line of wrap(context, text)) rows.push({line, font, color, height});
    }
    add(article.label, `bold 23px ${bodyFont}`, '#76522e', 36);
    add(article.headline, `bold 34px ${titleFont}`, '#282621', 50);
    add(article.text, `28px ${bodyFont}`, '#282621', 46);
    if (article.people) add(article.people, `23px ${bodyFont}`, '#605b51', 39);
    const height = rows.reduce((sum, row) => sum + row.height, 0);
    if (y > firstLine && y + Math.min(height, lastLine - firstLine) > lastLine) addPage();
    for (const row of rows) {
      if (y + row.height > lastLine) addPage();
      pages.at(-1).push({...row, y});
      y += row.height;
    }
    y += 34;
  }
  return pages;
}

export function setupImageExport(getIssue) {
  const dialog = document.getElementById('imageExport');
  const preview = document.getElementById('imagePreview');
  const download = document.getElementById('imageDownload');
  const share = document.getElementById('imageShare');
  const previous = document.getElementById('imagePrevious');
  const next = document.getElementById('imageNext');
  const pageLabel = document.getElementById('imagePage');
  const trigger = document.getElementById('saveImage');
  const status = document.getElementById('imageExportStatus');
  let issue, pages, index, objectUrl, photo;
  let revision = 0;

  function clearImage() {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    preview.hidden = true;
    preview.removeAttribute('src');
    download.hidden = true;
    download.removeAttribute('href');
    share.hidden = true;
    photo = null;
  }

  async function showPage() {
    const current = ++revision;
    previous.disabled = next.disabled = true;
    pageLabel.textContent = `${index + 1} / ${pages.length} ページ`;
    clearImage();
    status.textContent = '画像を作成しています…';
    const rows = pages[index];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    const last = rows.at(-1);
    canvas.height = last.y + last.height + margin;
    const context = canvas.getContext('2d');
    try {
      context.fillStyle = '#f8f3e8';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.textBaseline = 'top';
      context.fillStyle = '#282621';
      context.fillRect(margin, 44, width - 2 * margin, 3);
      context.font = `23px ${bodyFont}`;
      context.fillText(`${issue.date} 日本時間`, margin, 61);
      context.textAlign = 'right';
      context.fillText(`${index + 1} / ${pages.length}`, width - margin, 61);
      context.textAlign = 'left';
      context.font = `bold 63px ${titleFont}`;
      context.fillText('柚の新聞', margin, 111);
      context.fillRect(margin, 204, width - 2 * margin, 2);
      for (const {line, font, color, y} of rows) {
        context.font = font;
        context.fillStyle = color;
        context.fillText(line, margin, y);
      }
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
      if (current !== revision) return;
      if (blob?.type !== 'image/jpeg') throw Error('JPEG unavailable');
      objectUrl = URL.createObjectURL(blob);
      preview.src = objectUrl;
      preview.hidden = false;
      download.href = objectUrl;
      download.download = `柚の新聞-${issue.date}-${index + 1}.jpg`;
      download.hidden = false;
      photo = new File([blob], download.download, {type: blob.type});
      share.hidden = !navigator.canShare?.({files: [photo]});
      status.textContent = '';
    } catch {
      if (current === revision) status.textContent = '画像を作成できませんでした。閉じてからもう一度お試しください。';
    } finally {
      canvas.width = canvas.height = 1;
      if (current === revision) {
        previous.disabled = index === 0;
        next.disabled = index === pages.length - 1;
      }
    }
  }

  trigger.addEventListener('click', async () => {
    const selection = getIssue();
    if (!selection.articles.length) return;
    trigger.disabled = true;
    try {
      await document.fonts?.ready;
      const context = document.createElement('canvas').getContext('2d');
      if (!context) throw Error('Canvas unavailable');
      issue = selection;
      pages = paginate(context, issue.articles);
      index = 0;
      dialog.showModal();
      await showPage();
    } catch {
      document.getElementById('copyStatus').textContent = '画像を開けませんでした。もう一度お試しください。';
    } finally {
      trigger.disabled = getIssue().articles.length === 0;
    }
  });
  previous.addEventListener('click', () => { index--; showPage(); });
  next.addEventListener('click', () => { index++; showPage(); });
  share.addEventListener('click', async () => {
    if (!photo) return;
    try { await navigator.share({files: [photo]}); }
    catch (error) {
      if (error.name !== 'AbortError' && dialog.open) status.textContent = '共有できませんでした。「この画像を保存」をお試しください。';
    }
  });
  dialog.addEventListener('close', () => { revision++; clearImage(); });
}
