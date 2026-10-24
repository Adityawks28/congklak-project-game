// What the characters say. Rules match utils/gameLogic.ts. History uses only
// the facts checked for the spec (2026-10-24), each traceable to SOURCES.

export interface Panel {
  text: string;
}

export const RULES: Panel[] = [
  { text: 'Each side has 7 small holes and one big store. Yours are the row nearest you and the store on your left; the line under the board says which. Every small hole starts with 7 marbles, 98 in all.' },
  { text: 'On your turn, pick one of your holes and scoop up all its marbles. Drop them one at a time into the next holes, going clockwise. Drop one in your own store as you pass, but skip your rival’s store.' },
  { text: 'Where your last marble lands decides what happens. In your own store: take another turn. In a hole that already has marbles: scoop them all up and keep sowing from there.' },
  { text: 'In an empty hole on your side: if the hole across has marbles, you capture them and your last marble into your store. TEMBAK! If the hole across is empty, or you land in an empty hole on the other side, your turn ends.' },
  { text: 'The game ends as soon as one side has no marbles left. Each player then adds the marbles still on their side to their own store. Most marbles wins.' },
];

export const TRADITIONAL_RULES: Panel[] = [];

export const HISTORY: Panel[] = [
  { text: 'Congklak belongs to the mancala family: “sowing” games where seeds are moved around rows of holes, a few at a time.' },
  { text: 'It goes by many names: dakon or dhakon in Java, dentuman lamban in Lampung, and makaotan, maggaleceng, aggalacang or nogarata in Sulawesi. Neighbours play it too, as congkak in Malaysia and sungka in the Philippines.' },
  { text: 'Boards are carved from wood, long and boat-shaped. The small holes are called sawah (fields) and the big end holes lumbung or gunung (granaries). Players used cowrie shells, pebbles or tamarind seeds: 98 for a board with 7 holes a side.' },
  { text: 'In Javanese tradition, dakon was especially popular among girls, including the princesses of the royal courts.' },
  { text: 'How mancala reached Southeast Asia is unknown. One idea is Austronesian trade routes with South Asia; a popular account credits Arab traders. Indonesia has more variants than anywhere else in the region.' },
];

export const SOURCES: Array<{ label: string; url: string }> = [
  { label: 'Museum Sonobudoyo, Yogyakarta: Congklak and dakon', url: 'https://sonobudoyo.jogjaprov.go.id/en/tulisan/read/congklak-dan-dakon-jejak-permainan-kuno-yang-tetap-hidup-hingga-kini' },
  { label: 'Wikipedia: Southeast Asian mancala', url: 'https://en.wikipedia.org/wiki/Southeast_Asian_mancala' },
  { label: 'RRI: the popular account', url: 'https://rri.co.id/en/art-and-culture/1777942/faq.html' },
];
