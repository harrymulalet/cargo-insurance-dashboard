// Fuzzy string matching function
export function fuzzyMatch(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  str1 = str1.toUpperCase().trim();
  str2 = str2.toUpperCase().trim();
  
  if (str1 === str2) return 100;
  
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;
  
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  return similarity;
}

// List of the 193 UN member states
export const standardCountries: string[] = [
  'AFGHANISTAN', 'ALBANIA', 'ALGERIA', 'ANDORRA', 'ANGOLA',
  'ANTIGUA AND BARBUDA', 'ARGENTINA', 'ARMENIA', 'AUSTRALIA', 'AUSTRIA',
  'AZERBAIJAN', 'BAHAMAS', 'BAHRAIN', 'BANGLADESH', 'BARBADOS',
  'BELARUS', 'BELGIUM', 'BELIZE', 'BENIN', 'BHUTAN',
  'BOLIVIA', 'BOSNIA AND HERZEGOVINA', 'BOTSWANA', 'BRAZIL', 'BRUNEI',
  'BULGARIA', 'BURKINA FASO', 'BURUNDI', 'CABO VERDE', 'CAMBODIA',
  'CAMEROON', 'CANADA', 'CENTRAL AFRICAN REPUBLIC', 'CHAD', 'CHILE',
  'CHINA', 'COLOMBIA', 'COMOROS', 'CONGO (DEMOCRATIC REPUBLIC OF THE)', 'CONGO (REPUBLIC OF THE)',
  'COSTA RICA', 'CÔTE D\'IVOIRE', 'CROATIA', 'CUBA', 'CYPRUS',
  'CZECH REPUBLIC', 'DENMARK', 'DJIBOUTI', 'DOMINICA', 'DOMINICAN REPUBLIC',
  'ECUADOR', 'EGYPT', 'EL SALVADOR', 'EQUATORIAL GUINEA', 'ERITREA',
  'ESTONIA', 'ESWATINI', 'ETHIOPIA', 'FIJI', 'FINLAND',
  'FRANCE', 'GABON', 'GAMBIA', 'GEORGIA', 'GERMANY',
  'GHANA', 'GREECE', 'GRENADA', 'GUATEMALA', 'GUINEA',
  'GUINEA-BISSAU', 'GUYANA', 'HAITI', 'HONDURAS', 'HUNGARY',
  'ICELAND', 'INDIA', 'INDONESIA', 'IRAN', 'IRAQ',
  'IRELAND', 'ISRAEL', 'ITALY', 'JAMAICA', 'JAPAN',
  'JORDAN', 'KAZAKHSTAN', 'KENYA', 'KIRIBATI', 'KUWAIT',
  'KYRGYZSTAN', 'LAOS', 'LATVIA', 'LEBANON', 'LESOTHO',
  'LIBERIA', 'LIBYA', 'LIECHTENSTEIN', 'LITHUANIA', 'LUXEMBOURG',
  'MADAGASCAR', 'MALAWI', 'MALAYSIA', 'MALDIVES', 'MALI',
  'MALTA', 'MARSHALL ISLANDS', 'MAURITANIA', 'MAURITIUS', 'MEXICO',
  'MICRONESIA', 'MOLDOVA', 'MONACO', 'MONGOLIA', 'MONTENEGRO',
  'MOROCCO', 'MOZAMBIQUE', 'MYANMAR', 'NAMIBIA', 'NAURU',
  'NEPAL', 'NETHERLANDS', 'NEW ZEALAND', 'NICARAGUA', 'NIGER',
  'NIGERIA', 'NORTH KOREA', 'NORTH MACEDONIA', 'NORWAY', 'OMAN',
  'PAKISTAN', 'PALAU', 'PANAMA', 'PAPUA NEW GUINEA', 'PARAGUAY',
  'PERU', 'PHILIPPINES', 'POLAND', 'PORTUGAL', 'QATAR',
  'ROMANIA', 'RUSSIA', 'RWANDA', 'SAINT KITTS AND NEVIS', 'SAINT LUCIA',
  'SAINT VINCENT AND THE GRENADINES', 'SAMOA', 'SAN MARINO', 'SAO TOME AND PRINCIPE', 'SAUDI ARABIA',
  'SENEGAL', 'SERBIA', 'SEYCHELLES', 'SIERRA LEONE', 'SINGAPORE',
  'SLOVAKIA', 'SLOVENIA', 'SOLOMON ISLANDS', 'SOMALIA', 'SOUTH AFRICA',
  'SOUTH SUDAN', 'SOUTH KOREA', 'SPAIN', 'SRI LANKA', 'SUDAN',
  'SURINAME', 'SWEDEN', 'SWITZERLAND', 'SYRIA', 'TAJIKISTAN',
  'TANZANIA', 'THAILAND', 'TIMOR-LESTE', 'TOGO', 'TONGA',
  'TRINIDAD AND TOBAGO', 'TUNISIA', 'TURKEY', 'TURKMENISTAN', 'TUVALU',
  'UGANDA', 'UKRAINE', 'UNITED ARAB EMIRATES', 'UNITED KINGDOM', 'UNITED STATES',
  'URUGUAY', 'UZBEKISTAN', 'VANUATU', 'VENEZUELA', 'VIETNAM',
  'YEMEN', 'ZAMBIA', 'ZIMBABWE'
];

