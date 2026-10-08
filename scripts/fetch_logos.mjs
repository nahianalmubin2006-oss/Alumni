import fs from 'fs';
import path from 'path';

const userAgent = 'AlumniSphere/1.0 (contact@alumnisphere.ac.bd)';

// Known Wikipedia article titles for universities
const UNI_WIKI_MAP = {
  "University of Dhaka": "University_of_Dhaka",
  "Bangladesh University of Engineering & Technology": "Bangladesh_University_of_Engineering_and_Technology",
  "University of Rajshahi": "University_of_Rajshahi",
  "Bangladesh Agricultural University": "Bangladesh_Agricultural_University",
  "University of Chittagong": "University_of_Chittagong",
  "Jahangirnagar University": "Jahangirnagar_University",
  "Islamic University, Bangladesh": "Islamic_University,_Bangladesh",
  "Shahjalal University of Science & Technology": "Shahjalal_University_of_Science_and_Technology",
  "Khulna University": "Khulna_University",
  "National University": "National_University,_Bangladesh",
  "Bangladesh Open University": "Bangladesh_Open_University",
  "Hajee Mohammad Danesh Science & Technology University": "Hajee_Mohammad_Danesh_Science_&_Technology_University",
  "Mawlana Bhashani Science & Technology University": "Mawlana_Bhashani_Science_and_Technology_University",
  "Patuakhali Science And Technology University": "Patuakhali_Science_and_Technology_University",
  "Sher-e-Bangla Agricultural University": "Sher-e-Bangla_Agricultural_University",
  "Chittagong University of Engineering & Technology": "Chittagong_University_of_Engineering_&_Technology",
  "Rajshahi University of Engineering & Technology": "Rajshahi_University_of_Engineering_&_Technology",
  "Khulna University of Engineering & Technology": "Khulna_University_of_Engineering_&_Technology",
  "Dhaka University of Engineering & Technology": "Dhaka_University_of_Engineering_&_Technology",
  "Noakhali Science & Technology University": "Noakhali_Science_and_Technology_University",
  "Jagannath University": "Jagannath_University",
  "Comilla University": "Comilla_University",
  "Jatiya Kabi Kazi Nazrul Islam University": "Jatiya_Kabi_Kazi_Nazrul_Islam_University",
  "Chittagong Veterinary and Animal Sciences University": "Chittagong_Veterinary_and_Animal_Sciences_University",
  "Sylhet Agricultural University": "Sylhet_Agricultural_University",
  "Jashore University of Science & Technology": "Jashore_University_of_Science_and_Technology",
  "Pabna University of Science and Technology": "Pabna_University_of_Science_and_Technology",
  "Begum Rokeya University, Rangpur": "Begum_Rokeya_University",
  "Bangladesh University of Professionals": "Bangladesh_University_of_Professionals",
  "Gopalganj Science & Technology University": "Bangabandhu_Sheikh_Mujibur_Rahman_Science_and_Technology_University",
  "Bangladesh University of Textiles": "Bangladesh_University_of_Textiles",
  "University of Barishal": "University_of_Barisal",
  "Rangamati Science and Technology University": "Rangamati_Science_and_Technology_University",
  "Bangladesh Maritime University": "Bangabandhu_Sheikh_Mujibur_Rahman_Maritime_University",
  "Islamic Arabic University": "Islamic_Arabic_University",
  "Rabindra University, Bangladesh": "Rabindra_University,_Bangladesh",
  "Aviation And Aerospace University, Bangladesh": "Bangabandhu_Sheikh_Mujibur_Rahman_Aviation_and_Aerospace_University",
  // Private
  "North South University": "North_South_University",
  "BRAC University": "BRAC_University",
  "Independent University, Bangladesh": "Independent_University,_Bangladesh",
  "Ahsanullah University of Science and Technology": "Ahsanullah_University_of_Science_and_Technology",
  "American International University-Bangladesh": "American_International_University-Bangladesh",
  "East West University": "East_West_University",
  "United International University": "United_International_University",
  "Daffodil International University": "Daffodil_International_University",
  "University of Asia Pacific": "University_of_Asia_Pacific",
  "University of Liberal Arts Bangladesh": "University_of_Liberal_Arts_Bangladesh",
  "Bangladesh University of Business & Technology": "Bangladesh_University_of_Business_and_Technology",
  "Stamford University Bangladesh": "Stamford_University_Bangladesh",
  "State University of Bangladesh": "State_University_of_Bangladesh",
  "Green University of Bangladesh": "Green_University_of_Bangladesh",
  "Southeast University": "Southeast_University_(Bangladesh)",
  "Notre Dame University Bangladesh": "Notre_Dame_University_Bangladesh",
  "Premier University": "Premier_University,_Chittagong",
  "International Islamic University Chittagong": "International_Islamic_University_Chittagong",
  "BGMEA University of Fashion & Technology": "BGMEA_University_of_Fashion_&_Technology",
  "Leading University": "Leading_University",
  "Varendra University": "Varendra_University",
  "Port City International University": "Port_City_International_University",
  "Uttara University": "Uttara_University",
  "Eastern University": "Eastern_University_(Bangladesh)",
  "Gono Bishwabidyalay": "Gono_Bishwabidyalay",
  "Asian University of Bangladesh": "Asian_University_of_Bangladesh",
  "Dhaka International University": "Dhaka_International_University",
  "Manarat International University": "Manarat_International_University",
  "Metropolitan University": "Metropolitan_University,_Sylhet",
  "City University": "City_University,_Bangladesh",
  "Prime University": "Prime_University",
  "Northern University Bangladesh": "Northern_University_Bangladesh",
  "Canadian University of Bangladesh": "Canadian_University_of_Bangladesh",
  "European University of Bangladesh": "European_University_of_Bangladesh",
  "Central Women's University": "Central_Women's_University",
  "International University of Business Agriculture & Technology": "International_University_of_Business_Agriculture_and_Technology",
  // International
  "Islamic University of Technology (IUT), Gazipur": "Islamic_University_of_Technology",
  "Asian University for Women": "Asian_University_for_Women"
};

