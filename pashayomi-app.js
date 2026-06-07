const app = document.querySelector('#app')
const lockScreen = document.querySelector('#lockScreen')
const passwordInput = document.querySelector('#passwordInput')
const loginButton = document.querySelector('#loginButton')
const lockError = document.querySelector('#lockError')
const logoutButton = document.querySelector('#logoutButton')

const AUTH_KEY = 'pashayomi_public_auth_v1'
const PASSWORD_HASH = '74df8c5d3d4d0dfd8492a11947041bae5e90776bcedad4a92d9a7b4b9e190fb0'

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
          <h1>パシャ読み</h1>
        </div>
        <span class="badge">公開版</span>
      </div>

      <p class="lead">
        写真の文字を読み取って、好きな位置から日本語音声で読み上げます。
      </p>
    </section>

    <section class="card">
      <h2>1. 写真を選ぶ / カメラで撮る</h2>

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

      <p class="hint">
        iPhoneでは「写真フォルダから選ぶ」と「カメラで撮る」を分けています。
      </p>

      <div id="imagePreviewWrap" class="preview-wrap hidden">
        <img id="imagePreview" alt="選択した画像のプレビュー" />
      </div>

      <div class="setting-grid compact-grid">
        <div>
          <label class="control-label" for="accuracySelect">読み取り精度</label>
          <select id="accuracySelect">
            <option value="normal" selected>標準</option>
            <option value="high">高精度</option>
          </select>
        </div>

        <div>
          <label class="control-label" for="ocrModeSelect">画像補正</label>
          <select id="ocrModeSelect">
            <option value="document" selected>書類向け</option>
            <option value="contrast">くっきり強め</option>
            <option value="grayscale">グレー補正</option>
            <option value="none">補正なし</option>
          </select>
        </div>
      </div>

      <div class="setting-grid compact-grid">
        <div>
          <label class="control-label" for="layoutSelect">文章の向き</label>
          <select id="layoutSelect">
            <option value="3" selected>自動</option>
            <option value="6">横書き・文章</option>
            <option value="5">縦書き寄り</option>
            <option value="11">看板・短い文字</option>
          </select>
        </div>

        <div>
          <label class="control-label" for="languageSelect">読み取り言語</label>
          <select id="languageSelect">
            <option value="jpn" selected>日本語中心・安定</option>
            <option value="jpn_eng">日本語＋英語（重め）</option>
            <option value="jpn_vert">縦書き日本語（重め）</option>
          </select>
        </div>
      </div>

      <label class="checkbox-label ocr-stable-label">
        <input id="mobileStableCheck" type="checkbox" checked />
        <span>スマホ安定モード（画像を軽くして止まりにくくする）</span>
      </label>

      <p class="hint">
        まずは「標準」＋「日本語中心・安定」がおすすめです。英語・縦書きは必要な時だけ使ってください。
      </p>

      <button id="ocrButton" class="primary-button" disabled>
        文字を読み取る
      </button>

      <div class="status-box">
        <p id="statusText">写真を選ぶと、文字認識を開始できます。</p>
        <div class="progress-track">
          <div id="progressBar" class="progress-bar"></div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>2. 読み取った文章</h2>

      <textarea
        id="resultText"
        placeholder="ここに読み取った文章が入ります。手で修正してから読み上げできます。途中をタップして「ここから読む」も使えます。"
      ></textarea>

      <p class="hint">
        途中から読みたい時は、文章内の読み始めたい場所をタップしてから「ここから読む」を押してください。
      </p>

      <div class="button-grid">
        <button id="sampleButton" class="secondary-button">
          サンプル文を入れる
        </button>

        <button id="clearButton" class="secondary-button">
          文章を消す
        </button>
      </div>
    </section>

    <section class="card">
      <h2>3. 読み上げ</h2>

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
    </section>

    <section class="card">
      <h2>4. 読み上げ設定</h2>

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
      <h2>5. 履歴</h2>

      <div class="button-grid">
        <button id="saveHistoryButton" class="secondary-button">
          今の文章を履歴に保存
        </button>

        <button id="clearHistoryButton" class="secondary-button">
          履歴を全削除
        </button>
      </div>

      <div id="historyList" class="history-list"></div>
    </section>

    <p class="footer-note">
      写真や文章はこのブラウザ内で処理します。パスワードは同じ端末のブラウザに保存できます。
    </p>
  </main>
