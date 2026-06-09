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
let tesseractLoadPromise = null
const TESSERACT_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'

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
        文章を入れて、流れを整えながら日本語音声で読み上げできます。絵本・教科書の画像読み取りにも対応します。
      </p>
    </section>

    <section class="card">
      <h2>1. 文章を入れる</h2>

      <details class="smart-help">
        <summary>使い方・補足を開く</summary>
        <div class="help-body">
          <p>文章を直接入力するか、コピーした文章を貼り付けて読み上げます。画像から文字を読み取る機能も使えます。</p>
          <p>画像読み取りは無料のブラウザ内OCRです。環境によって重い場合は、iPhoneの写真アプリで文字をコピーして貼り付ける方法が安定します。</p>
        </div>
      </details>

      <details class="ocr-beta-panel">
        <summary>画像から読み取る</summary>

        <details class="smart-help nested-help">
          <summary>画像読み取りの補足を開く</summary>
          <div class="help-body">
            <p>OpenAI APIは使わず、ブラウザ内で画像の文字を読み取ります。画像が大きい場合は少し時間がかかることがあります。</p>
            <p>絵本・教科書のように、イラストと小さめの文字が一緒に写る時は「絵本・教科書向け」と「下側の本文（絵本向け）」がおすすめです。文字だけの範囲を狙うほど読み取りやすくなります。</p>
            <p>高精度・最高精度は複数回読み取って良さそうな結果を採用します。教科書・絵本では「日本語のみ」「横書き・文章」「最大・重め」を使うと、英数字の誤認識が混ざりにくくなります。</p>
          </div>
        </details>

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

        <details class="ocr-settings-panel">
          <summary>読み取り設定を開く</summary>
          <div class="ocr-settings-body">
            <p class="setting-summary-note">初期設定は絵本・教科書向けの高精度設定です。必要な時だけ開いて調整できます。</p>

            <div class="setting-grid compact-grid">
              <div>
                <label class="control-label" for="accuracySelect">読み取り精度</label>
                <select id="accuracySelect">
                  <option value="normal">標準</option>
                  <option value="high">高精度（2回読み取り）</option>
                  <option value="best" selected>最高精度（3回読み取り・重め）</option>
                </select>
              </div>

              <div>
                <label class="control-label" for="ocrModeSelect">画像補正</label>
                <select id="ocrModeSelect">
                  <option value="storybook" selected>絵本・教科書向け</option>
                  <option value="adaptive">文字くっきり自動</option>
                  <option value="document">書類向け</option>
                  <option value="smallText">小さい文字向け</option>
                  <option value="thinText">薄い文字向け</option>
                  <option value="screenshot">画面スクショ向け</option>
                  <option value="inverted">白文字・暗い背景向け</option>
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

            <div class="setting-grid compact-grid">
              <div>
                <label class="control-label" for="ocrScaleSelect">文字の拡大</label>
                <select id="ocrScaleSelect">
                  <option value="auto">自動で大きく</option>
                  <option value="strong">さらに大きく</option>
                  <option value="max" selected>最大・重め</option>
                  <option value="off">拡大なし</option>
                </select>
              </div>

              <div>
                <label class="control-label" for="ocrCropSelect">読み取り範囲</label>
                <select id="ocrCropSelect">
                  <option value="bookText" selected>下側の本文（絵本向け）</option>
                  <option value="lowerCenter">中央下の本文</option>
                  <option value="all">画像全体</option>
                  <option value="center">中央を大きく</option>
                  <option value="top">上半分</option>
                  <option value="bottom">下半分</option>
                </select>
              </div>
            </div>
          </div>
        </details>

        <button id="ocrButton" class="primary-button" type="button" disabled>
          画像から文字を読み取る
        </button>

        <div id="ocrStatusBox" class="ocr-status-box hidden" aria-live="polite">
          <p id="ocrStatusText">画像読み取りの準備中です。</p>
          <div class="ocr-progress-track" aria-hidden="true">
            <div id="ocrProgressBar" class="ocr-progress-bar"></div>
          </div>
        </div>
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

      <details class="smart-help compact-help">
        <summary>画像読み取りが重い時</summary>
        <div class="help-body">
          <p>iPhoneの写真アプリで画像を開き、文字をコピーしてからこの欄に貼り付けると安定します。</p>
        </div>
      </details>
    </section>

    <section class="card">
      <h2>2. 読み上げ</h2>

      <details class="smart-help compact-help">
        <summary>途中から読む時の使い方</summary>
        <div class="help-body">
          <p>文章内の読み始めたい場所をタップしてから「ここから読む」を押してください。文章を選んで「選択部分を読む」こともできます。</p>
        </div>
      </details>

      <div class="button-grid speech-grid">
        <button id="speakAllButton" class="primary-button no-margin">
          最初から読む
        </button>

        <button id="speakFromCursorButton" class="primary-button no-margin">
          ここから読む
        </button>
      </div>

      <button id="speakSelectedButton" class="secondary-button wide-button">
        選択部分を読む
      </button>

      <div class="status-box">
        <p id="statusText">文章を入れると読み上げできます。</p>
        <div class="time-row" aria-label="読み上げ時間">
          <span id="currentTimeText">0:00</span>
          <span id="remainingTimeText">残り 0:00</span>
        </div>
        <input id="speechSeekRange" class="speech-seek-range" type="range" min="0" max="1000" step="1" value="0" disabled aria-label="読み上げ位置を移動" />
        <div class="progress-track" aria-hidden="true">
          <div id="progressBar" class="progress-bar"></div>
        </div>
        <p class="seek-hint">読み上げ中にバーを動かすと、そのあたりから読み直せます。</p>
      </div>

      <div class="button-grid">
        <button id="pauseButton" class="secondary-button">
          一時停止
        </button>

        <button id="resumeButton" class="secondary-button">
          再開
        </button>
      </div>

      <button id="stopButton" class="danger-button stop-bottom-button">
        停止
      </button>
    </section>

    <section class="card">
      <h2>3. 読み上げ設定</h2>

      <label class="control-label" for="speechPresetSelect">聞きやすさ</label>
      <select id="speechPresetSelect">
        <option value="clear" selected>聞きやすい標準</option>
        <option value="slow">ゆっくり・はっきり</option>
        <option value="bright">少し明るめ</option>
        <option value="long">長文向け・落ち着き</option>
      </select>

      <label class="control-label" for="pauseSelect">間の取り方</label>
      <select id="pauseSelect">
        <option value="natural" selected>自然</option>
        <option value="light">少なめ</option>
        <option value="strong">しっかり</option>
      </select>

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
        <span>文章の流れを整える（改行で途切れにくくする）</span>
      </label>

      <details class="smart-help compact-help">
        <summary>声について</summary>
        <div class="help-body">
          <p>選べる声は端末に入っている日本語音声です。「聞きやすさ」と「間の取り方」で、速度・高さ・句読点の間を調整できます。</p>
        </div>
      </details>
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
      パシャ読み Liteは無料安定版です。文章と履歴はこのブラウザ内に保存されます。
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
  const ocrScaleSelect = document.querySelector('#ocrScaleSelect')
  const ocrCropSelect = document.querySelector('#ocrCropSelect')
  const ocrButton = document.querySelector('#ocrButton')
  const ocrStatusBox = document.querySelector('#ocrStatusBox')
  const ocrStatusText = document.querySelector('#ocrStatusText')
  const ocrProgressBar = document.querySelector('#ocrProgressBar')

  const statusText = document.querySelector('#statusText')
  const progressBar = document.querySelector('#progressBar')
  const speechSeekRange = document.querySelector('#speechSeekRange')
  const currentTimeText = document.querySelector('#currentTimeText')
  const remainingTimeText = document.querySelector('#remainingTimeText')

  const speakAllButton = document.querySelector('#speakAllButton')
  const speakFromCursorButton = document.querySelector('#speakFromCursorButton')
  const speakSelectedButton = document.querySelector('#speakSelectedButton')
  const stopButton = document.querySelector('#stopButton')
  const pauseButton = document.querySelector('#pauseButton')
  const resumeButton = document.querySelector('#resumeButton')

  const speechPresetSelect = document.querySelector('#speechPresetSelect')
  const pauseSelect = document.querySelector('#pauseSelect')
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

  const speechState = {
    cleanText: '',
    currentIndex: 0,
    startIndex: 0,
    totalSeconds: 0,
    charsPerSecond: 6,
    startedAt: 0,
    pausedAt: 0,
    pausedMs: 0,
    timerId: null,
    isSpeaking: false,
    isPaused: false,
    isSeeking: false,
    isStopping: false,
    mode: 'all',
    token: 0,
  }

  function setStatus(message) {
    statusText.textContent = message
  }

  function setProgress(value) {
    const safeValue = Math.max(0, Math.min(100, value))
    progressBar.style.width = `${safeValue}%`
    if (!speechState.isSeeking && speechSeekRange) {
      speechSeekRange.value = String(Math.round(safeValue * 10))
    }
  }

  function showOcrStatus() {
    if (ocrStatusBox) {
      ocrStatusBox.classList.remove('hidden')
    }
  }

  function setOcrStatus(message) {
    showOcrStatus()
    if (ocrStatusText) {
      ocrStatusText.textContent = message
    }
  }

  function setOcrProgress(value) {
    showOcrStatus()
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
    if (ocrProgressBar) {
      ocrProgressBar.style.width = `${safeValue}%`
    }
  }

  function resetOcrStatus(message = '画像を選ぶと読み取りを開始できます。') {
    if (ocrStatusText) {
      ocrStatusText.textContent = message
    }
    if (ocrProgressBar) {
      ocrProgressBar.style.width = '0%'
    }
  }

  function formatClock(seconds) {
    const safeSeconds = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0))
    const minutes = Math.floor(safeSeconds / 60)
    const restSeconds = safeSeconds % 60
    return `${minutes}:${String(restSeconds).padStart(2, '0')}`
  }

  function getSpeechCharRate() {
    const rate = Number(rateRange?.value || 1)
    return Math.max(3.2, 6.0 * rate)
  }

  function estimateSpeechSeconds(text) {
    const charRate = getSpeechCharRate()
    const punctuationCount = (text.match(/[、。！？!?]/g) || []).length
    const paragraphCount = (text.match(/[　]{2,}|\n{2,}/g) || []).length
    return Math.max(1, (text.length / charRate) + (punctuationCount * 0.18) + (paragraphCount * 0.6))
  }

  function updateTimeDisplay(index) {
    const totalLength = Math.max(1, speechState.cleanText.length)
    const safeIndex = Math.max(0, Math.min(totalLength, index))
    const percent = totalLength ? (safeIndex / totalLength) * 100 : 0
    const currentSeconds = speechState.totalSeconds * (safeIndex / totalLength)
    const remainingSeconds = Math.max(0, speechState.totalSeconds - currentSeconds)

    speechState.currentIndex = safeIndex
    setProgress(percent)
    if (currentTimeText) currentTimeText.textContent = formatClock(currentSeconds)
    if (remainingTimeText) remainingTimeText.textContent = `残り ${formatClock(remainingSeconds)}`
  }

  function resetSpeechProgress() {
    speechState.token += 1
    speechState.cleanText = ''
    speechState.currentIndex = 0
    speechState.startIndex = 0
    speechState.totalSeconds = 0
    speechState.charsPerSecond = getSpeechCharRate()
    speechState.startedAt = 0
    speechState.pausedAt = 0
    speechState.pausedMs = 0
    speechState.isSpeaking = false
    speechState.isPaused = false
    speechState.isSeeking = false
    window.clearInterval(speechState.timerId)
    speechState.timerId = null
    if (speechSeekRange) {
      speechSeekRange.value = '0'
      speechSeekRange.disabled = true
    }
    setProgress(0)
    if (currentTimeText) currentTimeText.textContent = '0:00'
    if (remainingTimeText) remainingTimeText.textContent = '残り 0:00'
  }

  function stopSpeechTimer() {
    window.clearInterval(speechState.timerId)
    speechState.timerId = null
  }

  function startSpeechTimer() {
    stopSpeechTimer()
    speechState.timerId = window.setInterval(() => {
      if (!speechState.isSpeaking || speechState.isPaused || speechState.isSeeking || !speechState.cleanText) {
        return
      }

      const activeMs = Math.max(0, Date.now() - speechState.startedAt - speechState.pausedMs)
      const activeSeconds = activeMs / 1000
      const nextIndex = Math.min(
        speechState.cleanText.length,
        Math.round(speechState.startIndex + activeSeconds * speechState.charsPerSecond)
      )
      updateTimeDisplay(nextIndex)
    }, 350)
  }

  function getIndexFromSeekRange() {
    const value = Number(speechSeekRange?.value || 0)
    const ratio = Math.max(0, Math.min(1, value / 1000))
    return Math.round((speechState.cleanText.length || 0) * ratio)
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
      speechPreset: speechPresetSelect.value,
      pauseMode: pauseSelect?.value || 'natural',
      voiceName: voiceSelect.value,
      rate: rateRange.value,
      pitch: pitchRange.value,
      naturalSpeech: naturalSpeechCheck.checked,
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }

  function applySettings() {
    const settings = loadSettings()

    if (settings.speechPreset) {
      speechPresetSelect.value = settings.speechPreset
    }

    if (settings.pauseMode && pauseSelect) {
      pauseSelect.value = settings.pauseMode
    }

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

  function getVoiceScore(voice) {
    const name = `${voice.name} ${voice.lang}`.toLowerCase()
    let score = 0

    if (voice.lang.toLowerCase().startsWith('ja')) score += 100
    if (name.includes('siri')) score += 30
    if (name.includes('kyoko') || name.includes('otoya')) score += 26
    if (name.includes('nanami') || name.includes('keita')) score += 24
    if (name.includes('google')) score += 22
    if (name.includes('microsoft')) score += 20
    if (name.includes('premium') || name.includes('enhanced')) score += 12
    if (name.includes('compact')) score -= 4
    if (voice.localService) score += 3

    return score
  }

  function getVoiceLabel(voice, index) {
    const score = getVoiceScore(voice)
    const recommend = index === 0 || score >= 124 ? 'おすすめ・' : ''
    return `${recommend}${voice.name} / ${voice.lang}`
  }

  function loadVoices() {
    voices = window.speechSynthesis?.getVoices?.() || []
    const japaneseVoices = voices
      .filter((voice) => voice.lang.toLowerCase().startsWith('ja'))
      .sort((a, b) => getVoiceScore(b) - getVoiceScore(a) || a.name.localeCompare(b.name, 'ja'))
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

    japaneseVoices.forEach((voice, index) => {
      const option = document.createElement('option')
      option.value = voice.name
      option.textContent = getVoiceLabel(voice, index)

      if (settings.voiceName && settings.voiceName === voice.name) {
        option.selected = true
      }

      if (!settings.voiceName && index === 0) {
        option.selected = true
      }

      voiceSelect.appendChild(option)
    })

    if (!settings.voiceName && japaneseVoices[0]) {
      saveSettings()
    }
  }

  function getSelectedVoice() {
    const selectedName = voiceSelect.value
    return voices.find((voice) => voice.name === selectedName && voice.lang.toLowerCase().startsWith('ja')) || null
  }

  function fixSeparatedDakuten(text) {
    const dakutenMap = {
      'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
      'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
      'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
      'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',
      'う': 'ゔ', 'ゝ': 'ゞ',
      'カ': 'ガ', 'キ': 'ギ', 'ク': 'グ', 'ケ': 'ゲ', 'コ': 'ゴ',
      'サ': 'ザ', 'シ': 'ジ', 'ス': 'ズ', 'セ': 'ゼ', 'ソ': 'ゾ',
      'タ': 'ダ', 'チ': 'ヂ', 'ツ': 'ヅ', 'テ': 'デ', 'ト': 'ド',
      'ハ': 'バ', 'ヒ': 'ビ', 'フ': 'ブ', 'ヘ': 'ベ', 'ホ': 'ボ',
      'ウ': 'ヴ', 'ヽ': 'ヾ'
    }

    const handakutenMap = {
      'は': 'ぱ', 'ひ': 'ぴ', 'ふ': 'ぷ', 'へ': 'ぺ', 'ほ': 'ぽ',
      'ハ': 'パ', 'ヒ': 'ピ', 'フ': 'プ', 'ヘ': 'ペ', 'ホ': 'ポ'
    }

    const dakutenBases = Object.keys(dakutenMap).join('')
    const handakutenBases = Object.keys(handakutenMap).join('')

    return text
      .replace(new RegExp(`([${dakutenBases}])\\s*[゛ﾞ\\u3099]`, 'g'), (_, base) => dakutenMap[base] || base)
      .replace(new RegExp(`([${handakutenBases}])\\s*[゜ﾟ\\u309A]`, 'g'), (_, base) => handakutenMap[base] || base)
      .normalize('NFC')
  }

  function applyPunctuationPauses(text) {
    const mode = pauseSelect?.value || 'natural'
    const gaps = {
      light: { comma: '', sentence: ' ', paragraph: '  ' },
      natural: { comma: ' ', sentence: '　', paragraph: '　　' },
      strong: { comma: '　', sentence: '　　', paragraph: '　　　' },
    }
    const gap = gaps[mode] || gaps.natural

    return text
      .replace(/\n{2,}/g, `。${gap.paragraph}`)
      .replace(/([、，])\s*/g, `$1${gap.comma}`)
      .replace(/([。．])\s*/g, `$1${gap.sentence}`)
      .replace(/([！？!?])\s*/g, `$1${gap.sentence}`)
      .replace(/\s{4,}/g, gap.paragraph)
      .trim()
  }

  function joinBrokenLines(text) {
    const normalized = text
      .replace(new RegExp('\\r\\n?', 'g'), '\n')
      .replace(/[\t　]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!normalized) {
      return ''
    }

    return normalized
      .split(/\n{2,}/)
      .map((paragraph) => {
        return paragraph
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join('\n')
          .replace(/([ぁ-んァ-ン一-龥々ー])\n([ぁ-んァ-ン一-龥々ー])/g, '$1$2')
          .replace(/([A-Za-z0-9])\n([A-Za-z0-9])/g, '$1 $2')
          .replace(/([。！？!?、，,.．」』）】》〉])\n/g, '$1 ')
          .replace(/\n([。！？!?、，,.．])/g, '$1')
          .replace(/\n/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      })
      .filter(Boolean)
      .join('。')
      .replace(/。。+/g, '。')
      .replace(/([。！？!?])([ぁ-んァ-ン一-龥々ーA-Za-z0-9])/g, '$1 $2')
      .trim()
  }

  function cleanTextForSpeech(text) {
    const baseText = fixSeparatedDakuten(text)
      .replace(/\r\n?/g, '\n')
      .trim()

    const flowText = naturalSpeechCheck.checked ? joinBrokenLines(baseText) : baseText

    return applyPunctuationPauses(flowText)
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

  function getSpeechStatusLabel(mode, fromSeek = false) {
    if (fromSeek) return 'バーの位置から読み上げ中です。'
    if (mode === 'selected') return '選択部分を読み上げ中です。'
    if (mode === 'cursor') return 'カーソル位置から読み上げ中です。'
    return '最初から読み上げ中です。'
  }

  function startSpeechFromIndex(index, fromSeek = false) {
    const cleanText = speechState.cleanText
    const safeIndex = Math.max(0, Math.min(cleanText.length, index))
    const speakTarget = cleanText.slice(safeIndex).trim()

    if (!speakTarget) {
      setStatus('その位置より後ろに読み上げる文章がありません。')
      updateTimeDisplay(cleanText.length)
      return
    }

    speechState.isStopping = true
    window.speechSynthesis.cancel()
    stopSpeechTimer()
    const speechToken = ++speechState.token
    speechState.isStopping = false

    speechState.startIndex = safeIndex
    speechState.currentIndex = safeIndex
    speechState.charsPerSecond = Math.max(1, cleanText.length / Math.max(1, speechState.totalSeconds))
    speechState.startedAt = Date.now()
    speechState.pausedAt = 0
    speechState.pausedMs = 0
    speechState.isSpeaking = false
    speechState.isPaused = false

    const utterance = new SpeechSynthesisUtterance(speakTarget)
    utterance.lang = 'ja-JP'
    utterance.rate = Number(rateRange.value)
    utterance.pitch = Number(pitchRange.value)
    utterance.volume = 1

    const selectedVoice = getSelectedVoice()
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => {
      if (speechState.token !== speechToken) return
      speechState.isSpeaking = true
      speechState.isPaused = false
      if (speechSeekRange) speechSeekRange.disabled = false
      setStatus(getSpeechStatusLabel(speechState.mode, fromSeek))
      updateTimeDisplay(safeIndex)
      startSpeechTimer()
    }

    utterance.onboundary = (event) => {
      if (speechState.token !== speechToken) return
      if (typeof event.charIndex === 'number' && Number.isFinite(event.charIndex)) {
        updateTimeDisplay(Math.min(cleanText.length, safeIndex + event.charIndex))
      }
    }

    utterance.onend = () => {
      if (speechState.token !== speechToken) return
      stopSpeechTimer()
      speechState.isSpeaking = false
      speechState.isPaused = false
      updateTimeDisplay(cleanText.length)
      setStatus('読み上げが終わりました。')
    }

    utterance.onerror = () => {
      if (speechState.token !== speechToken) return
      stopSpeechTimer()
      speechState.isSpeaking = false
      speechState.isPaused = false
      if (!speechState.isStopping) {
        setStatus('読み上げでエラーが出ました。もう一度試してください。')
      }
    }

    saveSettings()
    window.speechSynthesis.speak(utterance)
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
      resetSpeechProgress()
      return
    }

    const cleanText = cleanTextForSpeech(rawText)
    speechState.mode = mode
    speechState.cleanText = cleanText
    speechState.totalSeconds = estimateSpeechSeconds(cleanText)
    speechState.charsPerSecond = Math.max(1, cleanText.length / Math.max(1, speechState.totalSeconds))

    startSpeechFromIndex(0, false)
  }

  function seekSpeechToCurrentRange() {
    if (!speechState.cleanText) {
      setStatus('先に読み上げを開始してください。')
      return
    }

    const seekIndex = getIndexFromSeekRange()
    updateTimeDisplay(seekIndex)
    startSpeechFromIndex(seekIndex, true)
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
    ocrButton.textContent = isLoading ? '読み取り中...' : '画像から文字を読み取る'
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
    setStatus('画像を選びました。「画像から文字を読み取る」を押してください。')
    resetOcrStatus('画像を選びました。「画像から文字を読み取る」を押してください。')
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

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)))
  }

  function getOcrTargetWidth(mode, accuracy, scaleMode) {
    if (scaleMode === 'off') {
      if (accuracy === 'best') return 2200
      if (accuracy === 'high') return 1900
      if (mode === 'smallText') return 1900
      if (mode === 'screenshot') return 1700
      return 1500
    }

    if (mode === 'storybook') return 3000
    if (scaleMode === 'max') return 2800
    if (scaleMode === 'strong') return 2500
    if (accuracy === 'best') return 2600
    if (accuracy === 'high') return 2300
    if (mode === 'smallText') return 2500
    if (mode === 'thinText') return 2300
    if (mode === 'screenshot') return 2200
    return 2100
  }

  function getOcrMaxScale(mode, accuracy, scaleMode) {
    if (scaleMode === 'off') return 1
    if (mode === 'storybook') return 3.2
    if (scaleMode === 'max') return 3
    if (scaleMode === 'strong') return 2.4
    if (accuracy === 'best') return 2.6
    if (accuracy === 'high') return 2.2
    if (mode === 'smallText') return 2.4
    return 1.9
  }

  function getCropBox(width, height) {
    const cropMode = ocrCropSelect?.value || 'all'

    if (cropMode === 'bookText') {
      const cropWidth = Math.round(width * 0.86)
      const cropHeight = Math.round(height * 0.46)
      return {
        sx: Math.round(width * 0.07),
        sy: Math.round(height * 0.40),
        sw: cropWidth,
        sh: cropHeight,
      }
    }

    if (cropMode === 'lowerCenter') {
      const cropWidth = Math.round(width * 0.78)
      const cropHeight = Math.round(height * 0.52)
      return {
        sx: Math.round(width * 0.11),
        sy: Math.round(height * 0.34),
        sw: cropWidth,
        sh: cropHeight,
      }
    }

    if (cropMode === 'center') {
      const cropWidth = Math.round(width * 0.82)
      const cropHeight = Math.round(height * 0.82)
      return {
        sx: Math.round((width - cropWidth) / 2),
        sy: Math.round((height - cropHeight) / 2),
        sw: cropWidth,
        sh: cropHeight,
      }
    }

    if (cropMode === 'top') {
      return { sx: 0, sy: 0, sw: width, sh: Math.round(height * 0.58) }
    }

    if (cropMode === 'bottom') {
      const cropHeight = Math.round(height * 0.58)
      return { sx: 0, sy: height - cropHeight, sw: width, sh: cropHeight }
    }

    return { sx: 0, sy: 0, sw: width, sh: height }
  }

  function getAdaptiveThreshold(data) {
    let sum = 0
    let count = 0

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      sum += gray
      count += 1
    }

    const average = count ? sum / count : 150
    return Math.max(92, Math.min(188, average - 18))
  }

  function softenWhiteBackground(value) {
    if (value > 235) return 255
    if (value > 215) return 245
    return value
  }

  function thickenDarkPixels(context, width, height) {
    const imageData = context.getImageData(0, 0, width, height)
    const data = imageData.data
    const source = new Uint8ClampedArray(data)

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = (y * width + x) * 4
        if (source[idx] < 32) continue

        let hasDarkNeighbor = false
        for (let dy = -1; dy <= 1 && !hasDarkNeighbor; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue
            const nidx = ((y + dy) * width + (x + dx)) * 4
            if (source[nidx] < 45) {
              hasDarkNeighbor = true
              break
            }
          }
        }

        if (hasDarkNeighbor) {
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
        }
      }
    }

    context.putImageData(imageData, 0, 0)
  }

  async function prepareImageForOcr(file, modeOverride) {
    const image = await loadImageFromFile(file)
    const accuracy = accuracySelect?.value || 'normal'
    const mode = modeOverride || ocrModeSelect?.value || 'document'
    const scaleMode = ocrScaleSelect?.value || 'auto'
    const crop = getCropBox(image.naturalWidth, image.naturalHeight)
    const targetWidth = getOcrTargetWidth(mode, accuracy, scaleMode)
    const maxScale = getOcrMaxScale(mode, accuracy, scaleMode)
    const scale = Math.max(0.35, Math.min(maxScale, targetWidth / crop.sw))

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(crop.sw * scale))
    canvas.height = Math.max(1, Math.round(crop.sh * scale))

    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height)

    if (mode === 'none') {
      return canvas
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const adaptiveThreshold = getAdaptiveThreshold(data)

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const gray = r * 0.299 + g * 0.587 + b * 0.114
      let adjusted = gray

      if (mode === 'grayscale') {
        adjusted = softenWhiteBackground(gray)
      }

      if (mode === 'screenshot') {
        const contrasted = clampByte((gray - 128) * 1.38 + 138)
        adjusted = contrasted > 222 ? 255 : contrasted
      }

      if (mode === 'contrast') {
        adjusted = clampByte((gray - 128) * 1.8 + 128)
      }

      if (mode === 'thinText') {
        const brightened = gray + 28
        adjusted = clampByte((brightened - 128) * 1.55 + 128)
        adjusted = adjusted > 226 ? 255 : adjusted
      }

      if (mode === 'smallText') {
        const contrast = clampByte((gray - 128) * 1.9 + 128)
        adjusted = contrast > 172 ? 255 : clampByte(contrast - 24)
      }

      if (mode === 'storybook') {
        const contrast = clampByte((gray - 128) * 2.05 + 128)
        const threshold = Math.max(138, Math.min(196, adaptiveThreshold + 8))
        adjusted = contrast > threshold ? 255 : 0
      }

      if (mode === 'adaptive') {
        adjusted = gray > adaptiveThreshold ? 255 : 0
      }

      if (mode === 'inverted') {
        const inverted = 255 - gray
        adjusted = inverted > adaptiveThreshold ? 255 : 0
      }

      if (mode === 'document') {
        const contrast = clampByte((gray - 128) * 1.52 + 128)
        adjusted = contrast > 164 ? 255 : clampByte(contrast - 30)
      }

      data[i] = adjusted
      data[i + 1] = adjusted
      data[i + 2] = adjusted
    }

    context.putImageData(imageData, 0, 0)

    if (mode === 'storybook') {
      thickenDarkPixels(context, canvas.width, canvas.height)
    }

    return canvas
  }


  function loadTesseractLibrary() {
    if (window.Tesseract?.createWorker) {
      return Promise.resolve()
    }

    if (tesseractLoadPromise) {
      return tesseractLoadPromise
    }

    setOcrStatus('OCRライブラリを読み込み中です。初回だけ少し時間がかかります。')
    setOcrProgress(3)

    tesseractLoadPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-pashayomi-tesseract="true"]')

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true })
        existingScript.addEventListener('error', () => reject(new Error('OCRライブラリの読み込みに失敗しました。通信環境を確認してから再読み込みしてください。')), { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = TESSERACT_SCRIPT_URL
      script.async = true
      script.defer = true
      script.dataset.pashayomiTesseract = 'true'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('OCRライブラリの読み込みに失敗しました。通信環境を確認してから再読み込みしてください。'))
      document.head.appendChild(script)
    })

    return tesseractLoadPromise
  }

  function getOcrLanguages() {
    if (languageSelect?.value === 'jpn_eng') {
      return ['jpn', 'eng']
    }

    return ['jpn']
  }

  async function getOcrWorker() {
    await loadTesseractLibrary()

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

    setOcrStatus(`OCR準備中です。初回だけ少し時間がかかります。使用言語: ${key}`)
    setOcrProgress(5)

    ocrWorker = await window.Tesseract.createWorker(languages, 1, {
      logger: (message) => {
        if (message.status === 'recognizing text') {
          const percent = Math.round((message.progress || 0) * 100)
          setOcrStatus(`画像読み取り中... ${percent}%`)
          setOcrProgress(percent)
        } else if (message.status) {
          setOcrStatus(`OCR準備中: ${message.status}`)
        }
      },
    })
    ocrWorkerKey = key
    return ocrWorker
  }

  function removeOcrNoiseLines(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) return false

        const compact = line.replace(/\s/g, '')
        const usefulCount = (compact.match(/[ぁ-んァ-ン一-龥々A-Za-z0-9０-９]/g) || []).length
        const noiseCount = (compact.match(/[~^_=`{}\[\]<>｜|○●□■◆◇◎▲△▽▼※〓●]/g) || []).length

        if (compact.length <= 1) return false
        if (usefulCount === 0 && noiseCount > 0) return false
        if (compact.length <= 3 && noiseCount >= usefulCount + 1) return false
        if (noiseCount >= 5 && usefulCount <= 2) return false
        return true
      })
      .join('\n')
  }

  function cleanupOcrText(text) {
    const normalized = fixSeparatedDakuten(text || '')
      .normalize('NFKC')
      .replace(/[|]/g, '｜')
      .replace(/[¬―‐‑‒–—−]/g, 'ー')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[ 	　]+\n/g, '\n')
      .replace(/([ぁ-んァ-ン一-龥々ー])\s+([ぁ-んァ-ン一-龥々ー])/g, '$1$2')
      .replace(/([0-9０-９])\s+([0-9０-９])/g, '$1$2')
      .replace(/[□■◆◇○●◎▲△▽▼〓]/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return removeOcrNoiseLines(normalized)
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function scoreOcrText(text, confidence) {
    const cleaned = cleanupOcrText(text || '')
    const japaneseCount = (cleaned.match(/[ぁ-んァ-ン一-龥々]/g) || []).length
    const symbolNoise = (cleaned.match(/[~^_=`{}\[\]<>]/g) || []).length
    const usableLength = cleaned.replace(/\s/g, '').length
    return (Number(confidence) || 0) + japaneseCount * 0.9 + usableLength * 0.12 - symbolNoise * 2
  }


  function getOcrModeLabel(mode) {
    const labels = {
      storybook: '絵本・教科書向け',
      document: '書類向け',
      smallText: '小さい文字向け',
      thinText: '薄い文字向け',
      screenshot: '画面スクショ向け',
      adaptive: '文字くっきり自動',
      inverted: '白文字・暗い背景向け',
      grayscale: 'グレー補正',
      contrast: 'くっきり強め',
      none: '補正なし',
    }

    return labels[mode] || '標準補正'
  }

  function getOcrPassModes() {
    const selectedMode = ocrModeSelect?.value || 'document'
    const accuracy = accuracySelect?.value || 'normal'

    if (accuracy === 'best') {
      if (selectedMode === 'storybook') {
        return ['storybook', 'adaptive', 'smallText']
      }
      return Array.from(new Set([selectedMode, 'adaptive', 'document'])).slice(0, 3)
    }

    if (accuracy === 'high') {
      return Array.from(new Set([selectedMode, selectedMode === 'document' ? 'adaptive' : 'document']))
    }

    return [selectedMode]
  }

  async function runOcr() {
    if (!selectedImageFile) {
      setOcrStatus('先に画像を選んでください。')
      return
    }

    try {
      setOcrLoading(true)
      setOcrProgress(0)
      setOcrStatus('画像を読み取りやすく調整しています...')

      const worker = await getOcrWorker()

      await worker.setParameters({
        tessedit_pageseg_mode: layoutSelect?.value || '6',
        preserve_interword_spaces: '1',
      })

      const passModes = getOcrPassModes()
      let bestText = ''
      let bestScore = -Infinity

      for (let index = 0; index < passModes.length; index += 1) {
        const passMode = passModes[index]
        setOcrStatus(`画像から文字を読み取り中です。${index + 1}/${passModes.length}回目: ${getOcrModeLabel(passMode)}`)
        setOcrProgress(10 + Math.round((index / Math.max(1, passModes.length)) * 70))

        const preparedImage = await prepareImageForOcr(selectedImageFile, passMode)
        const result = await worker.recognize(preparedImage)
        const candidateText = cleanupOcrText(result?.data?.text || '')
        const candidateScore = scoreOcrText(candidateText, result?.data?.confidence)

        if (candidateScore > bestScore) {
          bestScore = candidateScore
          bestText = candidateText
        }
      }

      const text = bestText

      if (!text) {
        setOcrStatus('文字を読み取れませんでした。文字を大きく、明るく撮って再試行してください。')
        setOcrProgress(0)
        return
      }

      resultText.value = text
      updateTextCount()
      saveTextToHistory(text)
      setOcrStatus('画像から文字を読み取りました。絵本・教科書は「下側の本文（絵本向け）」や「日本語のみ」が読みやすいです。')
      setOcrProgress(100)
      setStatus('画像から文字を読み取りました。文章欄に入れました。')
      resultText.focus()
    } catch (error) {
      console.error(error)
      setOcrStatus(error?.message || '画像読み取りでエラーが出ました。別の画像で試すか、写真アプリで文字コピーして貼り付けてください。')
      setOcrProgress(0)
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

  function applySpeechPreset(preset) {
    const presets = {
      clear: { rate: '0.95', pitch: '1.0', naturalSpeech: true, pauseMode: 'natural', label: '聞きやすい標準にしました。' },
      slow: { rate: '0.82', pitch: '0.95', naturalSpeech: true, pauseMode: 'strong', label: 'ゆっくり・はっきりにしました。' },
      bright: { rate: '1.03', pitch: '1.08', naturalSpeech: true, pauseMode: 'natural', label: '少し明るめの設定にしました。' },
      long: { rate: '0.88', pitch: '0.92', naturalSpeech: true, pauseMode: 'strong', label: '長文向けの落ち着いた設定にしました。' },
    }

    const selected = presets[preset] || presets.clear
    rateRange.value = selected.rate
    pitchRange.value = selected.pitch
    naturalSpeechCheck.checked = selected.naturalSpeech
    if (pauseSelect) pauseSelect.value = selected.pauseMode
    rateValue.textContent = rateRange.value
    pitchValue.textContent = pitchRange.value
    saveSettings()
    setStatus(selected.label)
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
    resultText.value = 'こんにちは。これはパシャ読みLiteのテストです。文章を貼り付けて、改行で分かれた文章も流れを整えて読み上げます。最初から読む、ここから読む、選択部分を読む機能を試せます。'
    updateTextCount()
    setStatus('サンプル文を入れました。')
    resultText.focus()
  })

  clearButton.addEventListener('click', () => {
    resultText.value = ''
    updateTextCount()
    speechState.isStopping = true
    window.speechSynthesis.cancel()
    resetSpeechProgress()
    setStatus('文章を消しました。')
    window.setTimeout(() => {
      speechState.isStopping = false
    }, 300)
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
    speechState.isStopping = true
    window.speechSynthesis.cancel()
    resetSpeechProgress()
    setStatus('読み上げを停止しました。')
    window.setTimeout(() => {
      speechState.isStopping = false
    }, 300)
  })

  pauseButton.addEventListener('click', () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      speechState.isPaused = true
      speechState.pausedAt = Date.now()
      setStatus('読み上げを一時停止しました。')
    } else {
      setStatus('一時停止できる読み上げがありません。')
    }
  })

  resumeButton.addEventListener('click', () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      if (speechState.pausedAt) {
        speechState.pausedMs += Date.now() - speechState.pausedAt
      }
      speechState.pausedAt = 0
      speechState.isPaused = false
      setStatus('読み上げを再開しました。')
    } else {
      setStatus('再開できる読み上げがありません。')
    }
  })

  speechSeekRange?.addEventListener('input', () => {
    if (!speechState.cleanText) return
    speechState.isSeeking = true
    const seekIndex = getIndexFromSeekRange()
    updateTimeDisplay(seekIndex)
    speechState.isSeeking = false
  })

  speechSeekRange?.addEventListener('change', () => {
    seekSpeechToCurrentRange()
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

  speechPresetSelect.addEventListener('change', () => {
    applySpeechPreset(speechPresetSelect.value)
  })

  pauseSelect?.addEventListener('change', saveSettings)

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
    setStatus(naturalSpeechCheck.checked ? '文章の流れを整える設定をONにしました。' : '文章の流れを整える設定をOFFにしました。')
  })

  window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices)

  applySettings()
  if (!loadSettings().speechPreset) {
    applySpeechPreset('clear')
  }
  loadVoices()
  renderHistory()
  updateTextCount()
  resetSpeechProgress()
}

if (localStorage.getItem(AUTH_KEY) === 'ok' || sessionStorage.getItem(AUTH_KEY) === 'ok') {
  showApp()
}
