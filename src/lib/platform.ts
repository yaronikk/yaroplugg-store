declare global { interface Window { Telegram?: { WebApp?: { initData?: string; [key: string]: any } } } }
export const telegramWebApp = typeof window === 'undefined' ? undefined : window.Telegram?.WebApp
export const isTelegram = Boolean(telegramWebApp?.initData)