`

const photoInput = document.querySelector('#photoInput')
const cameraInput = document.querySelector('#cameraInput')
const imagePreviewWrap = document.querySelector('#imagePreviewWrap')
const imagePreview = document.querySelector('#imagePreview')
const ocrButton = document.querySelector('#ocrButton')
const statusText = document.querySelector('#statusText')
const progressBar = document.querySelector('#progressBar')
const resultText = document.querySelector('#resultText')

const accuracySelect = document.querySelector('#accuracySelect')
const ocrModeSelect = document.querySelector('#ocrModeSelect')
const layoutSelect = document.querySelector('#layoutSelect')
const languageSelect = document.querySelector('#languageSelect')
const mobileStableCheck = document.querySelector('#mobileStableCheck')

const sampleButton = document.querySelector('#sampleButton')
const clearButton = document.querySelector('#clearButton')

const voiceSelect = document.querySelector('#voiceSelect')
const refreshVoicesButton = document.querySelector('#refreshVoicesButton')
const testVoiceButton = document.querySelector('#testVoiceButton')
const rateRange = document.querySelector('#rateRange')
const rateValue = document.querySelector('#rateValue')
const pitchRange = document.querySelector('#pitchRange')
const pitchValue = document.querySelector('#pitchValue')
const naturalSpeechCheck = document.querySelector('#naturalSpeechCheck')

const speakAllButton = document.querySelector('#speakAllButton')
const speakFromCursorButton = document.querySelector('#speakFromCursorButton')
const speakSelectedButton = document.querySelector('#speakSelectedButton')
const pauseButton = document.querySelector('#pauseButton')
const resumeButton = document.querySelector('#resumeButton')
const stopButton = document.querySelector('#stopButton')

const saveHistoryButton = document.querySelector('#saveHistoryButton')
const clearHistoryButton = document.querySelector('#clearHistoryButton')
const historyList = document.querySelector('#historyList')

let selectedImageFile = null
let worker = null
let workerLanguageKey = ''
let currentOcrRun = 0
let voices = []
let speechQueue = []
let speechQueueIndex = 0
let lastSelectionStart = 0
let lastSelectionEnd = 0
let currentImageUrl = null

const HISTORY_KEY = 'pashayomi_history_v4'
const VOICE_KEY = 'pashayomi_voice_name_v4'

function setStatus(message) {
  statusText.textContent = message
}

function setProgress(value) {
  const safeValue = Math.max(0, Math.min(100, value))
  progressBar.style.width = `${safeValue}%`
}

function setLoading(isLoading) {
  ocrButton.disabled = isLoading || !selectedImageFile
  photoInput.disabled = isLoading
  cameraInput.disabled = isLoading
  ocrButton.textContent = isLoading ? '読み取り中...' : '文字を読み取る'
}

function rememberSelection() {
  if (document.activeElement === resultText) {
    lastSelectionStart = resultText.selectionStart ?? 0
    lastSelectionEnd = resultText.selectionEnd ?? lastSelectionStart
  }
}

function loadVoices() {
  voices = window.speechSynthesis.getVoices()

  const savedVoiceName = localStorage.getItem(VOICE_KEY)
  const japaneseVoices = voices.filter((voice) => {
    return voice.lang && voice.lang.toLowerCase().startsWith('ja')
  })

  voiceSelect.innerHTML = ''

  const autoOption = document.createElement('option')
  autoOption.value = '__auto__'
  autoOption.textContent = '自動で選ぶ（日本語）'
  voiceSelect.appendChild(autoOption)

  if (japaneseVoices.length === 0) {
    const option = document.createElement('option')
    option.value = ''
    option.textContent = '日本語音声が見つかりません'
    option.disabled = true
    voiceSelect.appendChild(option)
    voiceSelect.value = '__auto__'
    return
  }

  japaneseVoices.forEach((voice) => {
    const option = document.createElement('option')
    option.value = voice.name
    option.textContent = `${voice.name} / ${voice.lang}`
    voiceSelect.appendChild(option)
  })

  if (savedVoiceName && japaneseVoices.some((voice) => voice.name === savedVoiceName)) {
    voiceSelect.value = savedVoiceName
  } else {
    voiceSelect.value = '__auto__'
  }
}

function getSelectedVoice() {
  const selectedName = voiceSelect.value

  if (!selectedName || selectedName === '__auto__') {
    return null
  }

  return voices.find((voice) => voice.name === selectedName && voice.lang.toLowerCase().startsWith('ja')) || null
}

function getSelectedLanguageInfo() {
  const selected = languageSelect.value

  if (selected === 'jpn_eng') {
    return {
      code: 'jpn+eng',
      label: '日本語＋英語',
    }
  }

  if (selected === 'jpn_vert') {
    return {
      code: 'jpn_vert',
      label: '縦書き日本語',
    }
  }

  return {
    code: 'jpn',
    label: '日本語',
  }
}

async function terminateWorker() {
  if (!worker) {
    return
  }

  try {
    await worker.terminate()
  } catch (error) {
    console.warn('OCR worker terminate skipped', error)
  } finally {
    worker = null
    workerLanguageKey = ''
  }
}

async function getWorker(languageCode) {
  if (worker && workerLanguageKey === languageCode) {
    return worker
  }

  if (!window.Tesseract) {
    throw new Error('OCRライブラリを読み込めませんでした。通信状態を確認してください。')
  }

  await terminateWorker()

  setStatus(`初回準備中です。${languageCode} のOCRデータを読み込んでいます...`)
  setProgress(5)

  const nextWorker = window.Tesseract.createWorker({
    logger: (message) => {
      if (message.status === 'recognizing text') {
        const percent = Math.round((message.progress || 0) * 100)
        setStatus(`文字を読み取り中... ${percent}%`)
        setProgress(Math.max(35, percent))
        return
      }

      if (message.status === 'loading language traineddata') {
        const percent = Math.round((message.progress || 0) * 30)
        setStatus('日本語OCRデータを読み込んでいます。初回は少し時間がかかります...')
        setProgress(Math.max(8, percent))
        return
      }

      if (message.status === 'initializing tesseract') {
        setStatus('OCRエンジンを初期化しています...')
        setProgress(28)
        return
      }

      if (message.status === 'initialized tesseract') {
        setStatus('OCRエンジン準備完了。文字認識を開始します...')
        setProgress(35)
        return
      }

      if (message.status) {
        setStatus(`準備中: ${message.status}`)
      }
    },
  })

  await withTimeout(nextWorker.load(), 45000, 'OCRエンジンの読み込みに時間がかかっています。通信状態を確認して再試行してください。')
  setProgress(12)
  setStatus('OCR言語データを読み込んでいます...')
  await withTimeout(nextWorker.loadLanguage(languageCode), 90000, '日本語OCRデータの読み込みに時間がかかっています。Wi-Fiで再試行してください。')
  setProgress(28)
  setStatus('OCRエンジンを初期化しています...')
  await withTimeout(nextWorker.initialize(languageCode), 60000, 'OCRエンジンの初期化に時間がかかっています。ページを再読み込みして再試行してください。')

  worker = nextWorker
  workerLanguageKey = languageCode
  return worker
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

function handleFileSelected(file) {
  if (!file) {
    selectedImageFile = null
    ocrButton.disabled = true
    return
  }

  selectedImageFile = file
  makeImagePreview(file)
  ocrButton.disabled = false
  setStatus('写真を選びました。「文字を読み取る」を押してください。')
  setProgress(0)
}

function makeImagePreview(file) {
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
  const highAccuracy = accuracySelect.value === 'high'
  const stableMode = mobileStableCheck.checked

  const maxWidth = stableMode
    ? (highAccuracy ? 1400 : 1100)
    : (highAccuracy ? 2000 : 1500)

  const maxPixels = stableMode
    ? (highAccuracy ? 1800000 : 1200000)
    : (highAccuracy ? 3600000 : 2400000)

  const widthScale = Math.min(1, maxWidth / image.naturalWidth)
  const pixelScale = Math.min(1, Math.sqrt(maxPixels / Math.max(1, image.naturalWidth * image.naturalHeight)))
  const scale = Math.min(widthScale, pixelScale)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))

  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  })

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  const mode = ocrModeSelect.value

  if (mode === 'none') {
    return canvas
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    let adjusted = gray

    if (mode === 'grayscale') {
      adjusted = gray
    }

    if (mode === 'contrast') {
      adjusted = Math.max(0, Math.min(255, (gray - 128) * 1.45 + 128))
    }

    if (mode === 'document') {
      const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.25 + 128))
      adjusted = contrast > 165 ? 255 : Math.max(0, contrast - 25)
    }

    data[i] = adjusted
    data[i + 1] = adjusted
    data[i + 2] = adjusted
  }

  context.putImageData(imageData, 0, 0)
  return canvas
}

async function runOcr() {
  if (!selectedImageFile) {
    setStatus('先に写真を選んでください。')
    return
  }

  const runId = currentOcrRun + 1
  currentOcrRun = runId

  try {
    setLoading(true)
    setProgress(0)
    setStatus('画像をスマホ向けに軽くして、読み取りやすく調整しています...')

    const preparedImage = await prepareImageForOcr(selectedImageFile)
    const languageInfo = getSelectedLanguageInfo()
    const currentWorker = await getWorker(languageInfo.code)

    if (runId !== currentOcrRun) {
      return
    }

    await currentWorker.setParameters({
      tessedit_pageseg_mode: layoutSelect.value,
      preserve_interword_spaces: '1',
    })

    setStatus(`文字を読み取り中... 使用言語: ${languageInfo.label}`)
    setProgress(35)

    const timeoutMs = mobileStableCheck.checked ? 90000 : 130000
    const result = await withTimeout(
      currentWorker.recognize(preparedImage),
      timeoutMs,
      '読み取りに時間がかかりすぎました。スマホ安定モードON、読み取り精度「標準」、Wi-Fi接続で再試行してください。'
    )

    if (runId !== currentOcrRun) {
      return
    }

    let text = result.data.text.trim()
    text = cleanupOcrText(text)

    if (!text) {
      resultText.value = ''
      setStatus('文字を読み取れませんでした。明るい場所で、文字を大きく撮って再試行してください。')
      setProgress(0)
      return
    }

    resultText.value = text
    lastSelectionStart = 0
    lastSelectionEnd = 0
    saveTextToHistory(text)
    setStatus('読み取り完了。必要なら文章を修正してから読み上げてください。')
    setProgress(100)
  } catch (error) {
    console.error(error)
    await terminateWorker()
    setStatus(error.message || 'エラーが出ました。スマホ安定モードON、読み取り精度「標準」、画像補正「書類向け」で再試行してください。')
    setProgress(0)
  } finally {
    setLoading(false)
  }
}

function cleanupOcrText(text) {
  return text
    .replaceAll('|', '｜')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function prepareTextForSpeech(text) {
  let nextText = text.trim()

  if (!naturalSpeechCheck.checked) {
    return nextText
  }

  nextText = nextText
    .replace(/[ \t]+/g, ' ')
    .replace(/([。！？!?])\s*/g, '$1\n')

  const lines = nextText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/[。！？!?、,.，」』）\)]$/.test(line)) {
        return line
      }

      return `${line}。`
    })

  return lines.join('\n')
}

function splitSpeechText(text) {
  const normalized = prepareTextForSpeech(text)
  const parts = normalized
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?\n])/)
    .map((part) => part.trim())
    .filter(Boolean)

  const chunks = []
  let current = ''

  for (const part of parts) {
    if ((current + part).length > 120 && current) {
      chunks.push(current)
      current = part
    } else {
      current += current ? `\n${part}` : part
    }
  }

  if (current) {
    chunks.push(current)
  }

  if (chunks.length === 0 && normalized) {
    return [normalized]
  }

  return chunks
}

function startSpeaking(text, label) {
  const trimmedText = text.trim()

  if (!trimmedText) {
    setStatus('読み上げる文章がありません。')
    return
  }

  window.speechSynthesis.cancel()

  speechQueue = splitSpeechText(trimmedText)
  speechQueueIndex = 0
  setStatus(`${label}で読み上げを開始します。`)
  speakNextChunk()
}

function speakNextChunk() {
  if (speechQueueIndex >= speechQueue.length) {
    speechQueue = []
    speechQueueIndex = 0
    setStatus('読み上げが終わりました。')
    return
  }

  const chunk = speechQueue[speechQueueIndex]
  const utterance = new SpeechSynthesisUtterance(chunk)
  utterance.lang = 'ja-JP'
  utterance.rate = Number(rateRange.value)
  utterance.pitch = Number(pitchRange.value)
  utterance.volume = 1

  const selectedVoice = getSelectedVoice()

  if (selectedVoice) {
    utterance.voice = selectedVoice
  }

  utterance.onstart = () => {
    setStatus(`読み上げ中です。${speechQueueIndex + 1}/${speechQueue.length}`)
  }

  utterance.onend = () => {
    speechQueueIndex += 1
    speakNextChunk()
  }

  utterance.onerror = () => {
    setStatus('読み上げでエラーが出ました。もう一度試してください。')
  }

  window.speechSynthesis.speak(utterance)
}

function speakAllText() {
  startSpeaking(resultText.value, '最初から')
}

function speakFromCursor() {
  const text = resultText.value
  const position = Math.min(lastSelectionStart, text.length)
  const textFromCursor = text.slice(position)

  if (!textFromCursor.trim()) {
    setStatus('カーソル位置より後ろに文章がありません。読みたい場所をタップしてください。')
    return
  }

  startSpeaking(textFromCursor, 'カーソル位置から')
}

function speakSelectedText() {
  const text = resultText.value
  const start = Math.min(lastSelectionStart, lastSelectionEnd)
  const end = Math.max(lastSelectionStart, lastSelectionEnd)
  const selectedText = text.slice(start, end)

  if (!selectedText.trim()) {
    setStatus('選択された文章がありません。文章の一部を選択してから押してください。')
    return
  }

  startSpeaking(selectedText, '選択部分')
}

function pauseSpeech() {
  window.speechSynthesis.pause()
  setStatus('読み上げを一時停止しました。')
}

function resumeSpeech() {
  window.speechSynthesis.resume()
  setStatus('読み上げを再開しました。')
}

function stopSpeech() {
  speechQueue = []
  speechQueueIndex = 0
  window.speechSynthesis.cancel()
  setStatus('読み上げを停止しました。')
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
    return
  }

  const history = getHistory()
  const newItem = {
    id: crypto.randomUUID(),
    text: trimmedText,
    createdAt: new Date().toLocaleString('ja-JP'),
  }

  const filteredHistory = history.filter((item) => item.text !== trimmedText)
  const nextHistory = [newItem, ...filteredHistory].slice(0, 10)

  setHistory(nextHistory)
  renderHistory()
}

function renderHistory() {
  const history = getHistory()

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty">まだ履歴はありません。</p>'
    return
  }

  historyList.innerHTML = history
    .map((item) => {
      const shortText = item.text.length > 70 ? `${item.text.slice(0, 70)}...` : item.text

      return `
        <article class="history-item">
          <p class="history-date">${item.createdAt}</p>
          <p class="history-text">${escapeHtml(shortText)}</p>
          <button class="small-button" data-history-id="${item.id}">
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
        lastSelectionStart = 0
        lastSelectionEnd = 0
        setStatus('履歴の文章を入れました。')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  })
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

