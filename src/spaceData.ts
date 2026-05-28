/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlanetData {
  id: string;
  name: string;
  englishName: string;
  color: string;
  emissiveColor?: string;
  radius: number;          // Visual radius in simplified mode
  distance: number;        // Visual distance in simplified mode
  speed: number;           // Orbital speed multiplier
  rotationSpeed: number;   // self-rotation speed multiplier
  hasRings: boolean;
  ringsColor?: string;
  ringInner?: number;
  ringOuter?: number;
  isMoon?: boolean;
  parentPlanetId?: string; // For Moon
  
  // Physical properties (Real parameters for info cards)
  realRadius: number;      // km
  realDistance: number;    // million km (semi-major axis)
  realPeriod: string;      // orbital period
  realRotation: string;    // rotation period
  temperature: string;     // temperature range
  moonsCount: number;      // number of discovered moons
  fact: string;            // Interesting fact
  mass: string;            // kg
}

export const planData: PlanetData[] = [
  {
    id: 'mercury',
    name: '水星',
    englishName: 'Mercury',
    color: '#8a8d8f',
    radius: 0.6,
    distance: 14,
    speed: 4.15,
    rotationSpeed: 0.004,
    hasRings: false,
    realRadius: 2439.7,
    realDistance: 57.9,
    realPeriod: '88 個地球日',
    realRotation: '58.6 個地球日',
    temperature: '-173°C 至 427°C',
    moonsCount: 0,
    fact: '水星是太陽系中最小的行星，也是最靠近太陽的行星。因為沒有大氣層保溫，它的晝夜溫差高達 600°C。',
    mass: '3.30 × 10²³'
  },
  {
    id: 'venus',
    name: '金星',
    englishName: 'Venus',
    color: '#e3bb76',
    radius: 1.1,
    distance: 18,
    speed: 1.62,
    rotationSpeed: -0.002, // Retrogade rotation
    hasRings: false,
    realRadius: 6051.8,
    realDistance: 108.2,
    realPeriod: '224.7 個地球日',
    realRotation: '243 個地球日 (逆向)',
    temperature: '約 462°C (恆定)',
    moonsCount: 0,
    fact: '金星擁有極其濃厚二氧化碳大氣層，產生了失控的溫室效應，使其成為太陽系中最熱的行星，連鉛都能融化。',
    mass: '4.87 × 10²⁴'
  },
  {
    id: 'earth',
    name: '地球',
    englishName: 'Earth',
    color: '#3d72ec',
    radius: 1.2,
    distance: 23,
    speed: 1.0,
    rotationSpeed: 0.02,
    hasRings: false,
    realRadius: 6371.0,
    realDistance: 149.6,
    realPeriod: '365.25 日',
    realRotation: '24 小時',
    temperature: '-89°C 至 58°C',
    moonsCount: 1,
    fact: '我們美麗的家園，是目前宇宙中已知唯一存在生命的天體。大氣層富含氧氣和氮氣，且表面 71% 被液態水覆蓋。',
    mass: '5.97 × 10²⁴'
  },
  {
    id: 'mars',
    name: '火星',
    englishName: 'Mars',
    color: '#c1440e',
    radius: 0.8,
    distance: 29,
    speed: 0.53,
    rotationSpeed: 0.018,
    hasRings: false,
    realRadius: 3389.5,
    realDistance: 227.9,
    realPeriod: '687 個地球日',
    realRotation: '24.6 小時',
    temperature: '-143°C 至 35°C',
    moonsCount: 2,
    fact: '火星被稱為「紅色星球」，其表面土壤富含氧化鐵。它擁有全太陽系最高的火山「奧林帕斯山」（高 21,900 公尺）。',
    mass: '6.42 × 10²³'
  },
  {
    id: 'jupiter',
    name: '木星',
    englishName: 'Jupiter',
    color: '#d8ca9d',
    radius: 2.6,
    distance: 36,
    speed: 0.084,
    rotationSpeed: 0.045, // very fast self-rotation
    hasRings: true,
    ringsColor: '#8a7e67',
    ringInner: 2.9,
    ringOuter: 3.4,
    realRadius: 69911,
    realDistance: 778.5,
    realPeriod: '11.86 年',
    realRotation: '9.9 小時',
    temperature: '約 -108°C',
    moonsCount: 95,
    fact: '木星是太陽系中體積與質量最大的行星，其質量是其他行星總和的兩倍以上。著名的大紅斑是一個持續了數百年的超巨大風暴。',
    mass: '1.90 × 10²⁷'
  },
  {
    id: 'saturn',
    name: '土星',
    englishName: 'Saturn',
    color: '#ead2ac',
    radius: 2.2,
    distance: 45,
    speed: 0.034,
    rotationSpeed: 0.04,
    hasRings: true,
    ringsColor: '#caa57b',
    ringInner: 2.6,
    ringOuter: 4.8,
    realRadius: 58232,
    realDistance: 1434.0,
    realPeriod: '29.45 年',
    realRotation: '10.7 小時',
    temperature: '約 -139°C',
    moonsCount: 146,
    fact: '土星以其極其壯麗的行星環系統聞名，主要由碎冰、岩石及太空塵埃組成。土星本身的密度極低，若放進水裡它能漂浮起來。',
    mass: '5.68 × 10²⁶'
  },
  {
    id: 'uranus',
    name: '天王星',
    englishName: 'Uranus',
    color: '#a3dbec',
    radius: 1.6,
    distance: 54,
    speed: 0.012,
    rotationSpeed: -0.03, // retrogade and tilted
    hasRings: true,
    ringsColor: '#6a8d9b',
    ringInner: 1.8,
    ringOuter: 2.1,
    realRadius: 25362,
    realDistance: 2871.0,
    realPeriod: '84 年',
    realRotation: '17.2 小時 (傾斜 98°)',
    temperature: '約 -197°C',
    moonsCount: 28,
    fact: '天王星是一顆冰巨星，最與眾不同的是它擁有高達 97.8° 的自轉軸傾角，基本上是「躺著」繞太陽公轉，可能曾遭受天體撞擊。',
    mass: '8.68 × 10²⁵'
  },
  {
    id: 'neptune',
    name: '海王星',
    englishName: 'Neptune',
    color: '#32527b',
    radius: 1.5,
    distance: 62,
    speed: 0.006,
    rotationSpeed: 0.035,
    hasRings: true,
    ringsColor: '#1c314f',
    ringInner: 1.7,
    ringOuter: 1.9,
    realRadius: 24622,
    realDistance: 4495.0,
    realPeriod: '164.8 年',
    realRotation: '16.1 小時',
    temperature: '約 -201°C',
    moonsCount: 16,
    fact: '海王星是距離太陽最遠的行星，大氣中含有微量甲烷使其呈現深邃的靛藍色。它的表面風速極快，最高可達每小時 2,100 公里。',
    mass: '1.02 × 10²⁶'
  },
  {
    id: 'pluto',
    name: '冥王星',
    englishName: 'Pluto',
    color: '#c4a482',
    radius: 0.5,
    distance: 69,
    speed: 0.004,
    rotationSpeed: -0.008,
    hasRings: false,
    realRadius: 1188.3,
    realDistance: 5906.0,
    realPeriod: '248 年',
    realRotation: '6.4 個地球日',
    temperature: '約 -225°C',
    moonsCount: 5,
    fact: '冥王星曾被列為第九大行星，於 2006 年被重新分類為「矮行星」。它擁有一個顯眼的心形冰原區域（湯博區），主要是固態氮組成。',
    mass: '1.30 × 10²2'
  }
];

