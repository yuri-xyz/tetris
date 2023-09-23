import {randomInt, randomSign} from './util'

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
  directionDegrees?: number
}

const particles: Particle[] = []

export function initializeParticles() {
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

export function spawnParticles(options: ParticleSpawnOptions) {
  const randomVelocityComponent = () => Math.random() * options.velocityFactor * randomSign()
  const count = randomInt(options.countMin, options.countMax)

  const convertDegreesToVelocity = (degrees: number) => {
    const radians = degrees * Math.PI / 180

    return {
      x: Math.cos(radians),
      y: Math.sin(radians),
    }
  }

  for (let i = 0; i < count; i++) {
    const $element = document.createElement("div")
    const radius = randomInt(options.radiusMin, options.radiusMax)
    const blurPercentage = (radius - options.radiusMin) / (options.radiusMax - options.radiusMin)

    $element.style.width = `${radius}px`
    $element.style.height = `${radius}px`
    $element.style.filter = `blur(${options.blurMin + blurPercentage * (options.blurMax - options.blurMin)}px)`

    for (const className of options.classNames)
      $element.classList.add(className)

    const lifetime = randomInt(options.lifetimeMin, options.lifetimeMax)
    const x = options.position?.x ?? randomInt(0, window.innerWidth)
    const y = options.position?.y ?? randomInt(0, window.innerHeight)

    const velocity = options.directionDegrees === undefined
      ? {x: randomVelocityComponent(), y: randomVelocityComponent()}
      // OPTIMIZE: The direction velocity only needs to be calculated once, if the direction degrees is provided.
      : convertDegreesToVelocity(options.directionDegrees)

    particles.push({
      position: {x, y},
      velocity,
      radius: 0,
      color: "#fff",
      maxLifetime: lifetime,
      lifetime,
      $element,
      opacityMin: options.opacityMin,
      opacityMax: options.opacityMax,
    })

    document.body.appendChild($element)
  }
}
