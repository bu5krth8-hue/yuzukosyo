const app = document.querySelector('#app')
const lockScreen = document.querySelector('#lockScreen')
const passwordInput = document.querySelector('#passwordInput')
const loginButton = document.querySelector('#loginButton')
const lockError = document.querySelector('#lockError')
const logoutButton = document.querySelector('#logoutButton')

const AUTH_KEY = 'pashayomi_public_auth_v1'
const PASSWORD_HASH = '74df8c5d3d4d0dfd8492a11947041bae5e90776bcedad4a92d9a7b4b9e190fb0'
const HISTORY_KEY = 'pashayomi_lite_history_v1'
const SETTINGS_KEY = 'pashayomi_lite_settings_v1'

let voices = []
let lastCursorPosition = 0
let selectedImageFile = null
let currentImageUrl = null
let ocrWorker = null
let ocrWorkerKey = ''

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function showApp() {
  lockScreen.classList.add('hidden-auth')
  app.classList.remove('hidden-auth')
  logoutButton.classList.remove('hidden-auth')
  renderApp()
}

async function tryLogin() {
  const value = passwordInput.value.trim()

  if (!value) {
    lockError.textContent = 'パスワードを入力してください。'
    return
  }

  const hash = await sha256Hex(value)

  if (hash !== PASSWORD_HASH) {
    lockError.textContent = 'パスワードが違います。'
    return
  }

  sessionStorage.setItem(AUTH_KEY, 'ok')
  localStorage.setItem(AUTH_KEY, 'ok')
  showApp()
}

logoutButton.addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(AUTH_KEY)
  window.speechSynthesis?.cancel?.()
  location.reload()
})

loginButton.addEventListener('click', tryLogin)
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    tryLogin()
  }
})