export interface StarData {
  id: string;
  name: string;
  chineseName: string;
  constellation: string;
  x: number; // Normalized direction on sky sphere [-100 to 100]
  y: number;
  z: number;
  magnitude: number; // Apparent magnitude (-2 to 6, smaller means brighter)
  color: string;
  fact: string;
}

export const famousStars: StarData[] = [
  {
    id: 'polaris',
    name: 'Polaris',
    chineseName: '北極星 (勾陳一)',
    constellation: '小熊座 (Ursa Minor)',
    x: 0,
    y: 85,
    z: -30,
    magnitude: 1.97,
    color: '#fffaed',
    fact: '北極星精確對準地球的北天極，是夜空中最著名的航海導航星，看起來幾乎靜止不動。'
  },
  {
    id: 'sirius',
    name: 'Sirius',
    chineseName: '天狼星',
    constellation: '大犬座 (Canis Major)',
    x: 55,
    y: -40,
    z: 60,
    magnitude: -1.46,
    color: '#e3f1ff',
    fact: '天狼星是整個夜空中最亮、最耀眼的恆星，是一顆藍白色的主序星，距離太陽僅 8.6 光年。'
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    chineseName: '參宿四',
    constellation: '獵戶座 (Orion)',
    x: -30,
    y: 5,
    z: 80,
    magnitude: 0.42,
    color: '#ffd0b0',
    fact: '參宿四是一顆瀕臨超新星爆發的紅超巨星，如果把它放在太陽的位置，它的體積會吞沒木星軌道。'
  },
  {
    id: 'rigel',
    name: 'Rigel',
    chineseName: '參宿七',
    constellation: '獵戶座 (Orion)',
    x: -25,
    y: -15,
    z: 85,
    magnitude: 0.12,
    color: '#dbebff',
    fact: '參宿七是獵戶座中最亮的恆星，是一顆極其耀眼的藍超巨星。它的光度大約是太陽的 12 萬倍。'
  },
  {
    id: 'bellatrix',
    name: 'Bellatrix',
    chineseName: '參宿五',
    constellation: '獵戶座 (Orion)',
    x: -38,
    y: 8,
    z: 78,
    magnitude: 1.64,
    color: '#e5f0ff',
    fact: '獵戶座的「亞馬遜之星」，是一顆高溫的藍巨星。'
  },
  {
    id: 'alnilam',
    name: 'Alnilam',
    chineseName: '參宿二',
    constellation: '獵戶座 (Orion)',
    x: -31,
    y: -3,
    z: 81,
    magnitude: 1.69,
    color: '#e5f0ff',
    fact: '獵戶座「腰帶」三顆星中間的那一顆，是一顆明亮的藍超巨星。'
  },
  {
    id: 'alnitak',
    name: 'Alnitak',
    chineseName: '參宿一',
    constellation: '獵戶座 (Orion)',
    x: -29,
    y: -4,
    z: 81,
    magnitude: 1.72,
    color: '#e5f0ff',
    fact: '獵戶座「腰帶」東側的第一顆星，是一顆多重星系統。'
  },
  {
    id: 'mintaka',
    name: 'Mintaka',
    chineseName: '參宿三',
    constellation: '獵戶座 (Orion)',
    x: -33,
    y: -2,
    z: 81,
    magnitude: 2.23,
    color: '#e5f0ff',
    fact: '獵戶座「腰帶」最西側的那一顆星。'
  },
  {
    id: 'saiph',
    name: 'Saiph',
    chineseName: '參宿六',
    constellation: '獵戶座 (Orion)',
    x: -34,
    y: -16,
    z: 84,
    magnitude: 2.06,
    color: '#e5f0ff',
    fact: '獵戶座的東南角右足星，同樣是一顆藍超巨星。'
  },
  {
    id: 'dubhe',
    name: 'Dubhe',
    chineseName: '天樞 (北斗一)',
    constellation: '大熊座 (Ursa Major)',
    x: 40,
    y: 62,
    z: -40,
    magnitude: 1.8,
    color: '#ffeacc',
    fact: '北斗七星的第一顆星，與天璇星相連並延伸 5 倍距離即可找到北極星。'
  },
  {
    id: 'merak',
    name: 'Merak',
    chineseName: '天璇 (北斗二)',
    constellation: '大熊座 (Ursa Major)',
    x: 38,
    y: 56,
    z: -42,
    magnitude: 2.34,
    color: '#eef5ff',
    fact: '北斗七星的第二顆星，是尋找北極星的「指標星」之一。'
  },
  {
    id: 'phecda',
    name: 'Phecda',
    chineseName: '天璣 (北斗三)',
    constellation: '大熊座 (Ursa Major)',
    x: 44,
    y: 53,
    z: -45,
    magnitude: 2.4,
    color: '#eef5ff',
    fact: '北斗七星的主斗勺底部的另一端恆星。'
  },
  {
    id: 'megrez',
    name: 'Megrez',
    chineseName: '天權 (北斗四)',
    constellation: '大熊座 (Ursa Major)',
    x: 46,
    y: 55,
    z: -43,
    magnitude: 3.3,
    color: '#eef5ff',
    fact: '北斗七星中最暗的一顆星，連接斗勺和斗柄。'
  },
  {
    id: 'alioth',
    name: 'Alioth',
    chineseName: '玉衡 (北斗五)',
    constellation: '大熊座 (Ursa Major)',
    x: 52,
    y: 52,
    z: -40,
    magnitude: 1.76,
    color: '#eef5ff',
    fact: '大熊座中最明亮的恆星，位於斗柄與斗勺交界處。'
  },
  {
    id: 'mizar',
    name: 'Mizar',
    chineseName: '開陽 (北斗六)',
    constellation: '大熊座 (Ursa Major)',
    x: 56,
    y: 49,
    z: -38,
    magnitude: 2.23,
    color: '#eef5ff',
    fact: '著名的雙星系統，視力好的人可以在它旁邊看到伴星「輔（Alcor）」，古代軍隊曾以此測試士兵視力。'
  },
  {
    id: 'alkaid',
    name: 'Alkaid',
    chineseName: '搖光 (北斗七)',
    constellation: '大熊座 (Ursa Major)',
    x: 61,
    y: 44,
    z: -35,
    magnitude: 1.85,
    color: '#dbebff',
    fact: '北斗七星斗柄最末梢的恆星，是一顆高溫的藍白星。'
  },
  {
    id: 'vega',
    name: 'Vega',
    chineseName: '織女星',
    constellation: '天琴座 (Lyra)',
    x: -60,
    y: 38,
    z: -50,
    magnitude: 0.03,
    color: '#f0f6ff',
    fact: '夏季大三角的主星之一，全天第五亮星，因中國神話中牛郎織女的愛情故事而家喻戶曉。'
  },
  {
    id: 'altair',
    name: 'Altair',
    chineseName: '牛郎星 (河鼓二)',
    constellation: '天鷹座 (Aquila)',
    x: -50,
    y: 10,
    z: -65,
    magnitude: 0.76,
    color: '#f4f8ff',
    fact: '夏季大三角之一，與織女星隔著銀河相望。自轉速度極快（約9小時一週），導致它呈扁球狀。'
  },
  {
    id: 'deneb',
    name: 'Deneb',
    chineseName: '天津四',
    constellation: '天鵝座 (Cygnus)',
    x: -70,
    y: 45,
    z: -42,
    magnitude: 1.25,
    color: '#f0f5ff',
    fact: '天鵝座的尾巴，也是夏季大三角中最遠的一顆（約2600光年），是一顆罕見且光度極高的白超巨星。'
  },
  // Cassiopeia (A W-shaped northern constellation)
  {
    id: 'caph',
    name: 'Caph',
    chineseName: '王良一 (仙后座β)',
    constellation: '仙后座 (Cassiopeia)',
    x: -15,
    y: 70,
    z: -60,
    magnitude: 2.28,
    color: '#fffaee',
    fact: '仙后座 W 形結構中最西邊的亮星，是一顆巨星。'
  },
  {
    id: 'schedar',
    name: 'Schedar',
    chineseName: '王良四 (仙后座α)',
    constellation: '仙后座 (Cassiopeia)',
    x: -10,
    y: 72,
    z: -58,
    magnitude: 2.24,
    color: '#ffe9cb',
    fact: '仙后座 W 形結構中第二顆亮星，是一顆橙色巨星。'
  },
  {
    id: 'gam_cas',
    name: 'Cih',
    chineseName: '策 (仙后座γ)',
    constellation: '仙后座 (Cassiopeia)',
    x: -5,
    y: 74,
    z: -55,
    magnitude: 2.15,
    color: '#ddecff',
    fact: '仙后座 W 形結構中間的亮星，是一顆劇烈變化的爆發型變星。'
  },
  {
    id: 'ruchbah',
    name: 'Ruchbah',
    chineseName: '閣道三 (仙后座δ)',
    constellation: '仙后座 (Cassiopeia)',
    x: 0,
    y: 73,
    z: -53,
    magnitude: 2.68,
    color: '#edf4ff',
    fact: '仙后座 W 形結構右數第二顆星，是一顆聯星系統。'
  },
  {
    id: 'segin',
    name: 'Segin',
    chineseName: '閣道二 (仙后座ε)',
    constellation: '仙后座 (Cassiopeia)',
    x: 5,
    y: 72,
    z: -50,
    magnitude: 3.35,
    color: '#dde7ff',
    fact: '仙后座 W 形結構最東邊的星，是一顆明亮的藍白矮星。'
  }
];

