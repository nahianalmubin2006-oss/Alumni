import fs from 'fs';

const userAgent = 'AlumniSphere/1.0 (contact@alumnisphere.ac.bd)';

const TARGET_PAGES = [
  "University_of_Rajshahi",
  "Jahangirnagar_University",
  "University_of_Chittagong",
  "Islamic_University,_Bangladesh",
  "Shahjalal_University_of_Science_and_Technology",
  "Independent_University,_Bangladesh",
  "Bangladesh_University_of_Business_and_Technology",
  "International_Islamic_University_Chittagong",
  "International_University_of_Business_Agriculture_and_Technology",
  "Rajshahi_University_of_Engineering_&_Technology",
  "Khulna_University_of_Engineering_&_Technology",
  "Jashore_University_of_Science_and_Technology",
  "Begum_Rokeya_University",
  "Bangabandhu_Sheikh_Mujibur_Rahman_Science_and_Technology_University",
  "University_of_Barisal",
  "Bangabandhu_Sheikh_Mujibur_Rahman_Maritime_University",
  "Bangabandhu_Sheikh_Mujibur_Rahman_Aviation_and_Aerospace_University",
  "Premier_University,_Chittagong",
  "Manarat_International_University",
  "City_University,_Bangladesh",
  "Prime_University",
  "Northern_University_Bangladesh",
  "Canadian_University_of_Bangladesh",
  "European_University_of_Bangladesh",
  "Central_Women's_University"
];

async function findProperLogo(title) {
  let allImages = [];
  let continueParam = '';
  while (true) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images${continueParam}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': userAgent } });
    const data = await res.json();
    const pages = Object.values(data.query?.pages || {});
    if (pages[0]?.images) {
      allImages.push(...pages[0].images.map(i => i.title));
    }
    if (data.continue?.imcontinue) {
      continueParam = `&imcontinue=${encodeURIComponent(data.continue.imcontinue)}`;
    } else {
      break;
    }
  }

  // Filter out non-logo files
  const candidates = allImages.filter(t => {
    const l = t.toLowerCase();
    return !l.includes('commons') && !l.includes('oojs') && !l.includes('edit-ltr') && (
      l.includes('logo') || l.includes('monogram') || l.includes('seal') || l.includes('crest') || l.includes('emblem')
    );
  });

  if (candidates.length === 0) return null;

  const chosen = candidates[0];
  const fileUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(chosen)}&prop=imageinfo&iiprop=url&format=json`;
  const fRes = await fetch(fileUrl, { headers: { 'User-Agent': userAgent } });
  const fData = await fRes.json();
  const fPages = Object.values(fData.query?.pages || {});
  const imgUrl = fPages[0]?.imageinfo?.[0]?.url;
  return { title, file: chosen, url: imgUrl };
}

async function main() {
  const map = {};
  for (const page of TARGET_PAGES) {
    const res = await findProperLogo(page);
    if (res && res.url) {
      console.log(`Matched ${page} -> ${res.file} -> ${res.url}`);
      map[page] = res.url;
    } else {
      console.log(`Could not find candidate for ${page}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  fs.writeFileSync('scripts/second_pass.json', JSON.stringify(map, null, 2));
}

main();