photoInput.addEventListener('change', () => {
  handleFileSelected(photoInput.files?.[0])
  cameraInput.value = ''
})

cameraInput.addEventListener('change', () => {
  handleFileSelected(cameraInput.files?.[0])
  photoInput.value = ''
})

ocrButton.addEventListener('click', runOcr)

sampleButton.addEventListener('click', () => {
  resultText.value = 'こんにちは。これはパシャ読みWeb版のテストです。写真の文字を読み取って、途中から日本語音声で読み上げます。\n読みたい場所をタップして、ここから読むボタンを押してください。'
  lastSelectionStart = 0
  lastSelectionEnd = 0
  setStatus('サンプル文を入れました。')
})

clearButton.addEventListener('click', () => {
  resultText.value = ''
  lastSelectionStart = 0
  lastSelectionEnd = 0
  setStatus('文章を消しました。')
})

languageSelect.addEventListener('change', async () => {
  await terminateWorker()
  setStatus('読み取り言語を変更しました。次回の読み取り時にOCRを準備し直します。')
  setProgress(0)
})

voiceSelect.addEventListener('change', () => {
  localStorage.setItem(VOICE_KEY, voiceSelect.value)
})

refreshVoicesButton.addEventListener('click', () => {
  loadVoices()
  setStatus('日本語音声の一覧を更新しました。')
})