// Lines linking the astronomical stars to display constellation charts!
export interface ConstellationLine {
  id1: string;
  id2: string;
}

export const constellationLines: { [key: string]: ConstellationLine[] } = {
  // Orion Lines
  'Orion': [
    { id1: 'betelgeuse', id2: 'bellatrix' },
    { id1: 'bellatrix', id2: 'mintaka' },
    { id1: 'mintaka', id2: 'alnilam' },
    { id1: 'alnilam', id2: 'alnitak' },
    { id1: 'alnitak', id2: 'saiph' },
    { id1: 'saiph', id2: 'rigel' },
    { id1: 'rigel', id2: 'mintaka' }, // Connect belt to foot
    { id1: 'betelgeuse', id2: 'alnitak' } // Connect belt to shoulder
  ],
  // Big Dipper (Ursa Major partial)
  'Ursa Major': [
    { id1: 'dubhe', id2: 'merak' },
    { id1: 'merak', id2: 'phecda' },
    { id1: 'phecda', id2: 'megrez' },
    { id1: 'megrez', id2: 'dubhe' },    // Loop of the dipper cup
    { id1: 'megrez', id2: 'alioth' },   // Dipper handle begins
    { id1: 'alioth', id2: 'mizar' },
    { id1: 'mizar', id2: 'alkaid' }
  ],
  // Summer Triangle (virtual reference lines)
  'Summer Triangle': [
    { id1: 'vega', id2: 'altair' },
    { id1: 'altair', id2: 'deneb' },
    { id1: 'deneb', id2: 'vega' }
  ],
  // Cassiopeia
  'Cassiopeia': [
    { id1: 'caph', id2: 'schedar' },
    { id1: 'schedar', id2: 'gam_cas' },
    { id1: 'gam_cas', id2: 'ruchbah' },
    { id1: 'ruchbah', id2: 'segin' }
  ]
};
