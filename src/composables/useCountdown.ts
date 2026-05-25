import { ref, computed, onUnmounted } from 'vue'

export function useCountdown(targetDate: () => string | null) {
  const now = ref(Date.now())
  const interval = setInterval(() => { now.value = Date.now() }, 1000)
  onUnmounted(() => clearInterval(interval))

  const msRemaining = computed(() => {
    const target = targetDate()
    if (!target) return null
    return new Date(target).getTime() - now.value
  })

  const isExpired = computed(() => msRemaining.value !== null && msRemaining.value <= 0)

  const formatted = computed(() => {
    const ms = msRemaining.value
    if (ms === null) return null
    if (ms <= 0) return 'Locked'
    const totalSeconds = Math.floor(ms / 1000)
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  })

  const urgency = computed<'normal' | 'warning' | 'critical'>(() => {
    const ms = msRemaining.value
    if (ms === null || ms <= 0) return 'critical'
    if (ms < 3600_000) return 'critical'
    if (ms < 86400_000) return 'warning'
    return 'normal'
  })

  return { msRemaining, isExpired, formatted, urgency }
}
