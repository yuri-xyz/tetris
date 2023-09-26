import * as util from "./util"
import * as dom from "./dom"
import {Const} from "./game"
import VanillaTilt from "vanilla-tilt"

export type Vector2 = {x: number, y: number}

type Particle = {
  position: Vector2
  velocity: Vector2
  radius: number
  color: string
  maxLifetime: number
  lifetime: number
  $element: HTMLDivElement
  opacityMin: number
  opacityMax: number
}

type ParticleSpawnOptions = {
  countMin: number
  countMax: number
  position?: Vector2
  lifetimeMin: number
  lifetimeMax: number
  radiusMin: number
  radiusMax: number
  blurMin: number
  blurMax: number
  classNames: string[]
  velocityFactor: number
  opacityMin: number
  opacityMax: number
  directionDegrees?: number,
  colors: string[]
}

const particles: Particle[] = []

export function initializeParticles(): void {
  let lastTime = 0

  const update = (time: DOMHighResTimeStamp) => {
    const deltaTime = time - lastTime

    lastTime = time

    for (const [index, particle] of particles.entries()) {
      particle.lifetime -= deltaTime

      if (particle.lifetime <= 0) {
        particle.$element.remove()
        // FIXME: Won't this affect the indices of the particles after this one?
        particles.splice(index, 1)

        continue
      }

      const opacityPercentage = particle.lifetime / particle.maxLifetime

      particle.position.x += particle.velocity.x * deltaTime
      particle.position.y += particle.velocity.y * deltaTime
      particle.$element.style.top = `${particle.position.y}px`
      particle.$element.style.left = `${particle.position.x}px`
      particle.$element.style.opacity = `${particle.opacityMin + opacityPercentage * (particle.opacityMax - particle.opacityMin)}`
    }

    requestAnimationFrame(update)
  }

  requestAnimationFrame(update)
}

export function spawnParticles(options: ParticleSpawnOptions): void {
  const randomVelocityComponent = () => Math.random() * options.velocityFactor * util.randomSign()
  const count = util.randomInt(options.countMin, options.countMax)

  const convertDegreesToVelocity = (degrees: number) => {
    const radians = degrees * Math.PI / 180

    return {
      x: Math.cos(radians),
      y: Math.sin(radians),
    }
  }

  for (let i = 0; i < count; i++) {
    const $element = document.createElement("div")
    const radius = util.randomInt(options.radiusMin, options.radiusMax)
    const blurPercentage = (radius - options.radiusMin) / (options.radiusMax - options.radiusMin)
    const color = util.chooseRandom(options.colors)

    $element.style.width = `${radius}px`
    $element.style.height = `${radius}px`
    $element.style.filter = `blur(${options.blurMin + blurPercentage * (options.blurMax - options.blurMin)}px)`
    $element.style.backgroundColor = color
    $element.style.boxShadow = `0 0 10px ${color}`

    for (const className of options.classNames)
      $element.classList.add(className)

    const lifetime = util.randomInt(options.lifetimeMin, options.lifetimeMax)
    const x = options.position?.x ?? util.randomInt(0, window.innerWidth)
    const y = options.position?.y ?? util.randomInt(0, window.innerHeight)

    const velocity = options.directionDegrees === undefined
      ? {x: randomVelocityComponent(), y: randomVelocityComponent()}
      // OPTIMIZE: The direction velocity only needs to be calculated once, if the direction degrees is provided.
      : convertDegreesToVelocity(options.directionDegrees)

    particles.push({
      position: {x, y},
      velocity,
      radius: 0,
      color,
      maxLifetime: lifetime,
      lifetime,
      $element,
      opacityMin: options.opacityMin,
      opacityMax: options.opacityMax,
    })

    document.body.appendChild($element)
  }
}

export function playInitializationEffectSequence(): void {
  if (!Const.IS_DEBUG_MODE || Const.DEBUG_PLAY_MUSIC)
    util.playThemeAudio()

  initializeParticles()

  VanillaTilt.init(document.querySelector<HTMLElement>(".grid")!, {
    max: 5,
    speed: 200
  })

  // Spawn background particles.
  spawnParticles({
    countMin: 30,
    countMax: 40,
    lifetimeMin: 5000,
    // TODO: Background particles need to life forever, or new ones need to be spawned every so often.
    lifetimeMax: 600_000_000,
    radiusMin: 5,
    radiusMax: 30,
    blurMin: 1,
    blurMax: 3,
    classNames: ["particle"],
    velocityFactor: 0.02,
    opacityMin: 0,
    opacityMax: 0.1,
    colors: ["#fff"]
  })
}

export function playPlacementEffectSequence(): void {
  util.playSound(util.Sound.Floor)
  dom.playAnimation(document.querySelector(Const.BOARD_SELECTOR)!, dom.Animation.AbsorbBottomShock, 400)

  spawnParticles({
    countMin: 10,
    countMax: 15,
    lifetimeMin: 1000,
    lifetimeMax: 2500,
    radiusMin: 3,
    radiusMax: 10,
    blurMin: 1,
    blurMax: 2,
    classNames: ["particle", "action"],
    velocityFactor: 0.2,
    opacityMin: 0,
    opacityMax: 0.9,
    colors: ["#fff"]
  })
}

export function playTetrisScoreEffectSequence(): void {
  util.playSound(util.Sound.Tetris)

  // REVISE: Don't use hard-coded selector.
  dom.playAnimation(document.querySelector(".score-alert")!, dom.Animation.ScoreAlert, 3000)

  spawnParticles({
    countMin: 40,
    countMax: 50,
    lifetimeMin: 1000,
    lifetimeMax: 4000,
    radiusMin: 10,
    radiusMax: 15,
    blurMin: 0,
    blurMax: 2,
    // REVISE: Avoid hard-coding class names.
    classNames: ["particle", "tetris"],
    velocityFactor: 0.5,
    opacityMin: 0.2,
    opacityMax: 0.5,
    // REVISE: Avoid hard-coding colors.
    colors: ["#6666ff", "#0099ff", "#00ff00", "#ff3399"]
  })
}

export function playRowClearEffectSequence(rows: number[]): void {
  const getRowCells = (row: number): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>(`[data-row='${row}']`))

  const DELAY_BETWEEN_ROWS = 15

  for (const [rowIndex, row] of rows.entries()) {
    const $cells = getRowCells(row)

    for (const [cellIndex, $cell] of $cells.entries()) {
      // This causes the animation to play from top left to bottom right.
      const delay = ((rowIndex * rows.length) + cellIndex) * DELAY_BETWEEN_ROWS

      dom.playAnimation($cell, dom.Animation.RowClear, 100, delay)
    }
  }
}