function renderApp() {
  if (app.dataset.ready === 'true') {
    return
  }

  app.dataset.ready = 'true'

  app.innerHTML = `
  <main class="app-shell">
    <section class="hero">
      <div class="title-row">
        <div>
          <p class="eyebrow">Web版</p>
          <h1>パシャ読み Lite</h1>
        </div>
        <span class="badge">無料版</span>
      </div>

      <p class="lead">
        文章を貼り付けて、好きな位置から日本語音声で読み上げます。PC推奨の画像読み取りβも追加しました。
      </p>
    </section>

    <section class="card">
      <h2>1. 文章を入れる</h2>

      <div class="server-ocr-note">
        <strong>無料安定版</strong>
        <p>基本は文章を手入力・コピー＆ペーストして読み上げます。画像読み取りβは無料ですが、ブラウザ内OCRのためPC推奨です。</p>
      </div>



      <details class="ocr-beta-panel">
        <summary>画像から読み取る β版（PC推奨）</summary>

        <div class="ocr-beta-note">
          <strong>無料のブラウザ内OCRです</strong>
          <p>OpenAI APIは使いません。けいたさんのPCでは画像読み取りも試せるようにしています。スマホでは重くなる場合があるため、安定運用は「写真アプリで文字コピー → ここに貼り付け」がおすすめです。</p>
        </div>

        <div class="input-grid">
          <label class="file-label photo-label">
            <input id="photoInput" type="file" accept="image/*" />
            <span>写真フォルダから選ぶ</span>
          </label>

          <label class="file-label camera-label">
            <input id="cameraInput" type="file" accept="image/*" capture="environment" />
            <span>カメラで撮る</span>
          </label>
        </div>

        <div id="imagePreviewWrap" class="preview-wrap hidden">
          <img id="imagePreview" alt="選択した画像のプレビュー" />
        </div>

        <div class="setting-grid compact-grid">
          <div>
            <label class="control-label" for="accuracySelect">読み取り精度</label>
            <select id="accuracySelect">
              <option value="normal" selected>標準・軽め</option>
              <option value="high">高精度・重め</option>
            </select>
          </div>

          <div>
            <label class="control-label" for="ocrModeSelect">画像補正</label>
            <select id="ocrModeSelect">
              <option value="document" selected>書類向け</option>
              <option value="grayscale">グレー補正</option>
              <option value="contrast">くっきり強め</option>
              <option value="none">補正なし</option>
            </select>
          </div>
        </div>

        <div class="setting-grid compact-grid">
          <div>
            <label class="control-label" for="layoutSelect">文章の向き</label>
            <select id="layoutSelect">
              <option value="6" selected>横書き・文章</option>
              <option value="11">短い文字・看板</option>
              <option value="3">自動・重め</option>
            </select>
          </div>

          <div>
            <label class="control-label" for="languageSelect">読み取り言語</label>
            <select id="languageSelect">
              <option value="jpn" selected>日本語のみ</option>
              <option value="jpn_eng">日本語＋英語・重め</option>
            </select>
          </div>
        </div>

        <button id="ocrButton" class="primary-button" type="button" disabled>
          画像から文字を読み取る β
        </button>
      </details>

      <textarea
        id="resultText"
        placeholder="ここに読み上げたい文章を入れてください。文章の途中をタップして「ここから読む」も使えます。"
      ></textarea>

      <p id="textCount" class="hint">文字数：0文字</p>

      <div class="button-grid">
        <button id="pasteButton" class="secondary-button">
          クリップボードから貼る
        </button>

        <button id="sampleButton" class="secondary-button">
          サンプル文を入れる
        </button>
      </div>

      <div class="button-grid">
        <button id="clearButton" class="secondary-button">
          文章を消す
        </button>

        <button id="saveHistoryButton" class="secondary-button">
          履歴に保存
        </button>
      </div>

      <p class="hint">
        スマホで画像読み取りβが重い場合は、iPhoneの「テキスト認識表示」や画像内テキストコピー機能で文字をコピーしてから貼り付けてください。
      </p>
    </section>

    <section class="card">
      <h2>2. 読み上げ</h2>

      <p class="hint">
        途中から読みたい時は、文章内の読み始めたい場所をタップしてから「ここから読む」を押してください。
      </p>

      <div class="button-grid speech-grid">
        <button id="speakAllButton" class="primary-button no-margin">
          最初から読む
        </button>

        <button id="speakFromCursorButton" class="primary-button no-margin">
          ここから読む
        </button>

        <button id="speakSelectedButton" class="secondary-button">
          選択部分を読む
        </button>

        <button id="stopButton" class="danger-button">
          停止
        </button>
      </div>

      <div class="button-grid">
        <button id="pauseButton" class="secondary-button">
          一時停止
        </button>

        <button id="resumeButton" class="secondary-button">
          再開
        </button>
      </div>

      <div class="status-box">
        <p id="statusText">文章を入れると読み上げできます。</p>
        <div class="progress-track">
          <div id="progressBar" class="progress-bar"></div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>3. 読み上げ設定</h2>

      <label class="control-label" for="voiceSelect">声（日本語のみ）</label>
      <select id="voiceSelect"></select>

      <div class="button-grid">
        <button id="refreshVoicesButton" class="secondary-button">
          声一覧を更新
        </button>

        <button id="testVoiceButton" class="secondary-button">
          声を試す
        </button>
      </div>

      <label class="control-label" for="rateRange">
        速度：<span id="rateValue">1.0</span>
      </label>
      <input id="rateRange" type="range" min="0.5" max="1.8" step="0.1" value="1.0" />

      <label class="control-label" for="pitchRange">
        高さ：<span id="pitchValue">1.0</span>
      </label>
      <input id="pitchRange" type="range" min="0.7" max="1.5" step="0.1" value="1.0" />

      <label class="checkbox-label">
        <input id="naturalSpeechCheck" type="checkbox" checked />
        <span>読み上げ用に整える（改行や句読点で間を作る）</span>
      </label>

      <p class="hint">
        抑揚そのものはブラウザ音声に依存します。ここでは速度・高さ・区切りを調整して聞きやすくしています。
      </p>
    </section>

    <section class="card">
      <h2>4. 履歴</h2>

      <div class="button-grid">
        <button id="clearHistoryButton" class="secondary-button">
          履歴を全削除
        </button>

        <button id="copyTextButton" class="secondary-button">
          今の文章をコピー
        </button>
      </div>

      <div id="historyList" class="history-list"></div>
    </section>

    <p class="footer-note">
      パシャ読み Liteは無料安定版です。画像読み取りβはPC推奨です。文章と履歴はこのブラウザ内に保存されます。
    </p>
  </main>
`

  initializeApp()
}

