export type ShopLanguage = 'ru' | 'et' | 'en'

export type ShopConfig={name:string;managerTelegram:string;botUsername:string;miniAppShortName:string;siteUrl:string;instagram:string;vinted:string;email:string;replyTime:Record<ShopLanguage,string>;languages:ShopLanguage[];defaultLanguage:ShopLanguage|'';currency:string;seller:{legalName:string;regCode:string;address:string}}

// TODO: populate with verified store details before a public release.
export const SHOP:ShopConfig = {
  name: 'YAROPLUGG STORE',
  managerTelegram: '', // TODO: manager username without @
  botUsername: '', // TODO: bot username from BotFather
  miniAppShortName: '', // TODO: Mini App short name
  siteUrl: 'https://yaropluggstore.vercel.app',
  instagram: import.meta.env.VITE_INSTAGRAM_URL || '', // optional Instagram profile URL
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
  seller: { legalName: '', regCode: '', address: '' }, // TODO: seller legal details
}
