import { ref, computed, watch, onUnmounted } from 'vue'

export function usePickTimer(totalSeconds: number, onExpire: () => void) {
  const secondsLeft = ref(totalSeconds)
  let interval: ReturnType<typeof setInterval> | null = null

  function reset() {
    secondsLeft.value = totalSeconds
    if (!interval) {
      interval = setInterval(() => {
        if (secondsLeft.value <= 0) {
          clearInterval(interval!)
          interval = null
          onExpire()
          return
        }
        secondsLeft.value--
      }, 1000)
    }
  }

  function stop() {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
  }

  onUnmounted(stop)

  const progress = computed(() => secondsLeft.value / totalSeconds)

  const urgency = computed<'normal' | 'warning' | 'critical'>(() => {
    if (secondsLeft.value <= 10) return 'critical'
    if (secondsLeft.value <= 30) return 'warning'
    return 'normal'
  })

  const circumference = 2 * Math.PI * 40

  const strokeDashoffset = computed(() => circumference * (1 - progress.value))

  return { secondsLeft, progress, urgency, circumference, strokeDashoffset, reset, stop }
}