export const countryToRegion: Record<string, string> = {
  'AFGHANISTAN': 'Asia/Pacific', 'ALBANIA': 'Europe', 'ALGERIA': 'Middle East & Africa', 'ANDORRA': 'Europe', 'ANGOLA': 'Middle East & Africa',
  'ANTIGUA AND BARBUDA': 'Latin America', 'ARGENTINA': 'Latin America', 'ARMENIA': 'Europe', 'AUSTRALIA': 'Asia/Pacific', 'AUSTRIA': 'Europe',
  'AZERBAIJAN': 'Europe', 'BAHAMAS': 'Latin America', 'BAHRAIN': 'Middle East & Africa', 'BANGLADESH': 'Asia/Pacific', 'BARBADOS': 'Latin America',
  'BELARUS': 'Europe', 'BELGIUM': 'Europe', 'BELIZE': 'Latin America', 'BENIN': 'Middle East & Africa', 'BHUTAN': 'Asia/Pacific',
  'BOLIVIA': 'Latin America', 'BOSNIA AND HERZEGOVINA': 'Europe', 'BOTSWANA': 'Middle East & Africa', 'BRAZIL': 'Latin America', 'BRUNEI': 'Asia/Pacific',
  'BULGARIA': 'Europe', 'BURKINA FASO': 'Middle East & Africa', 'BURUNDI': 'Middle East & Africa', 'CABO VERDE': 'Middle East & Africa', 'CAMBODIA': 'Asia/Pacific',
  'CAMEROON': 'Middle East & Africa', 'CANADA': 'North America', 'CENTRAL AFRICAN REPUBLIC': 'Middle East & Africa', 'CHAD': 'Middle East & Africa', 'CHILE': 'Latin America',
  'CHINA': 'Asia/Pacific', 'COLOMBIA': 'Latin America', 'COMOROS': 'Middle East & Africa', 'CONGO (DEMOCRATIC REPUBLIC OF THE)': 'Middle East & Africa', 'CONGO (REPUBLIC OF THE)': 'Middle East & Africa',
  'COSTA RICA': 'Latin America', 'CÔTE D\'IVOIRE': 'Middle East & Africa', 'CROATIA': 'Europe', 'CUBA': 'Latin America', 'CYPRUS': 'Europe',
  'CZECH REPUBLIC': 'Europe', 'DENMARK': 'Europe', 'DJIBOUTI': 'Middle East & Africa', 'DOMINICA': 'Latin America', 'DOMINICAN REPUBLIC': 'Latin America',
  'ECUADOR': 'Latin America', 'EGYPT': 'Middle East & Africa', 'EL SALVADOR': 'Latin America', 'EQUATORIAL GUINEA': 'Middle East & Africa', 'ERITREA': 'Middle East & Africa',
  'ESTONIA': 'Europe', 'ESWATINI': 'Middle East & Africa', 'ETHIOPIA': 'Middle East & Africa', 'FIJI': 'Asia/Pacific', 'FINLAND': 'Europe',
  'FRANCE': 'Europe', 'GABON': 'Middle East & Africa', 'GAMBIA': 'Middle East & Africa', 'GEORGIA': 'Europe', 'GERMANY': 'Europe',
  'GHANA': 'Middle East & Africa', 'GREECE': 'Europe', 'GRENADA': 'Latin America', 'GUATEMALA': 'Latin America', 'GUINEA': 'Middle East & Africa',
  'GUINEA-BISSAU': 'Middle East & Africa', 'GUYANA': 'Latin America', 'HAITI': 'Latin America', 'HONDURAS': 'Latin America', 'HUNGARY': 'Europe',
  'ICELAND': 'Europe', 'INDIA': 'Asia/Pacific', 'INDONESIA': 'Asia/Pacific', 'IRAN': 'Middle East & Africa', 'IRAQ': 'Middle East & Africa',
  'IRELAND': 'Europe', 'ISRAEL': 'Middle East & Africa', 'ITALY': 'Europe', 'JAMAICA': 'Latin America', 'JAPAN': 'Asia/Pacific',
  'JORDAN': 'Middle East & Africa', 'KAZAKHSTAN': 'Asia/Pacific', 'KENYA': 'Middle East & Africa', 'KIRIBATI': 'Asia/Pacific', 'KUWAIT': 'Middle East & Africa',
  'KYRGYZSTAN': 'Asia/Pacific', 'LAOS': 'Asia/Pacific', 'LATVIA': 'Europe', 'LEBANON': 'Middle East & Africa', 'LESOTHO': 'Middle East & Africa',
  'LIBERIA': 'Middle East & Africa', 'LIBYA': 'Middle East & Africa', 'LIECHTENSTEIN': 'Europe', 'LITHUANIA': 'Europe', 'LUXEMBOURG': 'Europe',
  'MADAGASCAR': 'Middle East & Africa', 'MALAWI': 'Middle East & Africa', 'MALAYSIA': 'Asia/Pacific', 'MALDIVES': 'Asia/Pacific', 'MALI': 'Middle East & Africa',
  'MALTA': 'Europe', 'MARSHALL ISLANDS': 'Asia/Pacific', 'MAURITANIA': 'Middle East & Africa', 'MAURITIUS': 'Middle East & Africa', 'MEXICO': 'Latin America',
  'MICRONESIA': 'Asia/Pacific', 'MOLDOVA': 'Europe', 'MONACO': 'Europe', 'MONGOLIA': 'Asia/Pacific', 'MONTENEGRO': 'Europe',
  'MOROCCO': 'Middle East & Africa', 'MOZAMBIQUE': 'Middle East & Africa', 'MYANMAR': 'Asia/Pacific', 'NAMIBIA': 'Middle East & Africa', 'NAURU': 'Asia/Pacific',
  'NEPAL': 'Asia/Pacific', 'NETHERLANDS': 'Europe', 'NEW ZEALAND': 'Asia/Pacific', 'NICARAGUA': 'Latin America', 'NIGER': 'Middle East & Africa',
  'NIGERIA': 'Middle East & Africa', 'NORTH KOREA': 'Asia/Pacific', 'NORTH MACEDONIA': 'Europe', 'NORWAY': 'Europe', 'OMAN': 'Middle East & Africa',
  'PAKISTAN': 'Asia/Pacific', 'PALAU': 'Asia/Pacific', 'PANAMA': 'Latin America', 'PAPUA NEW GUINEA': 'Asia/Pacific', 'PARAGUAY': 'Latin America',
  'PERU': 'Latin America', 'PHILIPPINES': 'Asia/Pacific', 'POLAND': 'Europe', 'PORTUGAL': 'Europe', 'QATAR': 'Middle East & Africa',
  'ROMANIA': 'Europe', 'RUSSIA': 'Europe', 'RWANDA': 'Middle East & Africa', 'SAINT KITTS AND NEVIS': 'Latin America', 'SAINT LUCIA': 'Latin America',
  'SAINT VINCENT AND THE GRENADINES': 'Latin America', 'SAMOA': 'Asia/Pacific', 'SAN MARINO': 'Europe', 'SAO TOME AND PRINCIPE': 'Middle East & Africa', 'SAUDI ARABIA': 'Middle East & Africa',
  'SENEGAL': 'Middle East & Africa', 'SERBIA': 'Europe', 'SEYCHELLES': 'Middle East & Africa', 'SIERRA LEONE': 'Middle East & Africa', 'SINGAPORE': 'Asia/Pacific',
  'SLOVAKIA': 'Europe', 'SLOVENIA': 'Europe', 'SOLOMON ISLANDS': 'Asia/Pacific', 'SOMALIA': 'Middle East & Africa', 'SOUTH AFRICA': 'Middle East & Africa',
  'SOUTH SUDAN': 'Middle East & Africa', 'SOUTH KOREA': 'Asia/Pacific', 'SPAIN': 'Europe', 'SRI LANKA': 'Asia/Pacific', 'SUDAN': 'Middle East & Africa',
  'SURINAME': 'Latin America', 'SWEDEN': 'Europe', 'SWITZERLAND': 'Europe', 'SYRIA': 'Middle East & Africa', 'TAJIKISTAN': 'Asia/Pacific',
  'TANZANIA': 'Middle East & Africa', 'THAILAND': 'Asia/Pacific', 'TIMOR-LESTE': 'Asia/Pacific', 'TOGO': 'Middle East & Africa', 'TONGA': 'Asia/Pacific',
  'TRINIDAD AND TOBAGO': 'Latin America', 'TUNISIA': 'Middle East & Africa', 'TURKEY': 'Europe', 'TURKMENISTAN': 'Asia/Pacific', 'TUVALU': 'Asia/Pacific',
  'UGANDA': 'Middle East & Africa', 'UKRAINE': 'Europe', 'UNITED ARAB EMIRATES': 'Middle East & Africa', 'UNITED KINGDOM': 'Europe', 'UNITED STATES': 'North America',
  'URUGUAY': 'Latin America', 'UZBEKISTAN': 'Asia/Pacific', 'VANUATU': 'Asia/Pacific', 'VENEZUELA': 'Latin America', 'VIETNAM': 'Asia/Pacific',
  'YEMEN': 'Middle East & Africa', 'ZAMBIA': 'Middle East & Africa', 'ZIMBABWE': 'Middle East & Africa'
};