testVoiceButton.addEventListener('click', () => {
  startSpeaking('これはパシャ読みの日本語音声テストです。', '声のテスト')
})

rateRange.addEventListener('input', () => {
  rateValue.textContent = rateRange.value
})

pitchRange.addEventListener('input', () => {
  pitchValue.textContent = pitchRange.value
})

speakAllButton.addEventListener('click', speakAllText)
speakFromCursorButton.addEventListener('click', speakFromCursor)
speakSelectedButton.addEventListener('click', speakSelectedText)
pauseButton.addEventListener('click', pauseSpeech)
resumeButton.addEventListener('click', resumeSpeech)
stopButton.addEventListener('click', stopSpeech)

resultText.addEventListener('keyup', rememberSelection)
resultText.addEventListener('click', rememberSelection)
resultText.addEventListener('touchend', () => {
  window.setTimeout(rememberSelection, 80)
})
resultText.addEventListener('select', rememberSelection)
resultText.addEventListener('input', rememberSelection)

saveHistoryButton.addEventListener('click', () => {
  const text = resultText.value.trim()

  if (!text) {
    setStatus('保存する文章がありません。')
    return
  }

  saveTextToHistory(text)
  setStatus('履歴に保存しました。')
})

clearHistoryButton.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY)
  renderHistory()
  setStatus('履歴を削除しました。')
})

window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices)
loadVoices()
window.setTimeout(loadVoices, 500)
window.setTimeout(loadVoices, 1500)
renderHistory()
}

if (sessionStorage.getItem(AUTH_KEY) === 'ok' || localStorage.getItem(AUTH_KEY) === 'ok') {
  showApp()
}
