import {
  Application,
  Assets,
  BlurFilter,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from 'pixi.js'

class SlotMachine {
  static CONFIG = {
    REEL_COUNT: 5,
    SYMBOL_COUNT: 3,
    REEL_WIDTH: 200,
    SYMBOL_SIZE: 200,
    SPIN_DURATION_MULTUPLAYER: 1000,
    BLUR_STRENGTH: 8,
    PLAY_BUTTON_MARGIN: 100,
    TEXT_STYLE: {
      fontFamily: 'Arial',
      fontSize: 36,
      fontStyle: 'italic',
      fontWeight: 'bold',
      stroke: { color: 'white', width: 5 },
    },
    GRID_STYLE: {
      lineWidth: 10,
      color: 'black',
    },
    ASSET_PATHS: {
      SYMBOLS: [
        '/assets/symbols/icon-kiwi.png',
        '/assets/symbols/icon-pear.png',
        '/assets/symbols/icon-apple.png',
        '/assets/symbols/icon-banana.png',
        '/assets/symbols/icon-cherries.png',
        '/assets/symbols/icon-strawberry.png',
        '/assets/symbols/icon-watermelon.png',
        '/assets/symbols/icon-jackpot-machine.png',
      ],
      BACKGROUND: '/assets/imgs/background.jpg',
    },
  }

  async getSpinDuration() {
    try {
      const response = await fetch(
        'https://victoria-soft-test.iceiy.com/server'
      )
      const data = await response.json()
      const { delay } = await data

      return delay
    } catch (error) {
      console.error('Ошибка запроса:', error)
    }

    return data.delay
  }

  constructor(app) {
    this.app = app
    this.reels = []
    this.tweening = []
    this.running = false
    this.assetsLoaded = false
    this.assets = {}

    this.initContainers()
    this.loadAssets().then(() => this.setup())
    this.initResizeHandler()
  }

  async loadAssets() {
    try {
      const { ASSET_PATHS } = SlotMachine.CONFIG
      const assets = [...ASSET_PATHS.SYMBOLS, ASSET_PATHS.BACKGROUND]

      await Assets.load(assets)

      this.assets.symbolTextures = ASSET_PATHS.SYMBOLS.map((path) =>
        Texture.from(path)
      )

      this.assets.backgroundTexture = Texture.from(ASSET_PATHS.BACKGROUND)

      this.assetsLoaded = true
    } catch (error) {
      console.error('Asset loading failed:', error)
    }
  }

  initContainers() {
    this.reelsContainer = new Container()
    this.gridContainer = new Graphics()
    this.mask = new Graphics()

    this.playButton = new Text()
    this.background = new Sprite()

    this.app.stage.addChild(
      this.background,
      this.reelsContainer,
      this.mask,
      this.gridContainer,
      this.playButton
    )
  }

  initResizeHandler() {
    this.app.renderer.on('resize', () => this.handleResize())
  }

  setup() {
    if (!this.assetsLoaded) return

    this.createBackground()
    this.createReels()
    this.createUI()
    this.setupEventListeners()
    this.app.ticker.add(this.update.bind(this))

    this.handleResize()
  }

  createBackground() {
    this.background.texture = this.assets.backgroundTexture
    this.background.width = this.app.screen.width
    this.background.height = this.app.screen.height
  }

  createPlayButton() {
    this.playButton.text = 'старт'
    this.playButton.style = SlotMachine.CONFIG.TEXT_STYLE

    this.playButton.anchor.set(0.5)
    this.playButton.eventMode = 'static'
    this.playButton.cursor = 'pointer'
  }

  createReels() {
    const { REEL_COUNT } = SlotMachine.CONFIG

    for (let i = 0; i < REEL_COUNT; i++) {
      const reel = this.createReel(i)
      this.reels.push(reel)
      this.reelsContainer.addChild(reel.container)
    }

    this.positionReels()
    this.createReelGrid()
  }

  createReel(index) {
    const { REEL_WIDTH, SYMBOL_COUNT, SYMBOL_SIZE } = SlotMachine.CONFIG

    const container = new Container()
    container.x = index * REEL_WIDTH

    const reel = {
      container,
      symbols: [],
      position: 0,
      previousPosition: 0,
      blur: new BlurFilter(),
    }
    reel.blur.strength = 0
    container.filters = [reel.blur]

    for (let i = 0; i < SYMBOL_COUNT + 1; i++) {
      const symbol = this.createRandomSymbol(SYMBOL_SIZE)
      symbol.y = i * SYMBOL_SIZE
      reel.symbols.push(symbol)
      container.addChild(symbol)
    }

    return reel
  }

  createRandomSymbol(size) {
    const texture = this.getRandomSymbolTexture()
    const symbol = new Sprite(texture)

    const scale = Math.min(size / symbol.width, size / symbol.height)
    symbol.scale.set(scale)

    symbol.x = Math.round((size - symbol.width) / 2)
    return symbol
  }

  getRandomSymbolTexture() {
    return this.assets.symbolTextures[
      Math.floor(Math.random() * this.assets.symbolTextures.length)
    ]
  }

  createReelGrid() {
    const { REEL_COUNT, SYMBOL_COUNT, REEL_WIDTH, SYMBOL_SIZE, GRID_STYLE } =
      SlotMachine.CONFIG
    const grid = this.gridContainer
    grid.clear()

    grid.setStrokeStyle({
      width: GRID_STYLE.lineWidth,
      color: GRID_STYLE.color,
    })

    for (let i = 0; i <= REEL_COUNT; i++) {
      const x = this.reelsContainer.x + i * REEL_WIDTH
      grid.moveTo(x, this.reelsContainer.y)
      grid.lineTo(x, this.reelsContainer.y + SYMBOL_SIZE * SYMBOL_COUNT)
    }

    grid.moveTo(this.reelsContainer.x, this.reelsContainer.y + 0 * SYMBOL_SIZE)
    grid.lineTo(
      this.reelsContainer.x + REEL_WIDTH * REEL_COUNT,
      this.reelsContainer.y + 0 * SYMBOL_SIZE
    )
    grid.moveTo(
      this.reelsContainer.x,
      this.reelsContainer.y + SYMBOL_COUNT * SYMBOL_SIZE
    )
    grid.lineTo(
      this.reelsContainer.x + REEL_WIDTH * REEL_COUNT,
      this.reelsContainer.y + SYMBOL_COUNT * SYMBOL_SIZE
    )

    grid.closePath()
    grid.stroke()
  }

  positionReels() {
    const { REEL_WIDTH, REEL_COUNT, SYMBOL_SIZE, SYMBOL_COUNT } =
      SlotMachine.CONFIG
    const reelsContainerWidth = REEL_WIDTH * REEL_COUNT
    const visibleReelsContainerHeight = SYMBOL_SIZE * SYMBOL_COUNT

    this.reelsContainer.x = this.app.screen.width / 2 - reelsContainerWidth / 2

    this.reelsContainer.y =
      (this.app.screen.height - visibleReelsContainerHeight) / 2

    this.mask
      .clear()
      .rect(
        this.reelsContainer.x,
        this.reelsContainer.y,
        reelsContainerWidth,
        visibleReelsContainerHeight
      )
      .fill({ color: 'black' })

    this.reelsContainer.mask = this.mask
  }

  positionPlayButton(playButtonMargin) {
    const { SYMBOL_SIZE, SYMBOL_COUNT } = SlotMachine.CONFIG
    const reelsVisibleHeight = SYMBOL_SIZE * SYMBOL_COUNT

    this.playButton.position.set(
      this.app.screen.width / 2,
      this.reelsContainer.y + reelsVisibleHeight + playButtonMargin
    )
  }

  handleResize() {
    this.background.width = this.app.screen.width
    this.background.height = this.app.screen.height

    this.positionReels()
    this.positionPlayButton(SlotMachine.CONFIG.PLAY_BUTTON_MARGIN)

    this.createReelGrid()
  }

  setupEventListeners() {
    this.playButton.addListener('pointerdown', () => this.startPlay())
  }

  createUI() {
    this.createPlayButton()
    this.createBackgroundImg()
  }

  createBackgroundImg() {
    const backgroundTexture = Texture.from(
      SlotMachine.CONFIG.ASSET_PATHS.BACKGROUND
    )

    this.background.width = this.app.screen.width
    this.background.height = this.app.screen.height
    this.background.texture = backgroundTexture
  }

  async startPlay() {
    if (this.running) return
    this.running = true

    const spinDuration = await this.getSpinDuration()

    this.reels.forEach((reel, index) => {
      const target = reel.position + 10 + index * 5
      const isLastReel = index === this.reels.length - 1

      this.playButton.text = `старт ${spinDuration * SlotMachine.CONFIG.SPIN_DURATION_MULTUPLAYER}мс`

      this.tweenTo(
        reel,
        'position',
        target,
        spinDuration * SlotMachine.CONFIG.SPIN_DURATION_MULTUPLAYER,
        this.backout(0.5),
        null,
        isLastReel ? () => this.onReelsComplete() : null
      )
    })
  }

  onReelsComplete() {
    this.running = false
  }

  update() {
    this.updateReels()
    this.updateTweens()
  }

  updateReels() {
    const { SYMBOL_SIZE, BLUR_STRENGTH } = SlotMachine.CONFIG

    this.reels.forEach((reel) => {
      const delta = reel.position - reel.previousPosition
      reel.blur.strengthY = delta * BLUR_STRENGTH
      reel.previousPosition = reel.position

      reel.symbols.forEach((symbol, index) => {
        const prevY = symbol.y
        const symbolCount = reel.symbols.length

        const newY =
          ((reel.position + index) % symbolCount) * SYMBOL_SIZE - SYMBOL_SIZE
        symbol.y = newY

        if (symbol.y < 0 && prevY > SYMBOL_SIZE) {
          this.updateSymbolTexture(symbol)
        }
      })
    })
  }

  updateSymbolTexture(symbol) {
    const { SYMBOL_SIZE } = SlotMachine.CONFIG

    symbol.texture = this.getRandomSymbolTexture()

    const scale = Math.min(
      SYMBOL_SIZE / symbol.texture.width,
      SYMBOL_SIZE / symbol.texture.height
    )

    symbol.scale.set(scale)
    symbol.x = Math.round((SYMBOL_SIZE - symbol.width) / 2)
  }

  tweenTo(object, property, target, duration, easing, onUpdate, onComplete) {
    const tween = {
      object,
      property,
      startValue: object[property],
      target,
      duration,
      easing,
      onUpdate,
      onComplete,
      startTime: Date.now(),
    }

    this.tweening.push(tween)
    return tween
  }

  updateTweens() {
    const now = Date.now()

    this.tweening = this.tweening.filter((tween) => {
      const elapsed = now - tween.startTime
      const progress = Math.min(1, elapsed / tween.duration)

      tween.object[tween.property] = this.lerp(
        tween.startValue,
        tween.target,
        tween.easing(progress)
      )

      if (tween.onUpdate) tween.onUpdate(tween)

      if (progress === 1) {
        if (tween.onComplete) tween.onComplete(tween)
        return false
      }

      return true
    })
  }

  lerp(a, b, t) {
    return a + (b - a) * t
  }

  backout(amount) {
    return (t) => --t * t * ((amount + 1) * t + amount) + 1
  }
}

;(async () => {
  const app = new Application()
  await app.init({ resizeTo: window })
  document.body.appendChild(app.canvas)

  new SlotMachine(app)
})()
