export type ShopLanguage = 'ru' | 'et' | 'en'

export type DeliveryMethod = {
  id: string
  ru: string
  et: string
  en: string
  priceEur: number
}

export type ShopConfig={name:string;managerTelegram:string;botUsername:string;miniAppShortName:string;siteUrl:string;instagram:string;vinted:string;email:string;replyTime:Record<ShopLanguage,string>;languages:ShopLanguage[];defaultLanguage:ShopLanguage|'';currency:string;delivery:DeliveryMethod[];seller:{legalName:string;regCode:string;address:string}}

// TODO: populate with verified store details. Checkout requires at least one delivery method.
export const SHOP:ShopConfig = {
  name: 'YAROPLUGG STORE',
  managerTelegram: '', // TODO: manager username without @
  botUsername: '', // TODO: bot username from BotFather
  miniAppShortName: '', // TODO: Mini App short name
  siteUrl: 'https://yaropluggstore.vercel.app',
  instagram: '', // TODO: Instagram URL
  vinted: '', // TODO: Vinted URL
  email: '', // TODO: contact email
  replyTime: {
    ru: 'Менеджер свяжется с вами по указанному контакту.',
    et: 'Haldur võtab teiega ühendust märgitud kontaktandmete kaudu.',
    en: 'The manager will contact you using the contact details provided.',
  },
  languages: ['ru', 'et', 'en'],
  defaultLanguage: 'en',
  currency: 'EUR',
  delivery: [{ id: 'manager', ru: 'Согласуется с менеджером', et: 'Lepitakse kokku halduriga', en: 'Arranged with the manager', priceEur: 0 }],
  seller: { legalName: '', regCode: '', address: '' }, // TODO: seller legal details
}