async function getWikiLogo(wikiTitle) {
  try {
    // 1. Get images listed on the page
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=images&format=json`;
    const res = await fetch(imgUrl, { headers: { 'User-Agent': userAgent } });
    const data = await res.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || !page.images) return null;

    // Find image that looks like a logo or monogram or seal
    const logoImg = page.images.find(img => {
      const title = img.title.toLowerCase();
      return (
        (title.includes('logo') || title.includes('monogram') || title.includes('seal') || title.includes('crest') || title.includes('emblem')) &&
        !title.includes('commons') && !title.includes('building') && !title.includes('gate') && !title.includes('wordmark')
      );
    }) || page.images.find(img => {
      const title = img.title.toLowerCase();
      return title.includes('logo') || title.includes('monogram');
    });

    if (!logoImg) return null;

    // 2. Get the actual download URL of that file
    const fileInfoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(logoImg.title)}&prop=imageinfo&iiprop=url&format=json`;
    const fRes = await fetch(fileInfoUrl, { headers: { 'User-Agent': userAgent } });
    const fData = await fRes.json();
    const fPages = fData.query?.pages || {};
    const fPage = Object.values(fPages)[0];
    const imageInfo = fPage?.imageinfo?.[0];
    return imageInfo ? { fileTitle: logoImg.title, url: imageInfo.url } : null;
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log('Fetching logos from Wikipedia...');
  const results = {};
  for (const [name, wikiTitle] of Object.entries(UNI_WIKI_MAP)) {
    const info = await getWikiLogo(wikiTitle);
    if (info && info.url) {
      console.log(`Found logo for ${name}: ${info.url}`);
      results[name] = info.url;
    } else {
      console.log(`No direct logo for ${name}`);
    }
    // Polite delay
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync('scripts/logo_urls.json', JSON.stringify(results, null, 2));
  console.log('Saved logo_urls.json. Total found:', Object.keys(results).length);
}

run();