export const predefinedCountryMappings: Record<string, string> = {
  'BRUNEI DARUSSALAM': 'BRUNEI', 'HOLLAND': 'NETHERLANDS', 'TANZANIA, UNITED REPUBLIC OF': 'TANZANIA',
  'UNITED STATES MINOR OUTLYING ISLANDS': 'UNITED STATES', 'NORTHERN IRELAND': 'UNITED KINGDOM', 'ENGLAND': 'UNITED KINGDOM',
  'VENEZUELA (BOLIVARIAN REPUBLIC OF)': 'VENEZUELA', 'SINT MAARTEN (DUTCH PART)': 'NETHERLANDS', 'ARUBA': 'NETHERLANDS',
  'FALKLAND ISLANDS (MALVINAS)': 'UNITED KINGDOM', 'KOSOVO': 'SERBIA', 'CZECHIA': 'CZECH REPUBLIC', 'HONG KONG': 'CHINA',
  'BOLIVIA (PLURINATIONAL STATE OF)': 'BOLIVIA', 'GREAT BRITAIN': 'UNITED KINGDOM', 'GUADELOUPE': 'FRANCE', 'MACAO': 'CHINA',
  'MACAU': 'CHINA', 'NETHERLANDS (KINGDOM OF THE)': 'NETHERLANDS', 'TÜRKIYE': 'TURKEY', 'TURKIYE': 'TURKEY',
  'UNITED STATES OF AMERICA': 'UNITED STATES', 'TAIWAN, PROVINCE OF CHINA': 'CHINA', 'TAIWAN': 'CHINA', 'RÉUNION': 'FRANCE',
  'REUNION': 'FRANCE', 'PUERTO RICO': 'UNITED STATES', 'SAINT MARTIN (FRENCH PART)': 'FRANCE', 'BERMUDA': 'UNITED KINGDOM',
  'CONGO': 'CONGO (REPUBLIC OF THE)', 'MOLDOVA, REPUBLIC OF': 'MOLDOVA', 'FRENCH POLYNESIA': 'FRANCE', 'KOREA': 'SOUTH KOREA',
  'SLOVAK REPUBLIC': 'SLOVAKIA', 'U.ARAB.EMIRATES': 'UNITED ARAB EMIRATES', 'USA': 'UNITED STATES', 'US': 'UNITED STATES',
  'UK': 'UNITED KINGDOM', 'BRITAIN': 'UNITED KINGDOM', 'KOREA, SOUTH': 'SOUTH KOREA', 'KOREA, NORTH': 'NORTH KOREA',
  'KOREA, REPUBLIC OF': 'SOUTH KOREA', 'KOREA, DEMOCRATIC PEOPLE\'S REPUBLIC OF': 'NORTH KOREA', 'VIET NAM': 'VIETNAM',
  'RUSSIAN FEDERATION': 'RUSSIA', 'IRAN, ISLAMIC REPUBLIC OF': 'IRAN', 'SYRIAN ARAB REPUBLIC': 'SYRIA',
  'LAO PEOPLE\'S DEMOCRATIC REPUBLIC': 'LAOS', 'MACEDONIA': 'NORTH MACEDONIA', 'IVORY COAST': 'CÔTE D\'IVOIRE',
  'EAST TIMOR': 'TIMOR-LESTE', 'CAPE VERDE': 'CABO VERDE', 'SWAZILAND': 'ESWATINI', 'BURMA': 'MYANMAR',
  'DEMOCRATIC REPUBLIC OF CONGO': 'CONGO (DEMOCRATIC REPUBLIC OF THE)', 'DRC': 'CONGO (DEMOCRATIC REPUBLIC OF THE)',
  'REPUBLIC OF CONGO': 'CONGO (REPUBLIC OF THE)', 'NORTH SUDAN': 'SUDAN', 'REPUBLIC OF KOREA': 'SOUTH KOREA',
  'BOSNIA': 'BOSNIA AND HERZEGOVINA', 'BOSNIA HERZEGOVINA': 'BOSNIA AND HERZEGOVINA', 'SAINT KITTS': 'SAINT KITTS AND NEVIS',
  'ST KITTS AND NEVIS': 'SAINT KITTS AND NEVIS', 'ST LUCIA': 'SAINT LUCIA', 'SAINT VINCENT': 'SAINT VINCENT AND THE GRENADINES',
  'ST VINCENT AND THE GRENADINES': 'SAINT VINCENT AND THE GRENADINES', 'SAO TOME': 'SAO TOME AND PRINCIPE',
  'TRINIDAD': 'TRINIDAD AND TOBAGO', 'ANTIGUA': 'ANTIGUA AND BARBUDA', 'FEDERATED STATES OF MICRONESIA': 'MICRONESIA',
};
