import fs from 'fs';
import path from 'path';
import https from 'https';

const argv = process.argv.slice(2);
const getArg = (k, d) => {
  const f = argv.find((a) => a.startsWith(`--${k}=`));
  return f ? f.split('=')[1] : d;
};

const lang = getArg('lang', 'P');
const out = getArg('out', `midweek_${lang}.json`);
const base = getArg('base', 'https://source-materials.organized-app.com');
const pretty = getArg('pretty', 'false') === 'true';
const start = getArg('start');
const end = getArg('end');
const limitArg = getArg('limit');
const limit = Number.isFinite(parseInt(limitArg, 10)) ? parseInt(limitArg, 10) : undefined;

const mapMidweek = (item) => ({
  week_date: item.mwb_week_date || item.week_date,
  mwb_week_date: item.mwb_week_date,
  mwb_week_date_locale: item.mwb_week_date_locale,
  mwb_weekly_bible_reading: item.mwb_weekly_bible_reading,
  mwb_song_first: item.mwb_song_first,
  mwb_tgw_talk_title: item.mwb_tgw_talk_title,
  mwb_tgw_gems_title: item.mwb_tgw_gems_title,
  mwb_tgw_bread: item.mwb_tgw_bread,
  mwb_tgw_bread_title: item.mwb_tgw_bread_title,
  mwb_ayf_count: item.mwb_ayf_count,
  mwb_ayf_part1_type: item.mwb_ayf_part1_type,
  mwb_ayf_part1_time: item.mwb_ayf_part1_time,
  mwb_ayf_part1_title: item.mwb_ayf_part1_title,
  mwb_ayf_part1: item.mwb_ayf_part1,
  mwb_ayf_part2_type: item.mwb_ayf_part2_type,
  mwb_ayf_part2_time: item.mwb_ayf_part2_time,
  mwb_ayf_part2_title: item.mwb_ayf_part2_title,
  mwb_ayf_part2: item.mwb_ayf_part2,
  mwb_ayf_part3_type: item.mwb_ayf_part3_type,
  mwb_ayf_part3_time: item.mwb_ayf_part3_time,
  mwb_ayf_part3_title: item.mwb_ayf_part3_title,
  mwb_ayf_part3: item.mwb_ayf_part3,
  mwb_ayf_part4_type: item.mwb_ayf_part4_type,
  mwb_ayf_part4_time: item.mwb_ayf_part4_time,
  mwb_ayf_part4_title: item.mwb_ayf_part4_title,
  mwb_ayf_part4: item.mwb_ayf_part4,
  mwb_song_middle: item.mwb_song_middle,
  mwb_lc_count: item.mwb_lc_count,
  mwb_lc_part1_time: item.mwb_lc_part1_time,
  mwb_lc_part1_title: item.mwb_lc_part1_title,
  mwb_lc_part1_content: item.mwb_lc_part1_content,
  mwb_lc_part2_time: item.mwb_lc_part2_time,
  mwb_lc_part2_title: item.mwb_lc_part2_title,
  mwb_lc_part2_content: item.mwb_lc_part2_content,
  mwb_lc_cbs: item.mwb_lc_cbs,
  mwb_lc_cbs_title: item.mwb_lc_cbs_title,
  mwb_song_conclude: item.mwb_song_conclude,
});

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(new Error('Resposta não é JSON válido'));
          }
        } else {
          let msg = `Falha ao buscar fontes (${res.statusCode})`;
          try {
            const json = JSON.parse(data);
            if (json?.message) msg = json.message;
          } catch {}
          reject(new Error(msg));
        }
      });
    });
    req.on('error', (err) => reject(err));
  });
}

async function main() {
  const url = `${base}/api/${lang}`;
  const data = await fetchJSON(url);
  let midweek = (Array.isArray(data) ? data : [])
    .filter((item) => item && typeof item === 'object' && 'mwb_week_date_locale' in item)
    .map(mapMidweek);

  if (start) {
    midweek = midweek.filter((w) => typeof w.week_date === 'string' && w.week_date >= start);
  }

  if (end) {
    midweek = midweek.filter((w) => typeof w.week_date === 'string' && w.week_date <= end);
  }

  if (typeof limit === 'number' && limit > 0) {
    midweek = midweek.slice(0, limit);
  }
  const json = pretty ? JSON.stringify(midweek, null, 2) : JSON.stringify(midweek);
  const outPath = path.resolve(process.cwd(), out);
  fs.writeFileSync(outPath, json, 'utf-8');
  console.log(`OK: ${midweek.length} semanas salvas em ${outPath}`);
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
});

/*
Parâmetros do Script

- --lang=... código JW do idioma. Ex: T (Português), E (Inglês). Default: T .
- --out=... nome/ caminho do arquivo de saída. Ex: midweek_pt.json . Default: midweek_<lang>.json .
- --base=... URL base da API. Default: https://source-materials.organized-app.com .
- --pretty=true|false formata o JSON com indentação. Default: false .
- --start=yyyy/MM/dd filtra semanas com week_date a partir desta data (inclusive). Ex: --start=2024/11/01 .
- --end=yyyy/MM/dd filtra semanas até esta data (inclusive). Ex: --end=2025/03/31 .
- --limit=N limita a quantidade de semanas no resultado. Ex: --limit=12 .
Exemplos

- Últimos meses em PT com saída formatada: node scripts/jw-midweek-fetch.js --lang=P --pretty=true
- Intervalo específico: node scripts/jw-midweek-fetch.js --lang=P --start=2024/11/01 --end=2025/02/28 --out=midweek_range.json
- Apenas 10 semanas: node scripts/jw-midweek-fetch.js --lang=E --limit=10 --out=midweek_en_10.json
*/