function initializeApp() {
  const resultText = document.querySelector('#resultText')
  const textCount = document.querySelector('#textCount')
  const pasteButton = document.querySelector('#pasteButton')
  const sampleButton = document.querySelector('#sampleButton')
  const clearButton = document.querySelector('#clearButton')
  const saveHistoryButton = document.querySelector('#saveHistoryButton')
  const copyTextButton = document.querySelector('#copyTextButton')

  const photoInput = document.querySelector('#photoInput')
  const cameraInput = document.querySelector('#cameraInput')
  const imagePreviewWrap = document.querySelector('#imagePreviewWrap')
  const imagePreview = document.querySelector('#imagePreview')
  const accuracySelect = document.querySelector('#accuracySelect')
  const ocrModeSelect = document.querySelector('#ocrModeSelect')
  const layoutSelect = document.querySelector('#layoutSelect')
  const languageSelect = document.querySelector('#languageSelect')
  const ocrButton = document.querySelector('#ocrButton')

  const statusText = document.querySelector('#statusText')
  const progressBar = document.querySelector('#progressBar')

  const speakAllButton = document.querySelector('#speakAllButton')
  const speakFromCursorButton = document.querySelector('#speakFromCursorButton')
  const speakSelectedButton = document.querySelector('#speakSelectedButton')
  const stopButton = document.querySelector('#stopButton')
  const pauseButton = document.querySelector('#pauseButton')
  const resumeButton = document.querySelector('#resumeButton')

  const voiceSelect = document.querySelector('#voiceSelect')
  const refreshVoicesButton = document.querySelector('#refreshVoicesButton')
  const testVoiceButton = document.querySelector('#testVoiceButton')
  const rateRange = document.querySelector('#rateRange')
  const rateValue = document.querySelector('#rateValue')
  const pitchRange = document.querySelector('#pitchRange')
  const pitchValue = document.querySelector('#pitchValue')
  const naturalSpeechCheck = document.querySelector('#naturalSpeechCheck')
  const clearHistoryButton = document.querySelector('#clearHistoryButton')
  const historyList = document.querySelector('#historyList')

  function setStatus(message) {
    statusText.textContent = message
  }

  function setProgress(value) {
    const safeValue = Math.max(0, Math.min(100, value))
    progressBar.style.width = `${safeValue}%`
  }

  function updateTextCount() {
    const count = resultText.value.length
    textCount.textContent = `文字数：${count.toLocaleString('ja-JP')}文字`
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function saveSettings() {
    const settings = {
      voiceName: voiceSelect.value,
      rate: rateRange.value,
      pitch: pitchRange.value,
      naturalSpeech: naturalSpeechCheck.checked,
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  function applySettings() {
    const settings = loadSettings()

    if (settings.rate) {
      rateRange.value = settings.rate
    }

    if (settings.pitch) {
      pitchRange.value = settings.pitch
    }

    if (typeof settings.naturalSpeech === 'boolean') {
      naturalSpeechCheck.checked = settings.naturalSpeech
    }

    rateValue.textContent = rateRange.value
    pitchValue.textContent = pitchRange.value
  }

  function loadVoices() {
    voices = window.speechSynthesis?.getVoices?.() || []
    const japaneseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ja'))
    const settings = loadSettings()

    voiceSelect.innerHTML = ''

    if (japaneseVoices.length === 0) {
      const option = document.createElement('option')
      option.value = ''
      option.textContent = '自動で選ぶ（日本語）'
      voiceSelect.appendChild(option)
      setStatus('日本語音声一覧を取得できない場合は、自動音声で読み上げます。')
      return
    }

    const autoOption = document.createElement('option')
    autoOption.value = ''
    autoOption.textContent = '自動で選ぶ（日本語）'
    voiceSelect.appendChild(autoOption)

    japaneseVoices.forEach((voice) => {
      const option = document.createElement('option')
      option.value = voice.name
      option.textContent = `${voice.name} / ${voice.lang}`

      if (settings.voiceName && settings.voiceName === voice.name) {
        option.selected = true
      }

      voiceSelect.appendChild(option)
    })
  }

  function getSelectedVoice() {
    const selectedName = voiceSelect.value
    return voices.find((voice) => voice.name === selectedName && voice.lang.toLowerCase().startsWith('ja')) || null
  }

  function cleanTextForSpeech(text) {
    const baseText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!naturalSpeechCheck.checked) {
      return baseText
    }

    return baseText
      .replace(/([。！？!?])\s*/g, '$1\n')
      .replace(/\n+/g, '。')
      .replace(/。。+/g, '。')
      .replace(/、\s*/g, '、')
      .trim()
  }

  function getReadableText(mode) {
    const fullText = resultText.value
    const start = resultText.selectionStart ?? lastCursorPosition
    const end = resultText.selectionEnd ?? start

    if (mode === 'selected') {
      if (start !== end) {
        return resultText.value.slice(start, end).trim()
      }
      return ''
    }

    if (mode === 'cursor') {
      const cursor = typeof start === 'number' ? start : lastCursorPosition
      return fullText.slice(cursor).trim()
    }

    return fullText.trim()
  }

  function speak(mode) {
    const rawText = getReadableText(mode)

    if (!rawText) {
      if (mode === 'selected') {
        setStatus('選択されている文章がありません。読みたい部分を選択してください。')
      } else if (mode === 'cursor') {
        setStatus('カーソル位置より後ろに文章がありません。読み始めたい場所をタップしてください。')
      } else {
        setStatus('読み上げる文章がありません。')
      }
      setProgress(0)
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(rawText))
    utterance.lang = 'ja-JP'
    utterance.rate = Number(rateRange.value)
    utterance.pitch = Number(pitchRange.value)
    utterance.volume = 1

    const selectedVoice = getSelectedVoice()
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => {
      if (mode === 'selected') {
        setStatus('選択部分を読み上げ中です。')
      } else if (mode === 'cursor') {
        setStatus('カーソル位置から読み上げ中です。')
      } else {
        setStatus('最初から読み上げ中です。')
      }
      setProgress(50)
    }

    utterance.onend = () => {
      setStatus('読み上げが終わりました。')
      setProgress(100)
    }

    utterance.onerror = () => {
      setStatus('読み上げでエラーが出ました。もう一度試してください。')
      setProgress(0)
    }

    saveSettings()
    window.speechSynthesis.speak(utterance)
  }

  function getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function setHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }

  function saveTextToHistory(text) {
    const trimmedText = text.trim()

    if (!trimmedText) {
      return false
    }

    const history = getHistory()
    const newItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text: trimmedText,
      createdAt: new Date().toLocaleString('ja-JP'),
    }

    const filteredHistory = history.filter((item) => item.text !== trimmedText)
    const nextHistory = [newItem, ...filteredHistory].slice(0, 20)

    setHistory(nextHistory)
    renderHistory()
    return true
  }

  function escapeHtml(value) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;')
  }

  function renderHistory() {
    const history = getHistory()

    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty">まだ履歴はありません。</p>'
      return
    }

    historyList.innerHTML = history
      .map((item) => {
        const shortText = item.text.length > 80 ? `${item.text.slice(0, 80)}...` : item.text

        return `
          <article class="history-item">
            <p class="history-date">${escapeHtml(item.createdAt)}</p>
            <p class="history-text">${escapeHtml(shortText)}</p>
            <button class="small-button" data-history-id="${escapeHtml(item.id)}">
              この文章を使う
            </button>
          </article>
        `
      })
      .join('')

    historyList.querySelectorAll('[data-history-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.historyId
        const item = getHistory().find((historyItem) => historyItem.id === id)

        if (item) {
          resultText.value = item.text
          updateTextCount()
          setStatus('履歴の文章を入れました。')
          resultText.focus()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    })
  }


  function setOcrLoading(isLoading) {
    if (!ocrButton) {
      return
    }

    ocrButton.disabled = isLoading || !selectedImageFile
    if (photoInput) photoInput.disabled = isLoading
    if (cameraInput) cameraInput.disabled = isLoading
    ocrButton.textContent = isLoading ? '読み取り中...' : '画像から文字を読み取る β'
  }

  function handleFileSelected(file) {
    if (!file) {
      selectedImageFile = null
      if (ocrButton) ocrButton.disabled = true
      return
    }

    selectedImageFile = file
    makeImagePreview(file)
    if (ocrButton) ocrButton.disabled = false
    setStatus('画像を選びました。「画像から文字を読み取る β」を押してください。')
    setProgress(0)
  }

  function makeImagePreview(file) {
    if (!imagePreview || !imagePreviewWrap) {
      return
    }

    if (currentImageUrl) {
      URL.revokeObjectURL(currentImageUrl)
    }

    currentImageUrl = URL.createObjectURL(file)
    imagePreview.src = currentImageUrl
    imagePreviewWrap.classList.remove('hidden')
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      const url = URL.createObjectURL(file)

      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }

      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('画像を読み込めませんでした。'))
      }

      image.src = url
    })
  }

  async function prepareImageForOcr(file) {
    const image = await loadImageFromFile(file)
    const highAccuracy = accuracySelect?.value === 'high'
    const maxWidth = highAccuracy ? 1800 : 1200
    const scale = Math.min(1, maxWidth / image.naturalWidth)

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const mode = ocrModeSelect?.value || 'document'
    if (mode === 'none') {
      return canvas
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      let adjusted = gray

      if (mode === 'contrast') {
        adjusted = Math.max(0, Math.min(255, (gray - 128) * 1.55 + 128))
      }

      if (mode === 'document') {
        const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128))
        adjusted = contrast > 155 ? 255 : Math.max(0, contrast - 30)
      }

      data[i] = adjusted
      data[i + 1] = adjusted
      data[i + 2] = adjusted
    }

    context.putImageData(imageData, 0, 0)
    return canvas
  }

  function getOcrLanguages() {
    if (languageSelect?.value === 'jpn_eng') {
      return ['jpn', 'eng']
    }

    return ['jpn']
  }

  async function getOcrWorker() {
    if (!window.Tesseract?.createWorker) {
      throw new Error('OCRライブラリを読み込めませんでした。通信環境を確認してページを再読み込みしてください。')
    }

    const languages = getOcrLanguages()
    const key = languages.join('+')

    if (ocrWorker && ocrWorkerKey === key) {
      return ocrWorker
    }

    if (ocrWorker) {
      try {
        await ocrWorker.terminate()
      } catch {}
      ocrWorker = null
    }

    setStatus(`OCR準備中です。初回だけ少し時間がかかります。使用言語: ${key}`)
    setProgress(5)

    ocrWorker = await window.Tesseract.createWorker(languages, 1, {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          const percent = Math.round((message.progress || 0) * 100)
          setStatus(`画像読み取り中... ${percent}%`)
          setProgress(percent)
        } else if (message.status) {
          setStatus(`OCR準備中: ${message.status}`)
        }
      },
    })
    ocrWorkerKey = key
    return ocrWorker
  }

  function cleanupOcrText(text) {
    return text
      .replaceAll('|', '｜')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  async function runOcr() {
    if (!selectedImageFile) {
      setStatus('先に画像を選んでください。')
      return
    }

    try {
      setOcrLoading(true)
      setProgress(0)
      setStatus('画像を読み取りやすく調整しています...')

      const preparedImage = await prepareImageForOcr(selectedImageFile)
      const worker = await getOcrWorker()

      await worker.setParameters({
        tessedit_pageseg_mode: layoutSelect?.value || '6',
        preserve_interword_spaces: '1',
      })

      setStatus('画像から文字を読み取り中です。PC推奨のβ機能です。')
      setProgress(10)

      const result = await worker.recognize(preparedImage)
      const text = cleanupOcrText(result?.data?.text || '')

      if (!text) {
        setStatus('文字を読み取れませんでした。文字を大きく、明るく撮って再試行してください。')
        setProgress(0)
        return
      }

      resultText.value = text
      updateTextCount()
      saveTextToHistory(text)
      setStatus('画像から文字を読み取りました。必要なら修正してから読み上げてください。')
      setProgress(100)
      resultText.focus()
    } catch (error) {
      console.error(error)
      setStatus(error?.message || '画像読み取りでエラーが出ました。PCで試すか、写真アプリで文字コピーして貼り付けてください。')
      setProgress(0)
    } finally {
      setOcrLoading(false)
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()

      if (!text.trim()) {
        setStatus('クリップボードに文章がありません。')
        return
      }

      const start = resultText.selectionStart ?? resultText.value.length
      const end = resultText.selectionEnd ?? start
      const before = resultText.value.slice(0, start)
      const after = resultText.value.slice(end)
      resultText.value = `${before}${text}${after}`
      const nextPosition = before.length + text.length
      resultText.setSelectionRange(nextPosition, nextPosition)
      resultText.focus()
      updateTextCount()
      setStatus('クリップボードの文章を貼り付けました。')
    } catch {
      setStatus('自動貼り付けできませんでした。長押しして手動で貼り付けてください。')
      resultText.focus()
    }
  }

  async function copyCurrentText() {
    const text = resultText.value.trim()

    if (!text) {
      setStatus('コピーする文章がありません。')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setStatus('今の文章をコピーしました。')
    } catch {
      setStatus('自動コピーできませんでした。文章を選択して手動でコピーしてください。')
    }
  }

  function rememberCursor() {
    lastCursorPosition = resultText.selectionStart ?? lastCursorPosition
  }

  photoInput?.addEventListener('change', () => {
    handleFileSelected(photoInput.files?.[0])
  })

  cameraInput?.addEventListener('change', () => {
    handleFileSelected(cameraInput.files?.[0])
  })

  ocrButton?.addEventListener('click', runOcr)

  resultText.addEventListener('input', () => {
    updateTextCount()
    rememberCursor()
  })
  resultText.addEventListener('click', rememberCursor)
  resultText.addEventListener('keyup', rememberCursor)
  resultText.addEventListener('select', rememberCursor)

  pasteButton.addEventListener('click', pasteFromClipboard)

  sampleButton.addEventListener('click', () => {
    resultText.value = 'こんにちは。これはパシャ読みLiteのテストです。文章を貼り付けて、最初から読む、ここから読む、選択部分を読む機能を試せます。'
    updateTextCount()
    setStatus('サンプル文を入れました。')
    resultText.focus()
  })

  clearButton.addEventListener('click', () => {
    resultText.value = ''
    updateTextCount()
    setStatus('文章を消しました。')
    setProgress(0)
    resultText.focus()
  })

  saveHistoryButton.addEventListener('click', () => {
    const ok = saveTextToHistory(resultText.value)
    setStatus(ok ? '履歴に保存しました。' : '保存する文章がありません。')
  })

  clearHistoryButton.addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY)
    renderHistory()
    setStatus('履歴を削除しました。')
  })

  copyTextButton.addEventListener('click', copyCurrentText)

  speakAllButton.addEventListener('click', () => speak('all'))
  speakFromCursorButton.addEventListener('click', () => speak('cursor'))
  speakSelectedButton.addEventListener('click', () => speak('selected'))

  stopButton.addEventListener('click', () => {
    window.speechSynthesis.cancel()
    setStatus('読み上げを停止しました。')
    setProgress(0)
  })

  pauseButton.addEventListener('click', () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setStatus('読み上げを一時停止しました。')
    } else {
      setStatus('一時停止できる読み上げがありません。')
    }
  })

  resumeButton.addEventListener('click', () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setStatus('読み上げを再開しました。')
    } else {
      setStatus('再開できる読み上げがありません。')
    }
  })

  refreshVoicesButton.addEventListener('click', () => {
    loadVoices()
    setStatus('日本語音声一覧を更新しました。')
  })

  testVoiceButton.addEventListener('click', () => {
    speakTextForTest()
  })

  function speakTextForTest() {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance('これは、選択中の日本語音声のテストです。')
    utterance.lang = 'ja-JP'
    utterance.rate = Number(rateRange.value)
    utterance.pitch = Number(pitchRange.value)

    const selectedVoice = getSelectedVoice()
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => setStatus('声のテスト中です。')
    utterance.onend = () => setStatus('声のテストが終わりました。')
    utterance.onerror = () => setStatus('声のテストでエラーが出ました。')

    saveSettings()
    window.speechSynthesis.speak(utterance)
  }

  voiceSelect.addEventListener('change', () => {
    saveSettings()
    setStatus('声を変更しました。')
  })

  rateRange.addEventListener('input', () => {
    rateValue.textContent = rateRange.value
    saveSettings()
  })

  pitchRange.addEventListener('input', () => {
    pitchValue.textContent = pitchRange.value
    saveSettings()
  })

  naturalSpeechCheck.addEventListener('change', () => {
    saveSettings()
    setStatus(naturalSpeechCheck.checked ? '読み上げ用に文章を整える設定をONにしました。' : '読み上げ用に文章を整える設定をOFFにしました。')
  })

  window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices)

  applySettings()
  loadVoices()
  renderHistory()
  updateTextCount()
  setProgress(0)
}

if (localStorage.getItem(AUTH_KEY) === 'ok' || sessionStorage.getItem(AUTH_KEY) === 'ok') {
  showApp()
}
